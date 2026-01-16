<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Position extends Model
{
    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * Get all users with this position
     */
    public function users()
    {
        return $this->hasMany(UserInfo::class, 'position_id');
    }
}
