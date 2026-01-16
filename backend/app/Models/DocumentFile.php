<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentFile extends Model
{
    use HasFactory;

    protected $table = 'document_files';

    protected $fillable = [
        'document_id',
        'file_path',
        'file_type',
        'file_size',
        'ocr_text',
    ];

    /**
     * Relation to the parent Document
     */
    public function document()
    {
        return $this->belongsTo(Document::class, 'document_id');
    }
}
