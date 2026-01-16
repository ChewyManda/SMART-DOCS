<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowStepInstance extends Model
{
    protected $fillable = [
        'workflow_instance_id',
        'workflow_step_id',
        'assigned_to',
        'status',
        'comments',
        'started_at',
        'completed_at',
        'due_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'due_at' => 'datetime',
    ];

    public function workflowInstance()
    {
        return $this->belongsTo(WorkflowInstance::class);
    }

    public function workflowStep()
    {
        return $this->belongsTo(WorkflowStep::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isCompleted()
    {
        return in_array($this->status, ['approved', 'rejected', 'skipped']);
    }

    public function isApproved()
    {
        return $this->status === 'approved';
    }

    public function isRejected()
    {
        return $this->status === 'rejected';
    }
}
