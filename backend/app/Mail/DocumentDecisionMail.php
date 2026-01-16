<?php

namespace App\Mail;

use App\Models\Document;
use App\Models\DocumentDecision;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DocumentDecisionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $document;
    public $decision;
    public $actionLabel;

    public function __construct(Document $document, DocumentDecision $decision)
    {
        $this->document = $document->load('uploader');
        $this->decision = $decision->load('user.info');
        
        // Set action label for display
        switch ($decision->action) {
            case 'approve':
                $this->actionLabel = 'Approved';
                break;
            case 'reject':
                $this->actionLabel = 'Rejected';
                break;
            case 'hold':
                $this->actionLabel = 'On Hold';
                break;
            default:
                $this->actionLabel = ucfirst($decision->action);
        }
    }

    public function build()
    {
        $subject = "Document Decision: {$this->document->title} - {$this->actionLabel}";
        
        return $this->subject($subject)
            ->view('emails.document-decision');
    }
}
