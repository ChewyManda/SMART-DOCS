<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowStepAssignee extends Model
{
    protected $fillable = [
        'workflow_step_id',
        'user_id',
        'assignee_type',
        'assignee_value',
    ];

    public function workflowStep()
    {
        return $this->belongsTo(WorkflowStep::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
