<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'title',
        'document_id',
        'description',
        'uploaded_by',
        'qr_code_path',
        'paper_id',
        'classification',
        'classification_confidence',
        'classification_method',
        'workflow_instance_id',
        'workflow_status',
        'is_validated',
        'validation_confidence',
        'validated_at',
        'validation_results',
    ];

    protected $casts = [
        'is_ocr_processed' => 'boolean',
        'file_size' => 'integer',
        'is_validated' => 'boolean',
        'validation_confidence' => 'decimal:2',
        'validated_at' => 'datetime',
        'validation_results' => 'array',
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

    public function files()
    {
        return $this->hasMany(DocumentFile::class);
    }

    public function decisions()
    {
        return $this->hasMany(DocumentDecision::class);
    }

    public function workflowInstance()
    {
        return $this->belongsTo(WorkflowInstance::class);
    }

}


