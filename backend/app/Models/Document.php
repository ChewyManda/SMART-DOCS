<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'title',
        'document_id',
        'file_path',
        'file_type',
        'file_size',
        'description',
        'uploaded_by',
        'ocr_text',
        'is_ocr_processed',
        'qr_code_path',
        'paper_id',
    ];

    protected $casts = [
        'is_ocr_processed' => 'boolean',
        'file_size' => 'integer',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function recipients()
    {
        return $this->belongsToMany(User::class, 'document_recipients')
            ->withPivot('is_acknowledged', 'acknowledged_at', 'is_viewed', 'viewed_at')
            ->withTimestamps();
    }

    public function activities()
    {
        return $this->hasMany(DocumentActivity::class);
    }

    public static function generateDocumentId()
    {
        return 'DOC-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
    }

    public static function generatePaperId()
    {
        return 'PID-' . strtoupper(uniqid());
    }
}


