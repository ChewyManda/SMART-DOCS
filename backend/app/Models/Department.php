<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Department extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'head_user_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the department head (user)
     */
    public function head()
    {
        return $this->belongsTo(User::class, 'head_user_id');
    }

    /**
     * Get all user info records in this department
     */
    public function userInfos()
    {
        return $this->hasMany(UserInfo::class, 'department_id');
    }

    /**
     * Get all users in this department through user_info
     */
    public function users()
    {
        return User::whereHas('info', function ($query) {
            $query->where('department_id', $this->id);
        });
    }

    /**
     * Get the count of users in this department
     */
    public function getUsersCountAttribute()
    {
        return UserInfo::where('department_id', $this->id)->count();
    }

    /**
     * Scope a query to only include active departments.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include inactive departments.
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }
}
