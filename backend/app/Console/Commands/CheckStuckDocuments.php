<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Document;
use App\Models\Notification;
use App\Mail\StuckDocumentReminderMail;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class CheckStuckDocuments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:check-stuck';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for documents stuck in pending or on_hold status for 3+ days and send reminders';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for stuck documents...');

        // Calculate the date 3 days ago
        $threeDaysAgo = Carbon::now()->subDays(3);

        // Find documents that are pending or on_hold and were created 3+ days ago
        // (A document created 3+ days ago that's still pending/on_hold is definitely stuck)
        $stuckDocuments = Document::whereIn('status', ['pending', 'on_hold'])
            ->where('created_at', '<=', $threeDaysAgo)
            ->with(['uploader', 'recipients'])
            ->get();

        if ($stuckDocuments->isEmpty()) {
            $this->info('No stuck documents found.');
            return 0;
        }

        $this->info("Found {$stuckDocuments->count()} stuck document(s).");

        $notifiedCount = 0;
        $emailCount = 0;

        foreach ($stuckDocuments as $document) {
            // Calculate days stuck (from creation date)
            $daysStuck = Carbon::now()->diffInDays($document->created_at);

            // Collect users to notify (uploader + recipients)
            $usersToNotify = collect();

            // Add uploader
            if ($document->uploader && $document->uploader->email) {
                $usersToNotify->push($document->uploader);
            }

            // Add recipients
            foreach ($document->recipients as $recipient) {
                if ($recipient->email && !$usersToNotify->contains('id', $recipient->id)) {
                    $usersToNotify->push($recipient);
                }
            }

            if ($usersToNotify->isEmpty()) {
                $this->warn("Document {$document->document_id} has no users to notify.");
                continue;
            }

            // Send notifications and emails to each user
            foreach ($usersToNotify as $user) {
                try {
                    // Create notification
                    Notification::create([
                        'user_id' => $user->id,
                        'title' => 'Document Stuck in ' . ucfirst(str_replace('_', ' ', $document->status)),
                        'message' => "Document '{$document->title}' (ID: {$document->document_id}) has been stuck in {$document->status} status for {$daysStuck} day(s). Please review and take action.",
                        'type' => 'alert',
                        'data' => json_encode([
                            'document_id' => $document->id,
                            'document_title' => $document->title,
                            'document_id_code' => $document->document_id,
                            'status' => $document->status,
                            'days_stuck' => $daysStuck,
                        ]),
                    ]);
                    $notifiedCount++;

                    // Send email
                    Mail::to($user->email)->send(new StuckDocumentReminderMail($document, $daysStuck));
                    $emailCount++;

                } catch (\Exception $e) {
                    $this->error("Failed to notify user {$user->email} for document {$document->document_id}: " . $e->getMessage());
                    \Log::error('Failed to send stuck document reminder', [
                        'document_id' => $document->id,
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $this->info("Sent {$notifiedCount} notification(s) and {$emailCount} email(s).");
        return 0;
    }
}
