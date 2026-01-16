<?php

namespace App\Mail;

use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NotificationReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $notification;

    public function __construct(Notification $notification)
    {
        $this->notification = $notification->load('user.info');
    }

    public function build()
    {
        // Customize subject based on notification type
        $subject = 'You have a new notification';
        
        if ($this->notification->type === 'document') {
            $data = is_string($this->notification->data) 
                ? json_decode($this->notification->data, true) 
                : $this->notification->data;
            
            if (isset($data['forwarded_by_email'])) {
                $subject = 'Document Forwarded to You';
            } else {
                $subject = 'New Document Notification';
            }
        }
        
        return $this->subject($subject)
            ->view('emails.notification-received');
    }
}
