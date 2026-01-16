<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentFile;
use App\Models\DocumentActivity;
use App\Models\Notification;
use App\Models\User;
use App\Services\DocumentClassificationService;
use App\Services\AuditTrailService;
use App\Services\WorkflowService;
use App\Services\DocumentValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetIOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Pdf\Mpdf as SpreadsheetPdfWriter;
use PhpOffice\PhpPresentation\IOFactory as PresentationIOFactory;
use thiagoalessio\TesseractOCR\TesseractOCR;
use ZipArchive;

class DocumentController extends Controller
{
    // ======================================================
    // UPLOAD DOCUMENT (with OCR)
    // ======================================================
    public function upload(Request $request)
    {
        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:10240|mimes:pdf,jpg,jpeg,png,doc,docx,mp4,mp3,avi,mov,wmv,flv,webm,mkv,wav,ogg,aac,m4a',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'recipients' => 'required|array',
            'recipients.*' => 'exists:users,id',
            'classification' => 'nullable|in:invoice,contract,report,form,other',
        ]);

        // Create document record
        $document = Document::create([
            'title' => $request->title,
            'document_id' => Document::generateDocumentId(),
            'description' => $request->description,
            'uploaded_by' => $request->user()->id,
            'paper_id' => Document::generatePaperId(),
        ]);

        $uploadedFiles = [];
        $allOcrText = [];

        foreach ($request->file('files') as $file) {
            $extension = strtolower($file->getClientOriginalExtension());
            $path = $file->store('document', 'public');
            $ocrText = null;

            // OCR extraction
            try {
                if (in_array($extension, ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'gif'])) {
                    $ocrText = (new TesseractOCR($file->getRealPath()))->run();
                } elseif ($extension === 'pdf') {
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
            }

            if ($ocrText) {
                $allOcrText[] = $ocrText;
            }

            // Save each file to document_files table
            $document->files()->create([
                'file_path' => $path,
                'file_type' => $extension,
                'file_size' => $file->getSize(),
                'ocr_text' => $ocrText,
            ]);

            $uploadedFiles[] = [
                'file_path' => $path,
                'file_type' => $extension,
                'file_size' => $file->getSize(),
                'ocr_text' => $ocrText,
            ];
        }

        // Document Classification
        $classificationService = new DocumentClassificationService();
        $combinedOcrText = implode("\n", $allOcrText);
        
        // If manual classification provided, use it; otherwise auto-classify
        if ($request->filled('classification')) {
            $document->classification = $request->classification;
            $document->classification_method = 'manual';
            $document->classification_confidence = 100;
        } else {
            // Auto-classify using rule-based or AI
            $classificationResult = $classificationService->classify(
                $document,
                $combinedOcrText,
                $request->input('classification_method', 'auto')
            );
            
            $document->classification = $classificationResult['classification'];
            $document->classification_confidence = $classificationResult['confidence'];
            $document->classification_method = $classificationResult['method'];
        }
        
        $document->save();

        // QR code with logo
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $documentUrl = $frontendUrl . '/document/' . $document->id;

        // Use a copy of the logo in Laravel public folder
        $logoPath = public_path('logo-SMD.png'); // Make sure logo.png is here

        $qrCode = QrCode::format('png')
            ->size(300)
            ->margin(20) // adds extra white space
            ->errorCorrection('H') // needed for logo overlay
            ->merge($logoPath, 0.25, true) // 25% of QR size, centered
            ->generate($documentUrl);

        $qrPath = 'qrcodes/' . $document->paper_id . '.png';
        Storage::disk('public')->put($qrPath, $qrCode);

        $document->qr_code_path = $qrPath;
        $document->save();

        // Attach recipients and notifications
        $document->recipients()->attach($request->recipients);

        // Optional: Validate document against existing database
        if ($request->input('validate_on_upload', false)) {
            try {
                $validationService = new DocumentValidationService();
                $validationResults = $validationService->validate($document);
                
                // Save validation results
                $document->is_validated = true;
                $document->validation_confidence = $validationResults['confidence'];
                $document->validated_at = now();
                $document->validation_results = [
                    'is_valid' => $validationResults['is_valid'],
                    'confidence' => $validationResults['confidence'],
                    'checks_count' => count($validationResults['checks']),
                    'warnings_count' => count($validationResults['warnings']),
                    'errors_count' => count($validationResults['errors']),
                    'duplicates_count' => count($validationResults['duplicates']),
                    'validated_at' => now()->toIso8601String(),
                ];
                $document->save();
            } catch (\Exception $e) {
                \Log::error('Document validation failed during upload: ' . $e->getMessage());
                // Don't fail the upload if validation fails
            }
        }

        // Trigger workflow automation if classification exists
        if ($document->classification) {
            try {
                $workflowService = app(WorkflowService::class);
                $workflowService->assignWorkflowToDocument($document);
            } catch (\Exception $e) {
                \Log::error('Workflow assignment failed: ' . $e->getMessage());
                // Don't fail the upload if workflow assignment fails
            }
        }

        // Log document upload with audit trail
        AuditTrailService::log(
            $document->id,
            $request->user()->id,
            'uploaded',
            "Document '{$document->title}' uploaded with {$document->files->count()} file(s)",
            $request,
            null,
            json_encode([
                'title' => $document->title,
                'document_id' => $document->document_id,
                'paper_id' => $document->paper_id,
                'classification' => $document->classification,
                'file_count' => $document->files->count(),
                'recipient_count' => count($request->recipients),
            ]),
            [
                'document_id' => $document->document_id,
                'paper_id' => $document->paper_id,
                'classification' => $document->classification,
                'classification_method' => $document->classification_method,
                'classification_confidence' => $document->classification_confidence,
                'file_count' => $document->files->count(),
                'recipient_ids' => $request->recipients,
            ]
        );

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
            'document' => $document->load('recipients', 'uploader', 'files')
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

        $query->with(['recipients', 'uploader', 'activities', 'files']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // ======================================================
        // FILE TYPE FILTER (FIXED)
        // ======================================================
        if ($request->filled('file_type')) {
            if ($request->file_type === 'image') {
                $query->whereHas('files', function ($q) {
                    $q->whereIn('file_type', ['jpg','jpeg','png','gif','bmp','webp']);
                });
            } else {
                $query->whereHas('files', function ($q) use ($request) {
                    $q->where('file_type', $request->file_type);
                });
            }
        }

        // ======================================================
        // CLASSIFICATION FILTER
        // ======================================================
        if ($request->filled('classification')) {
            $query->where('classification', $request->classification);
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
            case 'z-a':
                $query->orderBy('title', 'desc');
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

        $document = Document::with(['recipients', 'uploader', 'activities.user', 'workflowInstance'])->findOrFail($id);

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

                AuditTrailService::log(
                    $document->id,
                    $user->id,
                    'viewed',
                    "Document '{$document->title}' viewed",
                    $request
                );
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

        AuditTrailService::log(
            $document->id,
            $user->id,
            'acknowledged',
            "Document '{$document->title}' acknowledged",
            $request
        );

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
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Load document with recipients and files
        $document = Document::with(['recipients', 'files'])->findOrFail($id);

        // Authorization: staff or recipient
        if (!$user->isStaff() && !$document->recipients->contains('id', $user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Filter only files that exist on disk
        $files = $document->files->filter(fn($f) => Storage::disk('public')->exists($f->file_path));

        if ($files->isEmpty()) {
            return response()->json(['message' => 'No files found for this document'], 404);
        }

        // Record download activity with audit trail
        AuditTrailService::log(
            $document->id,
            $user->id,
            'downloaded',
            "Document '{$document->title}' downloaded ({$files->count()} file(s))",
            $request,
            null,
            null,
            [
                'file_count' => $files->count(),
                'download_format' => $files->count() > 1 ? 'zip' : 'single',
            ]
        );

        if ($files->isEmpty()) {
            return response()->json(['message' => 'No files found for this document'], 404);
        }

        // ======================================================
        // MULTIPLE FILES → ZIP
        // ======================================================
        if ($files->count() > 1) {

            $zipFileName = Str::slug($document->title) . '.zip';
            $zipPath = storage_path('app/temp/' . $zipFileName);

            if (!File::exists(dirname($zipPath))) {
                File::makeDirectory(dirname($zipPath), 0755, true);
            }

            $zip = new ZipArchive;

            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                return response()->json(['message' => 'Could not create ZIP file'], 500);
            }

            foreach ($files as $file) {
                // Use original file if exists, else OCR/file_path
                $filePathToUse = $file->original_file_path ?? $file->file_path;
                $absolutePath = storage_path('app/public/' . $filePathToUse);
                
                // Verify file exists before adding to zip
                if (file_exists($absolutePath)) {
                    $zip->addFile($absolutePath, basename($absolutePath));
                }
            }

            $zip->close();

            return response()->download($zipPath, $zipFileName)->deleteFileAfterSend(true);
        }

        // ======================================================
        // SINGLE FILE → download directly with correct MIME
        // ======================================================
        $file = $files->first();

        // Use original file if exists, else file_path
        $filePathToUse = $file->original_file_path ?? $file->file_path;
        $filePath = storage_path('app/public/' . $filePathToUse);
        
        // Verify file exists before downloading
        if (!file_exists($filePath)) {
            return response()->json(['message' => 'File not found on disk'], 404);
        }

        // Use file_type from DB if set, else fallback to extension
        $extension = strtolower($file->file_type ?? pathinfo($filePath, PATHINFO_EXTENSION));
        $fileName = $document->title . '.' . $extension;

        // Map extensions to MIME types
        $mimeTypes = [
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'gif'  => 'image/gif',
            'pdf'  => 'application/pdf',
        ];
        $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

        return response()->download($filePath, $fileName, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
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
            $q->where('documents.title', 'like', "%{$searchTerm}%")
            ->orWhere('documents.description', 'like', "%{$searchTerm}%")
            ->orWhere('documents.document_id', 'like', "%{$searchTerm}%")
            ->orWhereHas('files', function ($fileQuery) use ($searchTerm) {
                $fileQuery->where('ocr_text', 'like', "%{$searchTerm}%");
            });
        });

        $query->with(['recipients', 'uploader']);

        return response()->json($query->orderBy('documents.created_at', 'desc')->paginate(10));
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

        $query->select('documents.id', 'documents.title', 'documents.document_id')
            ->where(function ($q) use ($searchTerm) {
                $q->where('documents.title', 'like', "%{$searchTerm}%")
                    ->orWhere('documents.document_id', 'like', "%{$searchTerm}%");
            })
            ->orderBy('documents.created_at', 'desc')
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
    // VIEW DOCUMENT (multiple files support)
    // ======================================================
    public function viewDocument(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::with(['recipients', 'files'])->find($id);
        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Authorization: staff or recipient
        if (!$user->isStaff() && !$document->recipients->contains('id', $user->id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $filesData = $document->files->map(function ($file) {
            $extension = strtolower(pathinfo($file->file_path, PATHINFO_EXTENSION));

            return [
                'id'        => $file->id,
                'file_type' => $extension,
                'file_path' => $file->file_path,
                'file_size' => $file->file_size,
                'ocr_text'  => $file->ocr_text,
                'view_url'  => asset('storage/' . $file->file_path), // always return URL
            ];
        })->filter()->values();

        if ($filesData->isEmpty()) {
            return response()->json(['error' => 'No files available'], 404);
        }

        return response()->json([
            'id'          => $document->id,
            'title'       => $document->title,
            'description' => $document->description,
            'uploaded_by' => $document->uploaded_by,
            'files'       => $filesData,
        ]);
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

        $document = Document::with('files')->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Log deletion before deleting (capture document data)
        $documentData = [
            'id' => $document->id,
            'title' => $document->title,
            'document_id' => $document->document_id,
            'paper_id' => $document->paper_id,
            'classification' => $document->classification,
            'file_count' => $document->files->count(),
        ];
        
        AuditTrailService::logDeletion(
            $document->id,
            $user->id,
            $documentData,
            $request
        );

        // ======================================================
        // DELETE ALL FILES
        // ======================================================
        foreach ($document->files as $file) {
            if (Storage::disk('public')->exists($file->file_path)) {
                Storage::disk('public')->delete($file->file_path);
            }

            // Delete converted preview if exists
            $convertedPdf = storage_path('app/public/converted/' . $file->id . '.pdf');
            if (file_exists($convertedPdf)) {
                unlink($convertedPdf);
            }
        }

        // ======================================================
        // DELETE QR CODE
        // ======================================================
        if ($document->qr_code_path && Storage::disk('public')->exists($document->qr_code_path)) {
            Storage::disk('public')->delete($document->qr_code_path);
        }

        // ======================================================
        // CLEAN RELATED DATA
        // ======================================================
        $document->recipients()->detach();
        DocumentActivity::where('document_id', $document->id)->delete();
        Notification::where('data->document_id', $document->id)->delete();

        // ======================================================
        // DELETE FILE RECORDS
        // ======================================================
        $document->files()->delete();

        // ======================================================
        // DELETE DOCUMENT
        // ======================================================
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

    public function ocr(Request $request, $id)
    {
        $document = Document::with('files')->findOrFail($id);

        // Choose file
        $file = $request->has('file_id')
            ? $document->files->where('id', $request->file_id)->first()
            : $document->files->first();

        if (!$file) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $extension = strtolower(pathinfo($file->file_path, PATHINFO_EXTENSION));

        if (!in_array($extension, ['jpg','jpeg','png','bmp','tiff','gif','webp'])) {
            return response()->json([
                'words' => [],
                'count' => 0,
                'error' => 'Unsupported file type'
            ]);
        }

        $imagePath = storage_path('app/public/' . $file->file_path);

        if (!file_exists($imagePath)) {
            return response()->json(['error' => 'Image file not found'], 404);
        }

        \Log::info("OCR: Starting for file {$file->id}");

        try {
            $tsv = (new TesseractOCR($imagePath))
                ->lang('eng')
                ->dpi(300)
                ->psm(3)
                ->oem(1)
                ->tsv()
                ->run();

            $lines = explode("\n", trim($tsv));
            array_shift($lines);

            $groupedLines = [];

            foreach ($lines as $line) {
                $cols = explode("\t", $line);
                if (count($cols) < 12) continue;

                [
                    $level,$page,$block,$par,$lineNum,$wordNum,
                    $left,$top,$width,$height,$conf,$text
                ] = $cols;

                if (trim($text) === '' || (int)$conf < 40) continue;

                $cleanText = trim(preg_replace('/[\x00-\x1F\x7F]/u', '', $text));
                if ($cleanText === '') continue;

                $key = $block . '-' . $lineNum;

                $groupedLines[$key][] = [
                    'text'=>$cleanText,
                    'x0'=>(int)$left,
                    'y0'=>(int)$top,
                    'x1'=>(int)$left+(int)$width,
                    'y1'=>(int)$top+(int)$height,
                    'conf'=>(int)$conf,
                ];
            }

            $words = [];

            foreach ($groupedLines as $lineWords) {
                usort($lineWords, fn($a,$b)=>$a['x0']<=>$b['x0']);
                $text = implode(' ', array_column($lineWords, 'text'));
                $text = preg_replace('/\s+/', ' ', trim($text));
                if ($text === '') continue;

                $words[] = [
                    'text' => $text,
                    'x0'   => $lineWords[0]['x0'],
                    'y0'   => $lineWords[0]['y0'],
                    'x1'   => end($lineWords)['x1'],
                    'y1'   => end($lineWords)['y1'],
                    'conf' => min(array_column($lineWords,'conf')),
                ];
            }

            // Save OCR result
            $file->update([
                'ocr_text' => implode("\n", array_column($words, 'text'))
            ]);

            return response()->json([
                'words' => $words,
                'count' => count($words),
            ]);

        } catch (\Throwable $e) {
            \Log::error("OCR failed for file {$file->id}: ".$e->getMessage());
            return response()->json([
                'words'=>[],
                'count'=>0,
                'error'=>'OCR failed'
            ], 500);
        }
    }

    // ======================================================
    // CLASSIFY DOCUMENT
    // ======================================================
    public function classifyDocument(Request $request, $id)
    {
        $request->validate([
            'classification' => 'required|in:invoice,contract,report,form,other',
            'method' => 'nullable|in:manual,rule-based,ai,auto',
        ]);

        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::with('files')->findOrFail($id);

        // Check permissions (staff can classify any document, users can classify their received documents)
        if (!$user->isStaff() && !$document->recipients->contains('id', $user->id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $method = $request->input('method', 'manual');
        
        // Capture old classification before modifying
        $oldClassification = $document->classification;

        if ($method === 'manual') {
            $document->classification = $request->classification;
            $document->classification_method = 'manual';
            $document->classification_confidence = 100;
        } else {
            // Re-classify using specified method
            $classificationService = new DocumentClassificationService();
            
            // Combine OCR text from all files
            $combinedOcrText = $document->files->pluck('ocr_text')
                ->filter()
                ->implode("\n");

            $classificationResult = $classificationService->classify(
                $document,
                $combinedOcrText,
                $method === 'auto' ? 'auto' : ($method === 'ai' ? 'ai' : 'rule-based')
            );

            $document->classification = $classificationResult['classification'];
            $document->classification_confidence = $classificationResult['confidence'];
            $document->classification_method = $classificationResult['method'];
        }

        $document->save();

        // Trigger workflow automation if classification changed and no workflow exists
        if ($oldClassification !== $document->classification) {
            try {
                $workflowService = app(WorkflowService::class);
                $workflowService->assignWorkflowToDocument($document);
            } catch (\Exception $e) {
                \Log::error('Workflow assignment failed: ' . $e->getMessage());
                // Don't fail the classification if workflow assignment fails
            }
        }

        // Log classification activity with audit trail
        AuditTrailService::logModification(
            $document->id,
            $user->id,
            'classification',
            $oldClassification,
            $document->classification,
            $request,
            [
                'classification_method' => $document->classification_method,
                'classification_confidence' => $document->classification_confidence,
            ]
        );

        return response()->json([
            'message' => 'Document classified successfully',
            'document' => $document->fresh()->load('recipients', 'uploader', 'files', 'workflowInstance'),
            'classification' => [
                'type' => $document->classification,
                'confidence' => $document->classification_confidence,
                'method' => $document->classification_method,
            ]
        ]);
    }

    // ======================================================
    // FORWARD DOCUMENT
    // ======================================================
    public function forward(Request $request, $id)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'message' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::findOrFail($id);

        // Check if user has permission to forward (staff or recipient)
        if (!$user->isStaff() && !$document->recipients->contains('id', $user->id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Find recipient user by email
        $recipientUser = User::where('email', $request->email)->firstOrFail();

        // Check if user is already a recipient
        if ($document->recipients->contains('id', $recipientUser->id)) {
            return response()->json(['error' => 'User is already a recipient of this document'], 400);
        }

        // Add recipient
        $document->recipients()->attach($recipientUser->id);

        // Log forwarding with audit trail
        AuditTrailService::logForward(
            $document->id,
            $user->id,
            $recipientUser->id,
            $recipientUser->email,
            $request->message,
            $request
        );

        // Get forwarder's name and email
        $forwarderName = $user->info 
            ? trim(($user->info->first_name ?? '') . ' ' . ($user->info->last_name ?? ''))
            : $user->email;
        $forwarderEmail = $user->email;

        // Create notification for recipient
        // Email will be sent automatically via Notification model's booted() method
        Notification::create([
            'user_id' => $recipientUser->id,
            'title' => 'Document Forwarded',
            'message' => "You have received a forwarded document: {$document->title} from {$forwarderName} ({$forwarderEmail})" . ($request->message ? " - {$request->message}" : ''),
            'type' => 'document',
            'data' => json_encode([
                'document_id' => $document->id,
                'forwarded_by' => $forwarderName,
                'forwarded_by_email' => $forwarderEmail
            ]),
        ]);

        return response()->json([
            'message' => 'Document forwarded successfully',
            'recipient' => $recipientUser->load('info')
        ]);
    }

    // ======================================================
    // GET AUDIT TRAIL FOR DOCUMENT
    // ======================================================
    public function getAuditTrail(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        // Load info relationship to ensure access_level is available
        $user->load('info');

        $document = Document::findOrFail($id);

        // Authorization: Only admins (access_level >= 4) can view audit trails
        if ($user->access_level < 4) {
            return response()->json(['error' => 'Unauthorized - Admin access required'], 403);
        }

        $query = DocumentActivity::with(['user', 'user.info'])
            ->where('document_id', $id)
            ->orderBy('created_at', 'desc');

        // Filter by activity type
        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->activity_type);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Pagination
        $perPage = $request->input('per_page', 20);
        $activities = $query->paginate($perPage);

        // Format response
        $formattedActivities = $activities->map(function ($activity) {
            $userName = $activity->user->info 
                ? trim(($activity->user->info->first_name ?? '') . ' ' . ($activity->user->info->last_name ?? ''))
                : $activity->user->email;

            return [
                'id' => $activity->id,
                'activity_type' => $activity->activity_type,
                'details' => $activity->details,
                'user' => [
                    'id' => $activity->user->id,
                    'name' => $userName,
                    'email' => $activity->user->email,
                ],
                'old_value' => $activity->old_value,
                'new_value' => $activity->new_value,
                'metadata' => $activity->metadata,
                'ip_address' => $activity->ip_address,
                'user_agent' => $activity->user_agent,
                'created_at' => $activity->created_at->toIso8601String(),
                'created_at_formatted' => $activity->created_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'document' => [
                'id' => $document->id,
                'title' => $document->title,
                'document_id' => $document->document_id,
            ],
            'activities' => $formattedActivities,
            'pagination' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    // ======================================================
    // VALIDATE DOCUMENT AGAINST DATABASE
    // ======================================================
    public function validateDocument(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::with('files')->findOrFail($id);

        // Authorization: staff can validate any document, users can validate their received documents
        if (!$user->isStaff() && !$document->recipients->contains('id', $user->id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validationService = new DocumentValidationService();
        
        // Get validation options from request
        $options = [
            'check_duplicates' => $request->input('check_duplicates', true),
            'check_ocr_quality' => $request->input('check_ocr_quality', true),
            'check_classification' => $request->input('check_classification', true),
        ];

        // Perform validation
        $validationResults = $validationService->validate($document, $options);

        // Save validation results to database if requested
        $saveResults = $request->input('save_results', true);
        if ($saveResults) {
            $document->is_validated = true;
            $document->validation_confidence = $validationResults['confidence'];
            $document->validated_at = now();
            $document->validation_results = [
                'is_valid' => $validationResults['is_valid'],
                'confidence' => $validationResults['confidence'],
                'checks_count' => count($validationResults['checks']),
                'warnings_count' => count($validationResults['warnings']),
                'errors_count' => count($validationResults['errors']),
                'duplicates_count' => count($validationResults['duplicates']),
                'validated_at' => now()->toIso8601String(),
            ];
            $document->save();
        }

        // Log validation activity with audit trail
        AuditTrailService::log(
            $document->id,
            $user->id,
            'validated',
            "Document '{$document->title}' validated against database",
            $request,
            null,
            null,
            [
                'validation_results' => [
                    'is_valid' => $validationResults['is_valid'],
                    'confidence' => $validationResults['confidence'],
                    'checks_count' => count($validationResults['checks']),
                    'warnings_count' => count($validationResults['warnings']),
                    'errors_count' => count($validationResults['errors']),
                    'duplicates_count' => count($validationResults['duplicates']),
                ],
            ]
        );

        return response()->json([
            'message' => 'Document validation completed',
            'document' => [
                'id' => $document->id,
                'title' => $document->title,
                'document_id' => $document->document_id,
            ],
            'validation' => $validationResults,
            'saved' => $saveResults,
        ]);
    }

    // ======================================================
    // GET VALIDATION SUMMARY
    // ======================================================
    public function getValidationSummary(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthorized'], 401);

        $document = Document::findOrFail($id);

        // Authorization: staff can view any validation, users can view their received documents
        if (!$user->isStaff() && !$document->recipients->contains('id', $user->id)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validationService = new DocumentValidationService();
        $summary = $validationService->getValidationSummary($document);

        return response()->json([
            'summary' => $summary,
        ]);
    }


}
