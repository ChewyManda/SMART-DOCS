<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserInfo extends Model
{
    use HasFactory;

    // Specify the table name
    protected $table = 'user_info';

    // Allow mass assignment
    protected $fillable = [
        'user_id',
        'access_level',
        'department_id',
        'position_id',
        'first_name',
        'middle_name',
        'last_name',
        'phone_number',
        'profile_picture',
    ];

    /**
     * Relationship: UserInfo belongs to a User
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Relationship: UserInfo belongs to a Department
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    /**
     * Relationship: UserInfo belongs to a Position
     */
    public function position()
    {
        return $this->belongsTo(Position::class, 'position_id');
    }

    /**
     * Get the profile picture URL
     */
    public function getProfilePictureUrlAttribute()
    {
        return $this->profile_picture ? asset('storage/' . $this->profile_picture) : null;
    }
}
