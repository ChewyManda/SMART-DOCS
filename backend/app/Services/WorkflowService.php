<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Workflow;
use App\Models\WorkflowInstance;
use App\Models\WorkflowStep;
use App\Models\WorkflowStepInstance;
use App\Models\WorkflowStepAssignee;
use App\Models\User;
use App\Models\Notification;
use App\Services\AuditTrailService;
use Illuminate\Support\Facades\Log;

class WorkflowService
{
    /**
     * Automatically assign a workflow to a document based on its classification
     */
    public function assignWorkflowToDocument(Document $document, $workflowId = null)
    {
        // If workflow ID is provided, use it
        if ($workflowId) {
            $workflow = Workflow::active()->find($workflowId);
            if ($workflow) {
                return $this->createWorkflowInstance($document, $workflow);
            }
        }

        // Otherwise, find workflow by classification trigger
        if ($document->classification) {
            $workflow = Workflow::active()
                ->byTrigger('classification', $document->classification)
                ->first();

            if ($workflow) {
                return $this->createWorkflowInstance($document, $workflow);
            }
        }

        return null;
    }

    /**
     * Create a workflow instance for a document
     */
    public function createWorkflowInstance(Document $document, Workflow $workflow)
    {
        // Check if document already has an active workflow instance
        $existingInstance = WorkflowInstance::where('document_id', $document->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->first();

        if ($existingInstance) {
            return $existingInstance;
        }

        $instance = WorkflowInstance::create([
            'document_id' => $document->id,
            'workflow_id' => $workflow->id,
            'status' => 'pending',
            'started_at' => now(),
        ]);

        // Update document
        $document->workflow_instance_id = $instance->id;
        $document->workflow_status = 'pending';
        $document->save();

        // Log activity
        AuditTrailService::logModification(
            $document->id,
            auth()->id() ?? $document->uploaded_by,
            'workflow_assigned',
            null,
            $workflow->name,
            request(),
            ['workflow_id' => $workflow->id, 'instance_id' => $instance->id]
        );

        // Start the first step
        $this->startNextStep($instance);

        return $instance;
    }

    /**
     * Start the next step in a workflow instance
     */
    public function startNextStep(WorkflowInstance $instance)
    {
        $workflow = $instance->workflow;
        $steps = $workflow->steps;

        // Find the next step to execute
        $nextStep = null;
        if ($instance->current_step_id) {
            $currentStep = $steps->where('id', $instance->current_step_id)->first();
            $currentOrder = $currentStep ? $currentStep->step_order : 0;
            $nextStep = $steps->where('step_order', '>', $currentOrder)->first();
        } else {
            $nextStep = $steps->first();
        }

        if (!$nextStep) {
            // No more steps, complete the workflow
            $this->completeWorkflow($instance);
            return;
        }

        // Update instance current step
        $instance->current_step_id = $nextStep->id;
        $instance->status = 'in_progress';
        $instance->save();

        // Create step instances for all assignees
        $assignees = $nextStep->getAssignedUsers();
        
        if ($assignees->isEmpty()) {
            // No assignees, skip this step
            $this->completeStep($instance, $nextStep, null, 'skipped', 'No assignees configured');
            return;
        }

        foreach ($assignees as $assignee) {
            $dueAt = $nextStep->timeout_hours 
                ? now()->addHours($nextStep->timeout_hours) 
                : null;

            $stepInstance = WorkflowStepInstance::create([
                'workflow_instance_id' => $instance->id,
                'workflow_step_id' => $nextStep->id,
                'assigned_to' => $assignee->id,
                'status' => 'pending',
                'started_at' => now(),
                'due_at' => $dueAt,
            ]);

            // Create notification for assignee
            $this->notifyAssignee($assignee, $instance, $nextStep, $stepInstance);
        }

        // Log activity
        AuditTrailService::logModification(
            $instance->document_id,
            auth()->id() ?? $instance->document->uploaded_by,
            'workflow_step_started',
            null,
            $nextStep->name,
            request(),
            ['step_id' => $nextStep->id, 'instance_id' => $instance->id]
        );
    }

    /**
     * Complete a workflow step
     */
    public function completeStep(
        WorkflowInstance $instance,
        WorkflowStep $step,
        $userId,
        $action = 'approved',
        $comments = null
    ) {
        $stepInstances = WorkflowStepInstance::where('workflow_instance_id', $instance->id)
            ->where('workflow_step_id', $step->id)
            ->get();

        // Update the specific step instance
        $stepInstance = $stepInstances->where('assigned_to', $userId)->first();
        if ($stepInstance) {
            $stepInstance->status = $action;
            $stepInstance->comments = $comments;
            $stepInstance->completed_at = now();
            $stepInstance->save();
        }

        // Check if step is complete based on requirements
        $isStepComplete = false;
        
        if ($step->requires_all_assignees) {
            // All assignees must complete
            $completedCount = $stepInstances->whereIn('status', ['approved', 'rejected', 'skipped'])->count();
            $isStepComplete = $completedCount === $stepInstances->count();
        } else {
            // Any assignee can complete
            $hasApproved = $stepInstances->where('status', 'approved')->isNotEmpty();
            $hasRejected = $stepInstances->where('status', 'rejected')->isNotEmpty();
            
            if ($hasRejected && $step->is_required) {
                // Rejection in required step fails the workflow
                $this->failWorkflow($instance, 'Step rejected: ' . $step->name);
                return;
            }
            
            $isStepComplete = $hasApproved || ($hasRejected && !$step->is_required);
        }

        if ($isStepComplete) {
            // Check if step was rejected
            $hasRejection = $stepInstances->where('status', 'rejected')->isNotEmpty();
            
            if ($hasRejection && $step->is_required) {
                $this->failWorkflow($instance, 'Required step rejected: ' . $step->name);
                return;
            }

            // Move to next step
            $this->startNextStep($instance);
        }

        // Log activity
        AuditTrailService::logDecision(
            $instance->document_id,
            $userId,
            $action,
            $comments,
            request()
        );
    }

    /**
     * Complete the entire workflow
     */
    public function completeWorkflow(WorkflowInstance $instance, $notes = null)
    {
        $instance->status = 'completed';
        $instance->completed_at = now();
        if ($notes) {
            $instance->notes = $notes;
        }
        $instance->save();

        $document = $instance->document;
        $document->workflow_status = 'completed';
        $document->status = 'completed';
        $document->save();

        // Notify document uploader
        $this->notifyWorkflowCompletion($instance);

        // Log activity
        AuditTrailService::logModification(
            $document->id,
            auth()->id() ?? $document->uploaded_by,
            'workflow_completed',
            null,
            'completed',
            request(),
            ['workflow_id' => $instance->workflow_id, 'instance_id' => $instance->id]
        );
    }

    /**
     * Fail a workflow
     */
    public function failWorkflow(WorkflowInstance $instance, $reason = null)
    {
        $instance->status = 'failed';
        $instance->completed_at = now();
        if ($reason) {
            $instance->notes = $reason;
        }
        $instance->save();

        $document = $instance->document;
        $document->workflow_status = 'failed';
        $document->status = 'failed';
        $document->save();

        // Log activity
        AuditTrailService::logModification(
            $document->id,
            auth()->id() ?? $document->uploaded_by,
            'workflow_failed',
            null,
            'failed',
            request(),
            ['workflow_id' => $instance->workflow_id, 'instance_id' => $instance->id, 'reason' => $reason]
        );
    }

    /**
     * Cancel a workflow
     */
    public function cancelWorkflow(WorkflowInstance $instance, $reason = null)
    {
        $instance->status = 'cancelled';
        $instance->completed_at = now();
        if ($reason) {
            $instance->notes = $reason;
        }
        $instance->save();

        $document = $instance->document;
        $document->workflow_status = 'cancelled';
        $document->save();

        // Log activity
        AuditTrailService::logModification(
            $document->id,
            auth()->id() ?? $document->uploaded_by,
            'workflow_cancelled',
            null,
            'cancelled',
            request(),
            ['workflow_id' => $instance->workflow_id, 'instance_id' => $instance->id, 'reason' => $reason]
        );
    }

    /**
     * Notify assignee about workflow step
     */
    protected function notifyAssignee($user, $instance, $step, $stepInstance)
    {
        Notification::create([
            'user_id' => $user->id,
            'type' => 'workflow_assignment',
            'title' => 'Workflow Assignment: ' . $step->name,
            'message' => "You have been assigned to review/approve document: {$instance->document->title}",
            'related_document_id' => $instance->document_id,
            'is_read' => false,
        ]);
    }

    /**
     * Notify about workflow completion
     */
    protected function notifyWorkflowCompletion($instance)
    {
        $document = $instance->document;
        
        Notification::create([
            'user_id' => $document->uploaded_by,
            'type' => 'workflow_completed',
            'title' => 'Workflow Completed',
            'message' => "Workflow for document '{$document->title}' has been completed.",
            'related_document_id' => $document->id,
            'is_read' => false,
        ]);
    }

    /**
     * Get pending workflow steps for a user
     */
    public function getPendingStepsForUser($userId)
    {
        return WorkflowStepInstance::where('assigned_to', $userId)
            ->where('status', 'pending')
            ->with(['workflowInstance.document', 'workflowStep'])
            ->get();
    }
}
