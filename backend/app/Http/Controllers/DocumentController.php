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

        // Generate QR Code
        $qrCode = QrCode::format('svg')->size(300)->generate(
            route('document.verify', $document->paper_id)
        );
        $qrPath = 'qrcodes/' . $document->paper_id . '.svg';
        Storage::disk('public')->put($qrPath, $qrCode);
        $document->qr_code_path = $qrPath;
        $document->save();

        // Attach recipients
        $document->recipients()->attach($request->recipients);

        // Log activity - FIXED: use 'user_id' not 'users.id'
        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $request->user()->id,
            'activity_type' => 'uploaded',
            'details' => 'Document uploaded',
        ]);

        // Send notifications to recipients - FIXED: use 'user_id' not 'users.id'
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
            // Check if user is a recipient using the pivot table
            $isRecipient = $document->recipients()->where('users.id', $user->id)->exists();
            
            if ($isRecipient) {
                // Get the pivot data
                $recipientData = $document->recipients()->where('users.id', $user->id)->first();
                
                // Only update if not already viewed
                if ($recipientData && isset($recipientData->pivot) && !$recipientData->pivot->is_viewed) {
                    $document->recipients()->updateExistingPivot($user->id, [
                        'is_viewed' => true,
                        'viewed_at' => now(),
                    ]);

                    // FIXED: use 'user_id' not 'users.id'
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

        // FIXED: use 'users.id' when querying with WHERE clause
        $recipient = $document->recipients()->where('users.id', $user->id)->first();
        
        if (!$recipient) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $document->recipients()->updateExistingPivot($user->id, [
            'is_acknowledged' => true,
            'acknowledged_at' => now(),
        ]);

        // FIXED: use 'user_id' not 'users.id'
        DocumentActivity::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'activity_type' => 'acknowledged',
            'details' => 'Document acknowledged',
        ]);

        return response()->json([
            'message' => 'Document acknowledged successfully'
        ]);
    }

    public function downloadDocument(Request $request, $id)
    {
        $user = $request->user();
        $document = Document::findOrFail($id);

        if (!$user->isStaff() && !$document->recipients->contains($user->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // FIXED: use 'user_id' not 'users.id'
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

        return response()->json(['message' => 'Document verified', 'document' => $document]);
    }
}