<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentActivity extends Model
{
    protected $fillable = [
        'document_id',
        'user_id',
        'activity_type',
        'details',
        'ip_address',
        'user_agent',
        'old_value',
        'new_value',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
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
