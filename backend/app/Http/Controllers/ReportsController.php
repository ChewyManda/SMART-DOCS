<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowInstance;
use App\Models\DocumentDecision;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportsController extends Controller
{
    /**
     * Get reports data based on type and date range
     */
    public function getReport(Request $request)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'type' => 'required|in:documents,users,workflows,compliance',
            'date_range' => 'required|in:week,month,quarter,year',
            'page' => 'nullable|integer|min:1'
        ]);

        $dateRange = $this->getDateRange($request->date_range);
        $type = $request->type;
        $page = $request->input('page', 1);

        switch ($type) {
            case 'documents':
                return response()->json($this->getDocumentsReport($dateRange, $page));
            case 'users':
                return response()->json($this->getUsersReport($dateRange, $page));
            case 'workflows':
                return response()->json($this->getWorkflowsReport($dateRange, $page));
            case 'compliance':
                return response()->json($this->getComplianceReport($dateRange, $page));
            default:
                return response()->json(['error' => 'Invalid report type'], 400);
        }
    }

    /**
     * Get date range based on period
     */
    private function getDateRange($period)
    {
        $now = Carbon::now();
        switch ($period) {
            case 'week':
                return [$now->copy()->subDays(7), $now];
            case 'month':
                return [$now->copy()->subDays(30), $now];
            case 'quarter':
                return [$now->copy()->subDays(90), $now];
            case 'year':
                return [$now->copy()->subYear(), $now];
            default:
                return [$now->copy()->subDays(30), $now];
        }
    }

    /**
     * Get documents report
     */
    private function getDocumentsReport($dateRange, $page = 1)
    {
        [$dateFrom, $dateTo] = $dateRange;

        // Get summary statistics
        $total = Document::whereBetween('created_at', [$dateFrom, $dateTo])->count();
        
        // Get approved documents (documents with approve decision)
        $approved = Document::whereBetween('created_at', [$dateFrom, $dateTo])
            ->whereHas('decisions', function($query) {
                $query->where('action', 'approve');
            })
            ->count();

        // Get pending documents (documents without decisions or with workflow status pending)
        $pending = Document::whereBetween('created_at', [$dateFrom, $dateTo])
            ->where(function($query) {
                $query->whereNull('workflow_status')
                    ->orWhere('workflow_status', 'pending')
                    ->orWhere('status', 'pending');
            })
            ->whereDoesntHave('decisions', function($query) {
                $query->whereIn('action', ['approve', 'reject']);
            })
            ->count();

        // Get rejected documents (documents with reject decision)
        $rejected = Document::whereBetween('created_at', [$dateFrom, $dateTo])
            ->whereHas('decisions', function($query) {
                $query->where('action', 'reject');
            })
            ->count();

        // Get paginated document items
        $paginated = Document::with(['uploader.info', 'decisions'])
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->orderBy('created_at', 'desc')
            ->paginate(10, ['*'], 'page', $page);

        $items = $paginated->map(function($document) {
            $latestDecision = $document->decisions()->latest('decided_at')->first();
            $status = 'Pending';
            if ($latestDecision) {
                $status = ucfirst($latestDecision->action);
            }

            return [
                'id' => $document->id,
                'name' => $document->title,
                'status' => $status === 'Approve' ? 'Approved' : ($status === 'Reject' ? 'Rejected' : 'Pending'),
                'date' => $document->created_at->format('Y-m-d'),
                'owner' => $document->uploader ? $document->uploader->name : 'Unknown'
            ];
        });

        return [
            'summary' => [
                'total' => $total,
                'approved' => $approved,
                'pending' => $pending,
                'rejected' => $rejected
            ],
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage()
        ];
    }

    /**
     * Get users report
     */
    private function getUsersReport($dateRange, $page = 1)
    {
        [$dateFrom, $dateTo] = $dateRange;

        // Get summary statistics
        $total = User::count();
        $active = User::where('is_active', true)->count();
        $inactive = User::where('is_active', false)->count();
        $newUsers = User::whereBetween('created_at', [$dateFrom, $dateTo])->count();

        // Get paginated user items with activity count
        $paginated = User::with('info')
            ->withCount(['activities' => function($query) use ($dateFrom, $dateTo) {
                $query->whereBetween('created_at', [$dateFrom, $dateTo]);
            }])
            ->orderBy('created_at', 'desc')
            ->paginate(10, ['*'], 'page', $page);

        $items = $paginated->map(function($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'department' => $user->department ?? 'N/A',
                'level' => $user->access_level ?? 1,
                'actions' => $user->activities_count
            ];
        });

        return [
            'summary' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'newUsers' => $newUsers
            ],
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage()
        ];
    }

    /**
     * Get workflows report
     */
    private function getWorkflowsReport($dateRange, $page = 1)
    {
        [$dateFrom, $dateTo] = $dateRange;

        // Get summary statistics
        $total = Workflow::count();
        
        // Calculate average completion time
        $completedInstances = WorkflowInstance::where('status', 'completed')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->get();

        $avgTimeDays = 0;
        if ($completedInstances->count() > 0) {
            $totalMinutes = $completedInstances->sum(function($instance) {
                return $instance->started_at->diffInMinutes($instance->completed_at);
            });
            $avgTimeDays = round(($totalMinutes / $completedInstances->count()) / (24 * 60), 1);
        }

        // Calculate completion rate
        $totalInstances = WorkflowInstance::whereBetween('created_at', [$dateFrom, $dateTo])->count();
        $completedCount = WorkflowInstance::where('status', 'completed')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();
        $completionRate = $totalInstances > 0 ? round(($completedCount / $totalInstances) * 100) : 0;

        // Get bottlenecks (pending instances older than 2 days)
        $bottlenecks = WorkflowInstance::where('status', 'pending')
            ->where('created_at', '<', Carbon::now()->subDays(2))
            ->count();

        // Get paginated workflow items
        $paginated = Workflow::withCount(['instances' => function($query) use ($dateFrom, $dateTo) {
            $query->whereBetween('created_at', [$dateFrom, $dateTo]);
        }])
        ->orderBy('created_at', 'desc')
        ->paginate(10, ['*'], 'page', $page);

        $items = $paginated->map(function($workflow) use ($dateFrom, $dateTo) {
            $instances = WorkflowInstance::where('workflow_id', $workflow->id)
                ->whereBetween('created_at', [$dateFrom, $dateTo])
                ->get();
            
            $completed = $instances->where('status', 'completed')->count();
            $completionRate = $instances->count() > 0 ? round(($completed / $instances->count()) * 100) : 0;

            // Calculate average time
            $avgTime = 0;
            $completedInstances = $instances->where('status', 'completed')
                ->filter(function($instance) {
                    return $instance->started_at !== null && $instance->completed_at !== null;
                });
            if ($completedInstances->count() > 0) {
                $totalMinutes = $completedInstances->sum(function($instance) {
                    return $instance->started_at->diffInMinutes($instance->completed_at);
                });
                $avgTime = round(($totalMinutes / $completedInstances->count()) / (24 * 60), 1);
            }

            return [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'avgTime' => $avgTime > 0 ? $avgTime . ' days' : 'N/A',
                'completion' => $completionRate . '%',
                'volume' => $instances->count()
            ];
        });

        return [
            'summary' => [
                'total' => $total,
                'avgTime' => $avgTimeDays > 0 ? $avgTimeDays . ' days' : 'N/A',
                'completion' => $completionRate . '%',
                'bottlenecks' => $bottlenecks
            ],
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage()
        ];
    }

    /**
     * Get compliance report
     */
    private function getComplianceReport($dateRange, $page = 1)
    {
        [$dateFrom, $dateTo] = $dateRange;

        // Get documents with validation
        $totalDocuments = Document::whereBetween('created_at', [$dateFrom, $dateTo])->count();
        $validatedDocuments = Document::where('is_validated', true)
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();
        $complianceScore = $totalDocuments > 0 ? round(($validatedDocuments / $totalDocuments) * 100) : 0;

        // Get open issues (documents without validation or rejected)
        $issues = Document::whereBetween('created_at', [$dateFrom, $dateTo])
            ->where(function($query) {
                $query->where('is_validated', false)
                    ->orWhereHas('decisions', function($q) {
                        $q->where('action', 'reject');
                    });
            })
            ->count();

        // Get resolved (approved documents)
        $resolved = Document::whereBetween('created_at', [$dateFrom, $dateTo])
            ->whereHas('decisions', function($query) {
                $query->where('action', 'approve');
            })
            ->count();

        // Get overdue (documents pending for more than 7 days)
        $overdue = Document::where('status', 'pending')
            ->where('created_at', '<', Carbon::now()->subDays(7))
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->count();

        // Get compliance items
        $items = [
            [
                'id' => 1,
                'requirement' => 'Document Validation',
                'status' => $validatedDocuments > 0 ? 'Compliant' : 'Review Needed',
                'lastCheck' => Carbon::now()->format('Y-m-d')
            ],
            [
                'id' => 2,
                'requirement' => 'Document Approval Process',
                'status' => $resolved > 0 ? 'Compliant' : 'Review Needed',
                'lastCheck' => Carbon::now()->format('Y-m-d')
            ],
            [
                'id' => 3,
                'requirement' => 'Document Status Tracking',
                'status' => 'Compliant',
                'lastCheck' => Carbon::now()->format('Y-m-d')
            ],
            [
                'id' => 4,
                'requirement' => 'Workflow Completion',
                'status' => $overdue === 0 ? 'Compliant' : 'Review Needed',
                'lastCheck' => Carbon::now()->format('Y-m-d')
            ]
        ];

        return [
            'summary' => [
                'score' => $complianceScore . '%',
                'issues' => $issues,
                'resolved' => $resolved,
                'overdue' => $overdue
            ],
            'data' => $items,
            'current_page' => 1,
            'last_page' => 1,
            'total' => count($items),
            'per_page' => 10
        ];
    }
}
