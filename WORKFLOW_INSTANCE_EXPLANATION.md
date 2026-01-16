# Workflow Instance Explanation

## What is a Workflow Instance?

A **Workflow Instance** is a running execution of a workflow template for a specific document. Think of it like this:

- **Workflow** = Template/Blueprint (e.g., "Invoice Approval Process")
- **Workflow Instance** = Actual execution for a specific document (e.g., "Invoice #12345 is going through approval")

## The Relationship

```
Workflow (Template)
    ↓ (when document is uploaded/classified)
WorkflowInstance (Execution for Document #123)
    ↓ (tracks progress)
WorkflowStepInstances (Individual step completions)
```

## Where Instances Are Created

### 1. Automatic Creation (on Document Upload/Classification)
**Location:** `backend/app/Http/Controllers/DocumentController.php`

```php
// When document is uploaded with classification
if ($document->classification) {
    $workflowService = app(WorkflowService::class);
    $workflowService->assignWorkflowToDocument($document);
}
```

**Flow:**
1. Document uploaded with classification (e.g., "invoice")
2. System finds matching workflow (e.g., "Invoice Approval Workflow")
3. Creates a WorkflowInstance linking document to workflow
4. Starts the first step automatically

### 2. Manual Creation (Admin assigns workflow)
**Location:** `backend/app/Http/Controllers/WorkflowController.php`

```php
// POST /workflow/assign/{documentId}
public function assignToDocument(Request $request, $documentId)
{
    $instance = $this->workflowService->assignWorkflowToDocument($document, $workflow->id);
}
```

## What a WorkflowInstance Contains

**Database Table:** `workflow_instances`

| Field | Purpose |
|-------|---------|
| `document_id` | Which document is in this workflow |
| `workflow_id` | Which workflow template is being used |
| `status` | Current state: `pending`, `in_progress`, `completed`, `cancelled`, `failed` |
| `current_step_id` | Which step is currently active |
| `started_at` | When workflow started |
| `completed_at` | When workflow finished |

## How Instances Function

### Step 1: Instance Creation
```php
// In WorkflowService::createWorkflowInstance()
$instance = WorkflowInstance::create([
    'document_id' => $document->id,
    'workflow_id' => $workflow->id,
    'status' => 'pending',
    'started_at' => now(),
]);
```

### Step 2: Start First Step
```php
// Automatically starts the first step
$this->startNextStep($instance);
```

### Step 3: Create Step Instances
For each assignee in the step, a `WorkflowStepInstance` is created:
```php
WorkflowStepInstance::create([
    'workflow_instance_id' => $instance->id,
    'workflow_step_id' => $nextStep->id,
    'assigned_to' => $assignee->id,
    'status' => 'pending',
]);
```

### Step 4: Step Completion
When a user completes a step:
```php
// User approves/rejects step
$this->workflowService->completeStep($instance, $step, $userId, 'approved');
```

### Step 5: Progress to Next Step
```php
// Automatically moves to next step
$this->startNextStep($instance);
```

### Step 6: Workflow Completion
When all steps are done:
```php
$this->completeWorkflow($instance);
// Updates instance status to 'completed'
// Updates document status to 'completed'
```

## Example Flow

**Scenario:** Invoice document uploaded

1. **Document Uploaded**
   - Document ID: 123
   - Classification: "invoice"

2. **Instance Created**
   - WorkflowInstance ID: 1
   - Links Document #123 to "Invoice Approval Workflow"
   - Status: `pending`

3. **Step 1 Started**
   - WorkflowStepInstance #1 created
   - Assigned to: Manager A
   - Status: `pending`

4. **Manager A Approves**
   - WorkflowStepInstance #1 status: `approved`
   - Instance moves to Step 2

5. **Step 2 Started**
   - WorkflowStepInstance #2 created
   - Assigned to: Finance Team
   - Status: `pending`

6. **Finance Approves**
   - WorkflowStepInstance #2 status: `approved`
   - All steps complete

7. **Workflow Complete**
   - WorkflowInstance status: `completed`
   - Document status: `completed`

## Where to View Instances

### Backend API
```php
// Get instance for a document
GET /workflow/document/{documentId}

// Response:
{
    "instance": {
        "id": 1,
        "document_id": 123,
        "workflow_id": 5,
        "status": "in_progress",
        "current_step_id": 2,
        "workflow": { ... },
        "stepInstances": [ ... ]
    }
}
```

### Frontend Component
**Location:** `frontend/src/components/documents/documentview/WorkflowStatus.jsx`

This component:
- Fetches the workflow instance for a document
- Displays current step and progress
- Allows users to complete assigned steps

## Key Functions

### WorkflowService Methods

1. **`assignWorkflowToDocument()`** - Creates instance automatically
2. **`createWorkflowInstance()`** - Creates the instance record
3. **`startNextStep()`** - Moves workflow forward
4. **`completeStep()`** - Handles step completion
5. **`completeWorkflow()`** - Finalizes workflow

## Summary

**WorkflowInstance** = The running execution of a workflow for a specific document. It:
- Tracks which document is in the workflow
- Tracks which workflow template is being used
- Tracks current progress (which step is active)
- Manages the lifecycle (pending → in_progress → completed)
- Links to individual step executions (WorkflowStepInstances)

Think of it as the "active process" for a document going through approval/review.
