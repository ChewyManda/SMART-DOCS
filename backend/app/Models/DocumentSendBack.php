<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentSendBack extends Model
{
    use HasFactory;

    protected $table = 'document_send_backs'; // replace with your table name exactly
    protected $fillable = [
        'document_id',
        'user_id',
        'message',
        'file_path'
    ];

    // Relationships
    public function document()
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
