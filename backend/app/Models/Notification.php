<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Mail\NotificationReceivedMail;
use Illuminate\Support\Facades\Mail;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',
        'is_read',
        'read_at',
        'data',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Automatically send email when notification is created
     */
    protected static function booted()
    {
        static::created(function ($notification) {
            // Load user relationship if not already loaded
            if (!$notification->relationLoaded('user')) {
                $notification->load('user');
            }
            
            // Prevent crash if user or email is missing
            if (!$notification->user || !$notification->user->email) {
                \Log::warning('Notification created but user or email missing', [
                    'notification_id' => $notification->id,
                    'user_id' => $notification->user_id
                ]);
                return;
            }

            try {
                // Send email immediately (use send() instead of queue() for immediate delivery)
                Mail::to($notification->user->email)
                    ->send(new NotificationReceivedMail($notification));
            } catch (\Exception $e) {
                // Log the error but don't fail the notification creation
                \Log::error('Failed to send notification email: ' . $e->getMessage(), [
                    'notification_id' => $notification->id,
                    'user_email' => $notification->user->email,
                    'error' => $e->getMessage()
                ]);
            }
        });
    }
}
