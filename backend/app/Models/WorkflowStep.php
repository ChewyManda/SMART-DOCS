<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkflowStep extends Model
{
    protected $fillable = [
        'workflow_id',
        'name',
        'description',
        'step_order',
        'step_type',
        'is_required',
        'requires_all_assignees',
        'timeout_hours',
        'conditions',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'requires_all_assignees' => 'boolean',
        'timeout_hours' => 'integer',
        'step_order' => 'integer',
        'conditions' => 'array',
    ];

    public function workflow()
    {
        return $this->belongsTo(Workflow::class);
    }

    public function assignees()
    {
        return $this->hasMany(WorkflowStepAssignee::class);
    }

    public function stepInstances()
    {
        return $this->hasMany(WorkflowStepInstance::class);
    }

    public function getAssignedUsers()
    {
        $users = collect();
        
        foreach ($this->assignees as $assignee) {
            if ($assignee->assignee_type === 'user' && $assignee->user_id) {
                $users->push($assignee->user);
            } elseif ($assignee->assignee_type === 'role') {
                $roleUsers = \App\Models\User::where('role', $assignee->assignee_value)->get();
                $users = $users->merge($roleUsers);
            } elseif ($assignee->assignee_type === 'department') {
                $deptUsers = \App\Models\User::where('department', $assignee->assignee_value)->get();
                $users = $users->merge($deptUsers);
            }
        }
        
        return $users->unique('id');
    }
}
