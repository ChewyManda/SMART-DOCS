<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Workflow extends Model
{
    protected $fillable = [
        'name',
        'description',
        'type',
        'trigger_type',
        'trigger_value',
        'is_active',
        'priority',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'priority' => 'integer',
    ];

    public function steps()
    {
        return $this->hasMany(WorkflowStep::class)->orderBy('step_order');
    }

    public function instances()
    {
        return $this->hasMany(WorkflowInstance::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByTrigger($query, $triggerType, $triggerValue = null)
    {
        return $query->where('trigger_type', $triggerType)
            ->where(function ($q) use ($triggerValue) {
                if ($triggerValue) {
                    $q->where('trigger_value', $triggerValue)
                      ->orWhereNull('trigger_value');
                } else {
                    $q->whereNull('trigger_value');
                }
            })
            ->orderBy('priority', 'desc');
    }
}
