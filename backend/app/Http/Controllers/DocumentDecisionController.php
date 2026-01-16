<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Models\DocumentDecision;
use App\Mail\DocumentDecisionMail;
use Illuminate\Support\Facades\Mail;
use App\Services\AuditTrailService;

class DocumentDecisionController extends Controller
{
    public function store(Request $request, $documentId)
    {
        $request->validate([
            'action' => 'required|in:approve,reject,hold',
            'remarks' => 'nullable|string',
        ]);

        $user = $request->user();
        $document = Document::with(['uploader', 'recipients'])->findOrFail($documentId);

        $decision = DocumentDecision::updateOrCreate(
            [
                'document_id' => $document->id,
                'user_id' => $user->id,
            ],
            [
                'action' => $request->action,
                'remarks' => $request->remarks,
                'decided_at' => now(),
            ]
        );

        // Update document status
        $oldStatus = $document->status;
        switch ($request->action) {
            case 'approve':
                $document->status = 'completed';
                break;
            case 'reject':
                $document->status = 'failed';
                break;
            case 'hold':
                $document->status = 'on_hold';
                break;
        }

        $document->save();

        // Log decision with audit trail
        AuditTrailService::logDecision(
            $document->id,
            $user->id,
            $request->action,
            $request->remarks,
            $request
        );

        // Log status change separately for comprehensive audit trail
        if ($oldStatus !== $document->status) {
            AuditTrailService::logModification(
                $document->id,
                $user->id,
                'status',
                $oldStatus,
                $document->status,
                $request,
                [
                    'action' => $request->action,
                    'remarks' => $request->remarks,
                ]
            );
        }

        // Send email notifications
        try {
            // Load the decision with user relationship for email
            $decision->load('user');
            
            // Collect all unique recipients (uploader + document recipients)
            $recipientsToNotify = collect();
            
            // Add document uploader if they exist and didn't make the decision
            if ($document->uploader && $document->uploader->email && $document->uploader->id !== $user->id) {
                $recipientsToNotify->push($document->uploader);
            }
            
            // Add document recipients who didn't make the decision
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
                Mail::to($recipient->email)->send(new DocumentDecisionMail($document, $decision));
            }
        } catch (\Exception $e) {
            // Log the error but don't fail the request
            \Log::error('Failed to send decision notification email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Decision saved successfully.',
            'decision' => $decision,
        ]);
    }

    public function history($documentId)
{
    return \App\Models\DocumentDecision::with('user')
        ->where('document_id', $documentId)
        ->orderByDesc('decided_at')
        ->get();
}

public function decisionStatus($documentId)
{
    $decision = \App\Models\DocumentDecision::where('document_id', $documentId)
        ->orderByDesc('decided_at')
        ->first();

    return response()->json([
        'status' => $decision?->action // approve | reject | null
    ]);
}

public function hasDecision($documentId)
{
    $hasDecision = \App\Models\DocumentDecision::where('document_id', $documentId)
        ->exists();

    return response()->json([
        'hasDecision' => $hasDecision
    ]);
}





}
