<?php

namespace App\Services;

use App\Models\DocumentActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuditTrailService
{
    /**
     * Log a document activity with comprehensive audit trail information
     *
     * @param int $documentId
     * @param int $userId
     * @param string $activityType
     * @param string|null $details
     * @param Request|null $request
     * @param string|null $oldValue
     * @param string|null $newValue
     * @param array|null $metadata
     * @return DocumentActivity
     */
    public static function log(
        int $documentId,
        int $userId,
        string $activityType,
        ?string $details = null,
        ?Request $request = null,
        ?string $oldValue = null,
        ?string $newValue = null,
        ?array $metadata = null
    ): DocumentActivity {
        try {
            $ipAddress = $request ? $request->ip() : null;
            $userAgent = $request ? $request->userAgent() : null;

            return DocumentActivity::create([
                'document_id' => $documentId,
                'user_id' => $userId,
                'activity_type' => $activityType,
                'details' => $details,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'metadata' => $metadata,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the operation
            Log::error('Failed to create audit trail: ' . $e->getMessage(), [
                'document_id' => $documentId,
                'user_id' => $userId,
                'activity_type' => $activityType,
            ]);
            
            // Return a dummy activity to prevent errors
            return new DocumentActivity();
        }
    }

    /**
     * Log document modification with before/after values
     *
     * @param int $documentId
     * @param int $userId
     * @param string $field
     * @param mixed $oldValue
     * @param mixed $newValue
     * @param Request|null $request
     * @param array|null $additionalMetadata
     * @return DocumentActivity
     */
    public static function logModification(
        int $documentId,
        int $userId,
        string $field,
        $oldValue,
        $newValue,
        ?Request $request = null,
        ?array $additionalMetadata = null
    ): DocumentActivity {
        $activityType = match($field) {
            'title' => 'title_updated',
            'description' => 'description_updated',
            'classification' => 'classification_updated',
            'status' => 'status_changed',
            default => 'modified',
        };

        $details = "Document {$field} changed";
        if ($field === 'status') {
            $details = "Document status changed from '{$oldValue}' to '{$newValue}'";
        } elseif ($field === 'classification') {
            $details = "Document classification changed from '{$oldValue}' to '{$newValue}'";
        } else {
            $details = "Document {$field} updated";
        }

        $metadata = array_merge([
            'field' => $field,
            'changed_at' => now()->toIso8601String(),
        ], $additionalMetadata ?? []);

        return self::log(
            $documentId,
            $userId,
            $activityType,
            $details,
            $request,
            is_string($oldValue) ? $oldValue : json_encode($oldValue),
            is_string($newValue) ? $newValue : json_encode($newValue),
            $metadata
        );
    }

    /**
     * Log document approval/rejection/hold decision
     *
     * @param int $documentId
     * @param int $userId
     * @param string $action (approve, reject, hold)
     * @param string|null $remarks
     * @param Request|null $request
     * @return DocumentActivity
     */
    public static function logDecision(
        int $documentId,
        int $userId,
        string $action,
        ?string $remarks = null,
        ?Request $request = null
    ): DocumentActivity {
        $activityType = match($action) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'hold' => 'held',
            default => 'modified',
        };

        $details = "Document {$action}d";
        if ($remarks) {
            $details .= ": {$remarks}";
        }

        $metadata = [
            'action' => $action,
            'remarks' => $remarks,
            'decided_at' => now()->toIso8601String(),
        ];

        return self::log(
            $documentId,
            $userId,
            $activityType,
            $details,
            $request,
            null,
            $action,
            $metadata
        );
    }

    /**
     * Log document forwarding
     *
     * @param int $documentId
     * @param int $userId
     * @param int $recipientId
     * @param string $recipientEmail
     * @param string|null $message
     * @param Request|null $request
     * @return DocumentActivity
     */
    public static function logForward(
        int $documentId,
        int $userId,
        int $recipientId,
        string $recipientEmail,
        ?string $message = null,
        ?Request $request = null
    ): DocumentActivity {
        $details = "Document forwarded to {$recipientEmail}";
        if ($message) {
            $details .= ": {$message}";
        }

        $metadata = [
            'recipient_id' => $recipientId,
            'recipient_email' => $recipientEmail,
            'message' => $message,
            'forwarded_at' => now()->toIso8601String(),
        ];

        return self::log(
            $documentId,
            $userId,
            'forwarded',
            $details,
            $request,
            null,
            $recipientEmail,
            $metadata
        );
    }

    /**
     * Log document send back
     *
     * @param int $documentId
     * @param int $userId
     * @param string $message
     * @param string|null $filePath
     * @param Request|null $request
     * @return DocumentActivity
     */
    public static function logSendBack(
        int $documentId,
        int $userId,
        string $message,
        ?string $filePath = null,
        ?Request $request = null
    ): DocumentActivity {
        $details = "Document sent back: {$message}";
        
        $metadata = [
            'message' => $message,
            'file_path' => $filePath,
            'sent_back_at' => now()->toIso8601String(),
        ];

        return self::log(
            $documentId,
            $userId,
            'sent_back',
            $details,
            $request,
            null,
            $message,
            $metadata
        );
    }

    /**
     * Log document deletion
     *
     * @param int $documentId
     * @param int $userId
     * @param array|null $documentData
     * @param Request|null $request
     * @return DocumentActivity
     */
    public static function logDeletion(
        int $documentId,
        int $userId,
        ?array $documentData = null,
        ?Request $request = null
    ): DocumentActivity {
        $details = "Document deleted";
        if ($documentData && isset($documentData['title'])) {
            $details .= ": {$documentData['title']}";
        }

        $metadata = [
            'document_data' => $documentData,
            'deleted_at' => now()->toIso8601String(),
        ];

        return self::log(
            $documentId,
            $userId,
            'deleted',
            $details,
            $request,
            json_encode($documentData),
            null,
            $metadata
        );
    }

    /**
     * Log recipient addition
     *
     * @param int $documentId
     * @param int $userId
     * @param int $recipientId
     * @param string $recipientEmail
     * @param Request|null $request
     * @return DocumentActivity
     */
    public static function logRecipientAdded(
        int $documentId,
        int $userId,
        int $recipientId,
        string $recipientEmail,
        ?Request $request = null
    ): DocumentActivity {
        $details = "Recipient added: {$recipientEmail}";

        $metadata = [
            'recipient_id' => $recipientId,
            'recipient_email' => $recipientEmail,
            'added_at' => now()->toIso8601String(),
        ];

        return self::log(
            $documentId,
            $userId,
            'recipient_added',
            $details,
            $request,
            null,
            $recipientEmail,
            $metadata
        );
    }
}
