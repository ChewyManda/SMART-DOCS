<?php

namespace App\Mail;

use App\Models\Document;
use App\Models\DocumentSendBack;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DocumentSendBackMail extends Mailable
{
    use Queueable, SerializesModels;

    public $document;
    public $sendBack;

    public function __construct(Document $document, DocumentSendBack $sendBack)
    {
        $this->document = $document->load('uploader');
        $this->sendBack = $sendBack->load('user.info');
    }

    public function build()
    {
        $subject = "Document Sent Back: {$this->document->title}";
        
        return $this->subject($subject)
            ->view('emails.document-send-back');
    }
}
