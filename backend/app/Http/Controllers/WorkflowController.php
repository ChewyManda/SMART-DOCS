<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Workflow;
use App\Models\WorkflowStep;
use App\Models\WorkflowStepAssignee;
use App\Models\WorkflowInstance;
use App\Models\WorkflowStepInstance;
use App\Models\Document;
use App\Services\WorkflowService;
use App\Services\AuditTrailService;

class WorkflowController extends Controller
{
    protected $workflowService;

    public function __construct(WorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    /**
     * Get all workflows
     */
    public function index(Request $request)
    {
        $query = Workflow::with(['steps.assignees']);

        if ($request->has('active')) {
            $query->where('is_active', $request->active);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $workflows = $query->orderBy('priority', 'desc')->orderBy('created_at', 'desc')->get();

        return response()->json($workflows);
    }

    /**
     * Get a single workflow
     */
    public function show($id)
    {
        $workflow = Workflow::with(['steps.assignees'])->findOrFail($id);
        return response()->json($workflow);
    }

    /**
     * Create a new workflow
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:approval,review,processing',
            'trigger_type' => 'required|in:classification,manual',
            'trigger_value' => 'nullable|string',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0',
            'steps' => 'required|array|min:1',
            'steps.*.name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.step_order' => 'required|integer|min:0',
            'steps.*.step_type' => 'required|in:approval,review,processing',
            'steps.*.is_required' => 'boolean',
            'steps.*.requires_all_assignees' => 'boolean',
            'steps.*.timeout_hours' => 'nullable|integer|min:1',
            'steps.*.assignees' => 'required|array|min:1',
        ]);

        $user = $request->user();

        $workflow = Workflow::create([
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type,
            'trigger_type' => $request->trigger_type,
            'trigger_value' => $request->trigger_value,
            'is_active' => $request->input('is_active', true),
            'priority' => $request->input('priority', 0),
        ]);

        // Create steps
        foreach ($request->steps as $stepData) {
            $step = WorkflowStep::create([
                'workflow_id' => $workflow->id,
                'name' => $stepData['name'],
                'description' => $stepData['description'] ?? null,
                'step_order' => $stepData['step_order'],
                'step_type' => $stepData['step_type'],
                'is_required' => $stepData['is_required'] ?? true,
                'requires_all_assignees' => $stepData['requires_all_assignees'] ?? false,
                'timeout_hours' => $stepData['timeout_hours'] ?? null,
                'conditions' => $stepData['conditions'] ?? null,
            ]);

            // Create assignees
            foreach ($stepData['assignees'] as $assigneeData) {
                WorkflowStepAssignee::create([
                    'workflow_step_id' => $step->id,
                    'user_id' => $assigneeData['user_id'] ?? null,
                    'assignee_type' => $assigneeData['assignee_type'] ?? 'user',
                    'assignee_value' => $assigneeData['assignee_value'] ?? null,
                ]);
            }
        }

        return response()->json([
            'message' => 'Workflow created successfully',
            'workflow' => $workflow->load(['steps.assignees']),
        ], 201);
    }

    /**
     * Update a workflow
     */
    public function update(Request $request, $id)
    {
        $workflow = Workflow::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|in:approval,review,processing',
            'trigger_type' => 'sometimes|required|in:classification,manual',
            'trigger_value' => 'nullable|string',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0',
        ]);

        $workflow->update($request->only([
            'name', 'description', 'type', 'trigger_type', 'trigger_value', 'is_active', 'priority'
        ]));

        return response()->json([
            'message' => 'Workflow updated successfully',
            'workflow' => $workflow->load(['steps.assignees']),
        ]);
    }

    /**
     * Delete a workflow
     */
    public function destroy($id)
    {
        $workflow = Workflow::findOrFail($id);

        // Check if workflow has active instances
        $activeInstances = WorkflowInstance::where('workflow_id', $workflow->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();

        if ($activeInstances > 0) {
            return response()->json([
                'error' => 'Cannot delete workflow with active instances',
            ], 400);
        }

        $workflow->delete();

        return response()->json([
            'message' => 'Workflow deleted successfully',
        ]);
    }

    /**
     * Assign workflow to a document
     */
    public function assignToDocument(Request $request, $documentId)
    {
        $request->validate([
            'workflow_id' => 'required|exists:workflows,id',
        ]);

        $document = Document::findOrFail($documentId);
        $workflow = Workflow::active()->findOrFail($request->workflow_id);

        $instance = $this->workflowService->assignWorkflowToDocument($document, $workflow->id);

        return response()->json([
            'message' => 'Workflow assigned successfully',
            'instance' => $instance->load(['workflow', 'currentStep', 'stepInstances.assignedUser']),
        ]);
    }

    /**
     * Get workflow instance for a document
     */
    public function getDocumentWorkflow($documentId)
    {
        $document = Document::findOrFail($documentId);
        
        $instance = WorkflowInstance::where('document_id', $documentId)
            ->with(['workflow', 'currentStep', 'stepInstances.workflowStep', 'stepInstances.assignedUser'])
            ->first();

        if (!$instance) {
            return response()->json([
                'message' => 'No workflow assigned to this document',
                'instance' => null,
            ]);
        }

        return response()->json([
            'instance' => $instance,
        ]);
    }

    /**
     * Complete a workflow step
     */
    public function completeStep(Request $request, $instanceId, $stepInstanceId)
    {
        $request->validate([
            'action' => 'required|in:approved,rejected,skipped',
            'comments' => 'nullable|string',
        ]);

        $stepInstance = WorkflowStepInstance::with(['workflowInstance', 'workflowStep'])
            ->findOrFail($stepInstanceId);

        if ($stepInstance->workflow_instance_id != $instanceId) {
            return response()->json(['error' => 'Step instance does not belong to this workflow instance'], 400);
        }

        $user = $request->user();
        
        // Verify user is assigned to this step
        if ($stepInstance->assigned_to != $user->id) {
            return response()->json(['error' => 'You are not assigned to this step'], 403);
        }

        // Verify step is still pending
        if (!$stepInstance->isPending()) {
            return response()->json(['error' => 'Step has already been completed'], 400);
        }

        $this->workflowService->completeStep(
            $stepInstance->workflowInstance,
            $stepInstance->workflowStep,
            $user->id,
            $request->action,
            $request->comments
        );

        $instance = $stepInstance->workflowInstance->fresh(['workflow', 'currentStep', 'stepInstances.workflowStep', 'stepInstances.assignedUser']);

        return response()->json([
            'message' => 'Step completed successfully',
            'instance' => $instance,
        ]);
    }

    /**
     * Get pending workflow steps for current user
     */
    public function getMyPendingSteps(Request $request)
    {
        $user = $request->user();
        $steps = $this->workflowService->getPendingStepsForUser($user->id);

        return response()->json($steps);
    }

    /**
     * Cancel a workflow instance
     */
    public function cancelWorkflow(Request $request, $instanceId)
    {
        $request->validate([
            'reason' => 'nullable|string',
        ]);

        $instance = WorkflowInstance::findOrFail($instanceId);
        $user = $request->user();

        // Check permissions (only admin/staff or document uploader can cancel)
        $canCancel = $user->isStaff() || $instance->document->uploaded_by == $user->id;

        if (!$canCancel) {
            return response()->json(['error' => 'You do not have permission to cancel this workflow'], 403);
        }

        $this->workflowService->cancelWorkflow($instance, $request->reason);

        return response()->json([
            'message' => 'Workflow cancelled successfully',
            'instance' => $instance->fresh(['workflow', 'currentStep']),
        ]);
    }

    /**
     * Update workflow step (add/remove assignees, update settings)
     */
    public function updateStep(Request $request, $workflowId, $stepId)
    {
        $workflow = Workflow::findOrFail($workflowId);
        $step = WorkflowStep::where('workflow_id', $workflowId)->findOrFail($stepId);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'step_order' => 'sometimes|integer|min:0',
            'step_type' => 'sometimes|in:approval,review,processing',
            'is_required' => 'boolean',
            'requires_all_assignees' => 'boolean',
            'timeout_hours' => 'nullable|integer|min:1',
            'assignees' => 'sometimes|array',
        ]);

        $step->update($request->only([
            'name', 'description', 'step_order', 'step_type', 'is_required', 
            'requires_all_assignees', 'timeout_hours', 'conditions'
        ]));

        // Update assignees if provided
        if ($request->has('assignees')) {
            $step->assignees()->delete();
            foreach ($request->assignees as $assigneeData) {
                WorkflowStepAssignee::create([
                    'workflow_step_id' => $step->id,
                    'user_id' => $assigneeData['user_id'] ?? null,
                    'assignee_type' => $assigneeData['assignee_type'] ?? 'user',
                    'assignee_value' => $assigneeData['assignee_value'] ?? null,
                ]);
            }
        }

        return response()->json([
            'message' => 'Step updated successfully',
            'step' => $step->load('assignees'),
        ]);
    }

    /**
     * Add a step to a workflow
     */
    public function addStep(Request $request, $workflowId)
    {
        $workflow = Workflow::findOrFail($workflowId);

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'step_order' => 'required|integer|min:0',
            'step_type' => 'required|in:approval,review,processing',
            'is_required' => 'boolean',
            'requires_all_assignees' => 'boolean',
            'timeout_hours' => 'nullable|integer|min:1',
            'assignees' => 'required|array|min:1',
        ]);

        $step = WorkflowStep::create([
            'workflow_id' => $workflow->id,
            'name' => $request->name,
            'description' => $request->description ?? null,
            'step_order' => $request->step_order,
            'step_type' => $request->step_type,
            'is_required' => $request->input('is_required', true),
            'requires_all_assignees' => $request->input('requires_all_assignees', false),
            'timeout_hours' => $request->timeout_hours ?? null,
            'conditions' => $request->conditions ?? null,
        ]);

        // Create assignees
        foreach ($request->assignees as $assigneeData) {
            WorkflowStepAssignee::create([
                'workflow_step_id' => $step->id,
                'user_id' => $assigneeData['user_id'] ?? null,
                'assignee_type' => $assigneeData['assignee_type'] ?? 'user',
                'assignee_value' => $assigneeData['assignee_value'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Step added successfully',
            'step' => $step->load('assignees'),
        ], 201);
    }

    /**
     * Delete a step from a workflow
     */
    public function deleteStep($workflowId, $stepId)
    {
        $workflow = Workflow::findOrFail($workflowId);
        $step = WorkflowStep::where('workflow_id', $workflowId)->findOrFail($stepId);

        // Check if step is used in any active instances
        $activeStepInstances = WorkflowStepInstance::where('workflow_step_id', $stepId)
            ->whereHas('workflowInstance', function ($q) {
                $q->whereIn('status', ['pending', 'in_progress']);
            })
            ->count();

        if ($activeStepInstances > 0) {
            return response()->json([
                'error' => 'Cannot delete step that is used in active workflow instances',
            ], 400);
        }

        $step->delete();

        return response()->json([
            'message' => 'Step deleted successfully',
        ]);
    }
}
