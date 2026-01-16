<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends Notification
{
    public $token;
    public $email;

    public function __construct($token, $email)
    {
        $this->token = $token;
        $this->email = $email;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        // URL that user clicks to reset password in your React app
        $url = url(config('app.frontend_url') . "/reset-password?token={$this->token}&email={$this->email}");

        return (new MailMessage)
            ->subject('Reset Your SMART-DOCS Password')
            ->view('emails.reset-password', ['url' => $url]); // custom Blade view
    }
}
