<?php

namespace App\Mail;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StuckDocumentReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public $document;
    public $daysStuck;
    public $statusLabel;

    /**
     * Create a new message instance.
     */
    public function __construct(Document $document, int $daysStuck)
    {
        $this->document = $document->load('uploader');
        $this->daysStuck = $daysStuck;
        $this->statusLabel = ucfirst(str_replace('_', ' ', $document->status));
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $subject = "Reminder: Document Stuck in {$this->statusLabel} - {$this->document->title}";
        
        return $this->subject($subject)
            ->view('emails.stuck-document-reminder');
    }
}
