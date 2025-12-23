<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentActivity;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetIOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Pdf\Mpdf as SpreadsheetPdfWriter;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;
use thiagoalessio\TesseractOCR\TesseractOCR;

class DocumentController extends Controller
{
    // ======================================================
    // UPLOAD DOCUMENT (with OCR)
    // ======================================================
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'recipients' => 'required|array',
            'recipients.*' => 'exists:users,id',
        ]);

        $file = $request->file('file');
        $path = $file->store('document', 'public');

        // ===================================
        // OCR EXTRACTION
        // ===================================
        $ocrText = null;
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif'])) {
                // OCR for images
                $ocrText = (new TesseractOCR($file->getRealPath()))->run();
            } elseif ($extension === 'pdf') {
                // Convert PDF pages to images using Imagick
                if (class_exists('Imagick')) {
                    $imagick = new \Imagick();
                    $imagick->setResolution(300, 300);
                    $imagick->readImage($file->getRealPath());
                    $ocrTextArr = [];

                    foreach ($imagick as $i => $page) {
                        $page->setImageFormat('png');
                        $tempPath = storage_path('app/public/temp_ocr_page_' . $i . '.png');
                        $page->writeImage($tempPath);
                        $ocrTextArr[] = (new TesseractOCR($tempPath))->run();
                        unlink($tempPath);
                    }

                    $ocrText = implode("\n", $ocrTextArr);
                    $imagick->clear();
                    $imagick->destroy();
                }
            }
        } catch (\Exception $e) {
            \Log::error('OCR failed: ' . $e->getMessage());
            $ocrText = null;
        }

        // ===================================
        // CREATE DOCUMENT
        // ===================================
        $document = Document::create([
            'title' => $request->title,
            'document_id' => Document::generateDocumentId(),
            'file_path' => $path,
            'file_type' => $extension,
            'file_size' => $file->getSize(),
            'description' => $request->description,
            'uploaded_by' => $request->user()->id,
            'paper_id' => Document::generatePaperId(),
            'ocr_text' => $ocrText,
        ]);

        // ===================================
        // QR CODE GENERATION
        // ===================================
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $documentUrl = $frontendUrl . '/document/' . $document->id;

        $qrCode = QrCode::format('svg')->size(300)->errorCorrection('H')->generate($documentUrl);
        $qrPath = 'qrcodes/' . $document->paper_id . '.svg';
        Storage::disk('public')->put($qrPath, $qrCode);

        $document->qr_code_path = $qrPath;
        $document->save();

        // ===================================
        // ATTACH RECIPIENTS & NOTIFICATIONS
        // ===================================
        $document->recipients()->attach($request->recipients);

        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $request->user()->id,
            'activity_type' => 'uploaded',
            'details' => 'Document uploaded',
        ]);

        foreach ($request->recipients as $recipientId) {
            Notification::create([
                'user_id' => $recipientId,
                'title' => 'New Document Received',
                'message' => "You have received a new document: {$document->title}",
                'type' => 'document',
                'data' => json_encode(['document_id' => $document->id]),
            ]);
        }

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => $document->load('recipients', 'uploader')
        ], 201);
    }

    // ======================================================
    // SHOW DOCUMENT DETAILS
    // ======================================================
    public function show($id)
    {
        try {
            $document = Document::with(['uploader', 'recipients'])->findOrFail($id);
            return response()->json($document);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Document not found'], 404);
        }
    }

    // ======================================================
    // GET DOCUMENTS WITH FILTERING
    // ======================================================
    public function getDocuments(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $query = $user->isStaff()
            ? Document::query()
            : $user->receivedDocuments();

        $query->with(['recipients', 'uploader', 'activities']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('file_type')) {
            if ($request->file_type === 'image') {
                $query->whereIn('file_type', ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']);
            } else {
                $query->where('file_type', $request->file_type);
            }
        }
        if ($request->filled('uploaded_by')) {
            $query->where('uploaded_by', $request->uploaded_by);
        }
        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        switch ($request->sort) {
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'a-z':
                $query->orderBy('title', 'asc');
                break;
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        return response()->json($query->paginate(10));
    }

    // ======================================================
    // GET SINGLE DOCUMENT (+ auto mark viewed)
    // ======================================================
    public function getDocument(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::with(['recipients', 'uploader', 'activities.user'])->findOrFail($id);

        if (!$user->isStaff() && !$document->recipients->contains($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->isStaff()) {
            $recipient = $document->recipients()->where('users.id', $user->id)->first();

            if ($recipient && !$recipient->pivot->is_viewed) {
                $document->recipients()->updateExistingPivot($user->id, [
                    'is_viewed' => true,
                    'viewed_at' => now(),
                ]);

                DocumentActivity::create([
                    'document_id' => $document->id,
                    'user_id' => $user->id,
                    'activity_type' => 'viewed',
                    'details' => 'Document viewed',
                ]);
            }
        }

        return response()->json($document);
    }

    // ======================================================
    // ACKNOWLEDGE DOCUMENT
    // ======================================================
    public function acknowledgeDocument(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::findOrFail($id);

        $recipient = $document->recipients()->where('users.id', $user->id)->first();

        if (!$recipient) return response()->json(['message' => 'Unauthorized'], 403);
        if ($recipient->pivot->is_acknowledged) return response()->json(['message' => 'Document already acknowledged'], 400);

        $document->recipients()->updateExistingPivot($user->id, [
            'is_acknowledged' => true,
            'acknowledged_at' => now(),
        ]);

        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'activity_type' => 'acknowledged',
            'details' => 'Document acknowledged',
        ]);

        return response()->json([
            'message' => 'Document acknowledged successfully',
            'document' => $document->fresh()->load('recipients', 'uploader')
        ]);
    }

    // ======================================================
    // DOWNLOAD DOCUMENT
    // ======================================================
    public function downloadDocument(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::with('recipients')->findOrFail($id);

        if (!$user->isStaff() && !$document->recipients->contains($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'activity_type' => 'downloaded',
            'details' => 'Document downloaded',
        ]);

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $filePath = storage_path('app/public/' . $document->file_path);
        $fileName = $document->title . '.' . $document->file_type;
        $mimeType = File::mimeType($filePath);

        return response()->download($filePath, $fileName, ['Content-Type' => $mimeType]);
    }

    // ======================================================
    // SEARCH DOCUMENTS
    // ======================================================
    public function search(Request $request)
    {
        $request->validate(['query' => 'required|string|min:1']);

        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $searchTerm = $request->query('query', '');

        $query = $user->isStaff()
            ? Document::query()
            : $user->receivedDocuments();

        $query->where(function ($q) use ($searchTerm) {
            $q->where('title', 'like', "%{$searchTerm}%")
              ->orWhere('description', 'like', "%{$searchTerm}%")
              ->orWhere('ocr_text', 'like', "%{$searchTerm}%")
              ->orWhere('document_id', 'like', "%{$searchTerm}%");
        });

        $query->with(['recipients', 'uploader']);

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    // ======================================================
    // AUTOCOMPLETE SEARCH
    // ======================================================
    public function autocomplete(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);

        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $searchTerm = $request->query('query', '');

        $query = $user->isStaff()
            ? Document::query()
            : $user->receivedDocuments();

        $query->select('id', 'title', 'document_id')
              ->where(function ($q) use ($searchTerm) {
                  $q->where('title', 'like', "%{$searchTerm}%")
                    ->orWhere('document_id', 'like', "%{$searchTerm}%");
              })
              ->orderBy('created_at', 'desc')
              ->limit(10);

        return response()->json($query->get());
    }

    // ======================================================
    // VERIFY DOCUMENT
    // ======================================================
    public function verifyDocument($paperId)
    {
        $document = Document::where('paper_id', $paperId)->first();

        if (!$document) return response()->json(['message' => 'Document not found'], 404);

        return response()->json([
            'message'     => 'Document verified',
            'document'    => $document->load('uploader')
        ]);
    }

    // ======================================================
    // GET QR CODE
    // ======================================================
    public function getQRCode($id)
    {
        $document = Document::findOrFail($id);

        if (!$document->qr_code_path || !Storage::disk('public')->exists($document->qr_code_path)) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $documentUrl = $frontendUrl . '/document/' . $document->id;

            $qrCode = QrCode::format('svg')->size(300)->errorCorrection('H')->generate($documentUrl);

            $qrPath = 'qrcodes/' . $document->paper_id . '.svg';
            Storage::disk('public')->put($qrPath, $qrCode);

            $document->qr_code_path = $qrPath;
            $document->save();
        }

        $qrContent = Storage::disk('public')->get($document->qr_code_path);
        return response($qrContent)->header('Content-Type', 'image/svg+xml');
    }

    // ======================================================
    // DOWNLOAD QR CODE
    // ======================================================
    public function downloadQRCode($id)
    {
        $document = Document::findOrFail($id);

        if (!Storage::disk('public')->exists($document->qr_code_path)) {
            return response()->json(['message' => 'QR code not found'], 404);
        }

        $file = Storage::disk('public')->get($document->qr_code_path);

        return response($file, 200, [
            'Content-Type'        => 'image/svg+xml',
            'Content-Disposition' => 'attachment; filename="QR-'.$document->document_id.'.svg"'
        ]);
    }

    // ======================================================
    // VIEW DOCUMENT (with conversion)
    // ======================================================
    public function viewDocument($id)
    {
        $doc = Document::find($id);

        if (!$doc) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $path = storage_path('app/public/' . $doc->file_path);

        if (!file_exists($path)) {
            return response()->json(['error' => 'File not found on server'], 404);
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        // Direct view types
        $inlineTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'];

        if (in_array($extension, $inlineTypes)) {
            return response()->file($path, [
                'Content-Type'        => mime_content_type($path),
                'Content-Disposition' => 'inline; filename="' . basename($path) . '"'
            ]);
        }

        // Conversion
        $convertedDir = storage_path('app/public/converted/');

        if (!is_dir($convertedDir)) {
            mkdir($convertedDir, 0777, true);
        }

        $pdfOutput = $convertedDir . $id . '.pdf';

        try {
            switch ($extension) {
                case 'doc':
                case 'docx':
                    $phpWord = WordIOFactory::load($path);
                    $writer = WordIOFactory::createWriter($phpWord, 'PDF');
                    $writer->save($pdfOutput);
                    break;

                case 'xlsx':
                    $spreadsheet = SpreadsheetIOFactory::load($path);
                    $writer = new SpreadsheetPdfWriter($spreadsheet);
                    $writer->save($pdfOutput);
                    break;

                case 'pptx':
                    $presentation = PresentationIOFactory::load($path);
                    $writer = PresentationIOFactory::createWriter($presentation, 'PDF');
                    $writer->save($pdfOutput);
                    break;

                default:
                    return response()->download($path);
            }

            if (file_exists($pdfOutput)) {
                return response()->file($pdfOutput, [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => 'inline; filename="preview.pdf"'
                ]);
            }

            return response()->json(['error' => 'PDF conversion failed'], 500);

        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Failed to convert document to PDF',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    // ======================================================
    // DELETE DOCUMENT
    // ======================================================
    public function deleteDocument(Request $request, $id)
    {
        $user = $request->user();

        if (!$user || !$user->isStaff()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $document = Document::find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Delete main file
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        // Delete QR code
        if ($document->qr_code_path && Storage::disk('public')->exists($document->qr_code_path)) {
            Storage::disk('public')->delete($document->qr_code_path);
        }

        // Delete converted PDF preview
        $convertedPdf = storage_path('app/public/converted/' . $document->id . '.pdf');
        if (file_exists($convertedPdf)) {
            unlink($convertedPdf);
        }

        // Detach recipients
        $document->recipients()->detach();

        // Delete related activities
        DocumentActivity::where('document_id', $document->id)->delete();

        // Delete notifications
        Notification::where('data->document_id', $document->id)->delete();

        // Delete document record
        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    public function getInfo($id)
    {
        $document = Document::find($id); // Assuming your table is "documents"
        if (!$document) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        return response()->json([
            'id' => $document->id,
            'title' => $document->title, // Make sure your table has a 'title' column
        ]);
    }

    public function crop(Request $request, $id)
    {
        $document = Document::findOrFail($id);

        $file = $request->file('file');

        $path = 'documents/' . $document->filename;

        Storage::disk('public')->put($path, file_get_contents($file));

        $document->updated_at = now();
        $document->save();

        return response()->json([
            'message' => 'Document cropped successfully'
        ]);
    }

    public function ocr($id)
    {
        $document = Document::findOrFail($id);

        \Log::info("OCR: Started for document ID {$id}");

        // Only allow images
        if (!in_array(strtolower($document->file_type), [
            'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif', 'webp'
        ])) {
            return response()->json([
                'words' => [],
                'count' => 0,
                'error' => 'Unsupported file type'
            ]);
        }

        $imagePath = storage_path('app/public/' . $document->file_path);
        \Log::info("OCR: Image path resolved to {$imagePath}");

        if (!file_exists($imagePath)) {
            return response()->json([
                'error' => 'Image file not found'
            ], 404);
        }

        try {
            \Log::info("OCR: Running Tesseract...");
            $tsv = (new TesseractOCR($imagePath))
                ->lang('eng')
                ->dpi(300)
                ->psm(3)    // full page segmentation
                ->oem(1)
                ->tsv()
                ->run();
            \Log::info("OCR: Tesseract completed");

            $lines = explode("\n", trim($tsv));
            array_shift($lines); // remove TSV header

            // Group words by block + line
            $groupedLines = [];

            foreach ($lines as $line) {
                if (trim($line) === '') continue;

                $cols = explode("\t", $line);
                if (count($cols) < 12) continue;

                [
                    $level,
                    $page_num,
                    $block_num,
                    $par_num,
                    $line_num,
                    $word_num,
                    $left,
                    $top,
                    $width,
                    $height,
                    $conf,
                    $text
                ] = $cols;

                if (trim($text) === '' || (int)$conf < 40) continue;

                // Safe text cleanup (keeps spaces & symbols)
                $cleanText = preg_replace('/[\x00-\x1F\x7F]/u', '', $text);
                $cleanText = trim($cleanText);
                if ($cleanText === '') continue;

                $key = $block_num . '-' . $line_num;

                $groupedLines[$key][] = [
                    'text' => $cleanText,
                    'x0'   => (int)$left,
                    'y0'   => (int)$top,
                    'x1'   => (int)$left + (int)$width,
                    'y1'   => (int)$top + (int)$height,
                    'conf' => (int)$conf,
                ];
            }

            // Rebuild lines with CORRECT spacing
            $words = [];

            foreach ($groupedLines as $lineWords) {
                // Sort words left → right
                usort($lineWords, fn($a, $b) => $a['x0'] <=> $b['x0']);

                // 🔑 ALWAYS join words with spaces
                $lineText = implode(' ', array_map(fn($w) => $w['text'], $lineWords));
                $lineText = preg_replace('/\s+/', ' ', trim($lineText));

                if ($lineText === '') continue;

                $firstWord = $lineWords[0];
                $lastWord  = end($lineWords);

                $words[] = [
                    'text' => $lineText,
                    'x0'   => $firstWord['x0'],
                    'y0'   => $firstWord['y0'],
                    'x1'   => $lastWord['x1'],
                    'y1'   => $lastWord['y1'],
                    'conf' => min(array_column($lineWords, 'conf')),
                ];
            }

            \Log::info("OCR: Finished processing. Lines count: " . count($words));

            return response()->json([
                'words' => $words,
                'count' => count($words),
            ]);

        } catch (\Throwable $e) {
            \Log::error("OCR Exception: " . $e->getMessage());
            return response()->json([
                'words' => [],
                'count' => 0,
                'error' => 'OCR failed'
            ], 500);
        }
    }

}
