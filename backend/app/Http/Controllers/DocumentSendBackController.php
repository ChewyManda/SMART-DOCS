<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Models\DocumentSendBack;
use App\Mail\DocumentSendBackMail;
use Illuminate\Support\Facades\Mail;
use App\Services\AuditTrailService;

class DocumentSendBackController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'document_id' => 'required|exists:documents,id',
            'message' => 'required|string',
            'file' => 'nullable|file|max:10240'
        ]);

        $user = $request->user();
        $document = Document::with(['uploader', 'recipients'])->findOrFail($request->document_id);

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('sendbacks', 'public');
        }

        $sendBack = DocumentSendBack::create([
            'document_id' => $document->id,
            'user_id' => $user->id,
            'message' => $request->message,
            'file_path' => $filePath,
        ]);

        $oldStatus = $document->status;
        $document->status = 'sent_back';
        $document->save();

        // Log send back with audit trail
        AuditTrailService::logSendBack(
            $document->id,
            $user->id,
            $request->message,
            $filePath,
            $request
        );

        // Log status change separately
        if ($oldStatus !== $document->status) {
            AuditTrailService::logModification(
                $document->id,
                $user->id,
                'status',
                $oldStatus,
                $document->status,
                $request,
                [
                    'send_back_message' => $request->message,
                    'file_path' => $filePath,
                ]
            );
        }

        // Send email notifications
        try {
            // Collect all unique recipients (uploader + document recipients)
            $recipientsToNotify = collect();
            
            // Add document uploader if they exist and didn't send it back
            if ($document->uploader && $document->uploader->email && $document->uploader->id !== $user->id) {
                $recipientsToNotify->push($document->uploader);
            }
            
            // Add document recipients who didn't send it back
            foreach ($document->recipients as $recipient) {
                if ($recipient->email && $recipient->id !== $user->id) {
                    // Avoid duplicates if uploader is also a recipient
                    if (!$recipientsToNotify->contains('id', $recipient->id)) {
                        $recipientsToNotify->push($recipient);
                    }
                }
            }
            
            // Send email to all unique recipients
            foreach ($recipientsToNotify as $recipient) {
                Mail::to($recipient->email)->send(new DocumentSendBackMail($document, $sendBack));
            }
        } catch (\Exception $e) {
            // Log the error but don't fail the request
            \Log::error('Failed to send send back notification email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Document sent back successfully.',
            'send_back' => $sendBack
        ]);
    }
}
