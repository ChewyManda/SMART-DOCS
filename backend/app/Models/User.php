<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\ResetPasswordNotification;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'email',
        'user_id',
        'password',
        'role',
        'department',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    // ======================================================
    // RELATIONSHIPS
    // ======================================================
    public function uploadedDocuments()
    {
        return $this->hasMany(Document::class, 'uploaded_by');
    }

    public function receivedDocuments()
    {
        return $this->belongsToMany(Document::class, 'document_recipients')
            ->withPivot('is_acknowledged', 'acknowledged_at', 'is_viewed', 'viewed_at')
            ->withTimestamps();
    }

    public function activities()
    {
        return $this->hasMany(DocumentActivity::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get the department this user belongs to
     */
    public function departmentRelation()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    // ======================================================
    // RELATIONSHIP TO USER INFO
    // ======================================================
    public function info()
    {
        return $this->hasOne(UserInfo::class, 'user_id', 'id');
    }

    // ======================================================
    // HELPERS
    // ======================================================
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isStaff()
    {
        return $this->role === 'staff' || $this->role === 'admin';
    }

    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordNotification($token, $this->email));
    }

    // ======================================================
    // FIX FOR DROPPED NAME COLUMN (FIRST + LAST ONLY)
    // ======================================================
    protected $appends = ['name', 'profile_picture', 'access_level']; // include in JSON automatically

    public function getNameAttribute()
    {
        if ($this->info) {
            return trim($this->info->first_name . ' ' . $this->info->last_name);
        }
        return 'Unknown';
    }

    /**
     * Get the profile picture URL from user_info
     */
    public function getProfilePictureAttribute()
    {
        if ($this->info && $this->info->profile_picture) {
            return asset('storage/' . $this->info->profile_picture);
        }
        return null;
    }

    /**
     * Get access_level from user_info relationship
     */
    public function getAccessLevelAttribute()
    {
        return $this->info ? (int)($this->info->access_level ?? 1) : 1;
    }
}
