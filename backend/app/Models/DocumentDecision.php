<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentDecision extends Model
{
    protected $fillable = [
        'document_id',
        'user_id',
        'action',
        'remarks',
        'decided_at',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
