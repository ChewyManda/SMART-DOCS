<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentActivity;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class DocumentController extends Controller
{
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

        $document = Document::create([
            'title' => $request->title,
            'document_id' => Document::generateDocumentId(),
            'file_path' => $path,
            'file_type' => $file->getClientOriginalExtension(),
            'file_size' => $file->getSize(),
            'description' => $request->description,
            'uploaded_by' => $request->user()->id,
            'paper_id' => Document::generatePaperId(),
        ]);

        // Generate QR Code that links directly to document view page
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $documentUrl = $frontendUrl . '/document/' . $document->id;
        
        $qrCode = QrCode::format('svg')
            ->size(300)
            ->errorCorrection('H')
            ->generate($documentUrl);
            
        $qrPath = 'qrcodes/' . $document->paper_id . '.svg';
        Storage::disk('public')->put($qrPath, $qrCode);
        $document->qr_code_path = $qrPath;
        $document->save();

        // Attach recipients
        $document->recipients()->attach($request->recipients);

        // Log activity
        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $request->user()->id,
            'activity_type' => 'uploaded',
            'details' => 'Document uploaded',
        ]);

        // Send notifications to recipients
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

    public function show($id)
    {
        try {
            $document = Document::with(['uploader', 'recipients'])->findOrFail($id);
            return response()->json($document);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Document not found'], 404);
        }
    }

    public function getDocuments(Request $request)
    {
        $user = $request->user();

        if ($user->isStaff()) {
            $documents = Document::with(['recipients', 'uploader', 'activities'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        } else {
            $documents = $user->receivedDocuments()
                ->with(['uploader', 'activities'])
                ->orderBy('documents.created_at', 'desc')
                ->paginate(20);
        }

        return response()->json($documents);
    }

    public function getDocument(Request $request, $id)
    {
        $user = $request->user();
        $document = Document::with(['recipients', 'uploader', 'activities.user'])->findOrFail($id);

        // Check if user has access
        if (!$user->isStaff() && !$document->recipients->contains($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Mark as viewed
        if (!$user->isStaff()) {
            $isRecipient = $document->recipients()->where('users.id', $user->id)->exists();
            
            if ($isRecipient) {
                $recipientData = $document->recipients()->where('users.id', $user->id)->first();
                
                if ($recipientData && isset($recipientData->pivot) && !$recipientData->pivot->is_viewed) {
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
        }

        return response()->json($document);
    }

    public function acknowledgeDocument(Request $request, $id)
    {
        $user = $request->user();
        $document = Document::findOrFail($id);

        $recipient = $document->recipients()->where('users.id', $user->id)->first();
        
        if (!$recipient) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if already acknowledged
        if ($recipient->pivot->is_acknowledged) {
            return response()->json([
                'message' => 'Document already acknowledged'
            ], 400);
        }

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

    public function downloadDocument(Request $request, $id)
    {
        $user = $request->user();
        $document = Document::findOrFail($id);

        if (!$user->isStaff() && !$document->recipients->contains($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'activity_type' => 'downloaded',
            'details' => 'Document downloaded',
        ]);

        return Storage::disk('public')->download($document->file_path);
    }

    public function search(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:2',
        ]);

        $user = $request->user();
        $searchTerm = $request->input('query');

        if ($user->isStaff()) {
            $documents = Document::where('title', 'like', "%{$searchTerm}%")
                ->orWhere('description', 'like', "%{$searchTerm}%")
                ->orWhere('ocr_text', 'like', "%{$searchTerm}%")
                ->orWhere('document_id', 'like', "%{$searchTerm}%")
                ->with(['recipients', 'uploader'])
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        } else {
            $documents = $user->receivedDocuments()
                ->where(function($q) use ($searchTerm) {
                    $q->where('title', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%")
                      ->orWhere('ocr_text', 'like', "%{$searchTerm}%")
                      ->orWhere('document_id', 'like', "%{$searchTerm}%");
                })
                ->with(['uploader'])
                ->orderBy('documents.created_at', 'desc')
                ->paginate(20);
        }

        return response()->json($documents);
    }

    public function verifyDocument($paperId)
    {
        $document = Document::where('paper_id', $paperId)->first();

        if (!$document) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        return response()->json([
            'message' => 'Document verified',
            'document' => $document->load('uploader')
        ]);
    }

  
    public function getQRCode($id)
    {
        $document = Document::findOrFail($id);

        if (!$document->qr_code_path || !Storage::disk('public')->exists($document->qr_code_path)) {
            // Regenerate QR code if missing
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $documentUrl = $frontendUrl . '/document/' . $document->id;
            
            $qrCode = QrCode::format('svg')
                ->size(300)
                ->errorCorrection('H')
                ->generate($documentUrl);
                
            $qrPath = 'qrcodes/' . $document->paper_id . '.svg';
            Storage::disk('public')->put($qrPath, $qrCode);
            $document->qr_code_path = $qrPath;
            $document->save();
        }

        $qrContent = Storage::disk('public')->get($document->qr_code_path);

        return response($qrContent)
            ->header('Content-Type', 'image/svg+xml');
    }

    public function downloadQRCode($id)
    {
        $document = Document::findOrFail($id);

        if (!$document->qr_code_path || !Storage::disk('public')->exists($document->qr_code_path)) {
            return response()->json(['message' => 'QR code not found'], 404);
        }

        return Storage::disk('public')->download(
            $document->qr_code_path,
            'QR-' . $document->document_id . '.svg'
        );
    }
}