<?php

namespace App\Services;

use App\Models\WorkflowInstance;
use App\Models\WorkflowStepInstance;
use App\Models\WorkflowStep;
use App\Models\Document;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsService
{
    /**
     * Get workflow bottlenecks - identify steps that are taking the longest or have most pending items
     */
    public function getWorkflowBottlenecks($filters = [])
    {
        $dateFrom = $filters['date_from'] ?? now()->subDays(30);
        $dateTo = $filters['date_to'] ?? now();
        $workflowId = $filters['workflow_id'] ?? null;

        // Get step performance metrics
        $stepMetrics = WorkflowStepInstance::query()
            ->join('workflow_steps', 'workflow_step_instances.workflow_step_id', '=', 'workflow_steps.id')
            ->join('workflow_instances', 'workflow_step_instances.workflow_instance_id', '=', 'workflow_instances.id')
            ->whereBetween('workflow_step_instances.created_at', [$dateFrom, $dateTo])
            ->when($workflowId, function($query) use ($workflowId) {
                $query->where('workflow_instances.workflow_id', $workflowId);
            })
            ->select([
                'workflow_steps.id as step_id',
                'workflow_steps.name as step_name',
                'workflow_steps.step_order',
                DB::raw('COUNT(DISTINCT workflow_step_instances.id) as total_instances'),
                DB::raw('COUNT(DISTINCT CASE WHEN workflow_step_instances.status = "pending" THEN workflow_step_instances.id END) as pending_count'),
                DB::raw('AVG(CASE 
                    WHEN workflow_step_instances.completed_at IS NOT NULL AND workflow_step_instances.started_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, workflow_step_instances.started_at, workflow_step_instances.completed_at)
                    ELSE NULL 
                END) as avg_processing_hours'),
                DB::raw('MAX(CASE 
                    WHEN workflow_step_instances.completed_at IS NOT NULL AND workflow_step_instances.started_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, workflow_step_instances.started_at, workflow_step_instances.completed_at)
                    ELSE NULL 
                END) as max_processing_hours'),
                DB::raw('AVG(CASE 
                    WHEN workflow_step_instances.due_at IS NOT NULL AND workflow_step_instances.completed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, workflow_step_instances.completed_at, workflow_step_instances.due_at)
                    WHEN workflow_step_instances.due_at IS NOT NULL AND workflow_step_instances.completed_at IS NULL 
                    THEN TIMESTAMPDIFF(HOUR, now(), workflow_step_instances.due_at)
                    ELSE NULL 
                END) as avg_time_to_due'),
            ])
            ->groupBy('workflow_steps.id', 'workflow_steps.name', 'workflow_steps.step_order')
            ->orderBy('avg_processing_hours', 'desc')
            ->get();

        // Get currently stuck steps (pending for more than expected time)
        $stuckSteps = WorkflowStepInstance::query()
            ->join('workflow_steps', 'workflow_step_instances.workflow_step_id', '=', 'workflow_steps.id')
            ->join('workflow_instances', 'workflow_step_instances.workflow_instance_id', '=', 'workflow_instances.id')
            ->where('workflow_step_instances.status', 'pending')
            ->where('workflow_step_instances.started_at', '<=', now()->subHours(24))
            ->when($workflowId, function($query) use ($workflowId) {
                $query->where('workflow_instances.workflow_id', $workflowId);
            })
            ->select([
                'workflow_steps.id as step_id',
                'workflow_steps.name as step_name',
                DB::raw('COUNT(*) as stuck_count'),
                DB::raw('AVG(TIMESTAMPDIFF(HOUR, workflow_step_instances.started_at, now())) as avg_hours_stuck'),
            ])
            ->groupBy('workflow_steps.id', 'workflow_steps.name')
            ->get();

        return [
            'step_metrics' => $stepMetrics,
            'stuck_steps' => $stuckSteps,
            'summary' => [
                'total_steps_analyzed' => $stepMetrics->count(),
                'total_pending' => $stepMetrics->sum('pending_count'),
                'avg_processing_time_hours' => $stepMetrics->avg('avg_processing_hours'),
                'most_bottleneck_step' => $stepMetrics->sortByDesc('avg_processing_hours')->first(),
            ],
        ];
    }

    /**
     * Get precalling time analytics - time between step creation and actual processing
     */
    public function getPrecallingTimeAnalytics($filters = [])
    {
        $dateFrom = $filters['date_from'] ?? now()->subDays(30);
        $dateTo = $filters['date_to'] ?? now();
        $workflowId = $filters['workflow_id'] ?? null;

        // Calculate precalling time (time from step instance creation to when it was started/processed)
        $precallingMetrics = WorkflowStepInstance::query()
            ->join('workflow_instances', 'workflow_step_instances.workflow_instance_id', '=', 'workflow_instances.id')
            ->join('workflow_steps', 'workflow_step_instances.workflow_step_id', '=', 'workflow_steps.id')
            ->whereBetween('workflow_step_instances.created_at', [$dateFrom, $dateTo])
            ->whereNotNull('workflow_step_instances.started_at')
            ->when($workflowId, function($query) use ($workflowId) {
                $query->where('workflow_instances.workflow_id', $workflowId);
            })
            ->select([
                DB::raw('DATE(workflow_step_instances.created_at) as date'),
                DB::raw('AVG(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, workflow_step_instances.started_at)) as avg_precalling_minutes'),
                DB::raw('MAX(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, workflow_step_instances.started_at)) as max_precalling_minutes'),
                DB::raw('MIN(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, workflow_step_instances.started_at)) as min_precalling_minutes'),
                DB::raw('COUNT(*) as total_instances'),
            ])
            ->groupBy(DB::raw('DATE(workflow_step_instances.created_at)'))
            ->orderBy('date', 'asc')
            ->get();

        // Get precalling time by step
        $precallingByStep = WorkflowStepInstance::query()
            ->join('workflow_instances', 'workflow_step_instances.workflow_instance_id', '=', 'workflow_instances.id')
            ->join('workflow_steps', 'workflow_step_instances.workflow_step_id', '=', 'workflow_steps.id')
            ->whereBetween('workflow_step_instances.created_at', [$dateFrom, $dateTo])
            ->whereNotNull('workflow_step_instances.started_at')
            ->when($workflowId, function($query) use ($workflowId) {
                $query->where('workflow_instances.workflow_id', $workflowId);
            })
            ->select([
                'workflow_steps.id as step_id',
                'workflow_steps.name as step_name',
                'workflow_steps.step_order',
                DB::raw('AVG(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, workflow_step_instances.started_at)) as avg_precalling_minutes'),
                DB::raw('MAX(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, workflow_step_instances.started_at)) as max_precalling_minutes'),
                DB::raw('COUNT(*) as total_instances'),
            ])
            ->groupBy('workflow_steps.id', 'workflow_steps.name', 'workflow_steps.step_order')
            ->orderBy('avg_precalling_minutes', 'desc')
            ->get();

        // Get instances still waiting (not started yet)
        $waitingInstances = WorkflowStepInstance::query()
            ->join('workflow_instances', 'workflow_step_instances.workflow_instance_id', '=', 'workflow_instances.id')
            ->join('workflow_steps', 'workflow_step_instances.workflow_step_id', '=', 'workflow_steps.id')
            ->where('workflow_step_instances.status', 'pending')
            ->whereNull('workflow_step_instances.started_at')
            ->when($workflowId, function($query) use ($workflowId) {
                $query->where('workflow_instances.workflow_id', $workflowId);
            })
            ->select([
                DB::raw('COUNT(*) as waiting_count'),
                DB::raw('AVG(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, now())) as avg_waiting_minutes'),
                DB::raw('MAX(TIMESTAMPDIFF(MINUTE, workflow_step_instances.created_at, now())) as max_waiting_minutes'),
            ])
            ->first();

        return [
            'daily_metrics' => $precallingMetrics,
            'by_step' => $precallingByStep,
            'waiting_instances' => $waitingInstances,
            'summary' => [
                'overall_avg_precalling_minutes' => $precallingMetrics->avg('avg_precalling_minutes'),
                'overall_max_precalling_minutes' => $precallingMetrics->max('max_precalling_minutes'),
                'total_waiting' => $waitingInstances->waiting_count ?? 0,
                'avg_waiting_minutes' => $waitingInstances->avg_waiting_minutes ?? 0,
            ],
        ];
    }

    /**
     * Get document status analytics
     */
    public function getDocumentStatusAnalytics($filters = [])
    {
        $dateFrom = $filters['date_from'] ?? now()->subDays(30);
        $dateTo = $filters['date_to'] ?? now();
        $classification = $filters['classification'] ?? null;

        // Status distribution
        $statusDistribution = Document::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->when($classification, function($query) use ($classification) {
                $query->where('classification', $classification);
            })
            ->select([
                DB::raw('COALESCE(status, "unknown") as status'),
                DB::raw('COALESCE(workflow_status, "no_workflow") as workflow_status'),
                DB::raw('COUNT(*) as count'),
            ])
            ->groupBy('status', 'workflow_status')
            ->get();

        // Status changes over time
        $statusOverTime = Document::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->when($classification, function($query) use ($classification) {
                $query->where('classification', $classification);
            })
            ->select([
                DB::raw('DATE(created_at) as date'),
                DB::raw('COALESCE(status, "unknown") as status'),
                DB::raw('COUNT(*) as count'),
            ])
            ->groupBy(DB::raw('DATE(created_at)'), 'status')
            ->orderBy('date', 'asc')
            ->get();

        // Documents by workflow status
        $workflowStatusDistribution = Document::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->when($classification, function($query) use ($classification) {
                $query->where('classification', $classification);
            })
            ->select([
                DB::raw('COALESCE(workflow_status, "no_workflow") as workflow_status'),
                DB::raw('COUNT(*) as count'),
            ])
            ->groupBy('workflow_status')
            ->get();

        // Average time in each status (for documents with workflow instances)
        $avgTimeInStatus = WorkflowInstance::query()
            ->join('documents', 'workflow_instances.document_id', '=', 'documents.id')
            ->whereBetween('workflow_instances.created_at', [$dateFrom, $dateTo])
            ->when($classification, function($query) use ($classification) {
                $query->where('documents.classification', $classification);
            })
            ->select([
                'workflow_instances.status',
                DB::raw('AVG(CASE 
                    WHEN workflow_instances.completed_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, workflow_instances.started_at, workflow_instances.completed_at)
                    ELSE TIMESTAMPDIFF(HOUR, workflow_instances.started_at, now())
                    END) as avg_hours_in_status'),
                DB::raw('COUNT(*) as count'),
            ])
            ->groupBy('workflow_instances.status')
            ->get();

        return [
            'status_distribution' => $statusDistribution,
            'status_over_time' => $statusOverTime,
            'workflow_status_distribution' => $workflowStatusDistribution,
            'avg_time_in_status' => $avgTimeInStatus,
            'summary' => [
                'total_documents' => Document::whereBetween('created_at', [$dateFrom, $dateTo])
                    ->when($classification, function($query) use ($classification) {
                        $query->where('classification', $classification);
                    })
                    ->count(),
                'documents_with_workflow' => Document::whereBetween('created_at', [$dateFrom, $dateTo])
                    ->whereNotNull('workflow_instance_id')
                    ->when($classification, function($query) use ($classification) {
                        $query->where('classification', $classification);
                    })
                    ->count(),
                'completed_workflows' => WorkflowInstance::whereBetween('created_at', [$dateFrom, $dateTo])
                    ->where('status', 'completed')
                    ->count(),
            ],
        ];
    }

    /**
     * Get comprehensive analytics combining all metrics
     */
    public function getComprehensiveAnalytics($filters = [])
    {
        return [
            'bottlenecks' => $this->getWorkflowBottlenecks($filters),
            'precalling_time' => $this->getPrecallingTimeAnalytics($filters),
            'document_status' => $this->getDocumentStatusAnalytics($filters),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get trends and insights analytics
     */
    public function getTrendsAnalytics($filters = [])
    {
        // Handle date_from
        if (isset($filters['date_from']) && $filters['date_from'] !== null) {
            $dateFrom = $filters['date_from'] instanceof Carbon 
                ? $filters['date_from']->copy()->startOfDay()
                : Carbon::parse($filters['date_from'])->startOfDay();
        } else {
            $dateFrom = Carbon::now()->subDays(30)->startOfDay();
        }

        // Handle date_to
        if (isset($filters['date_to']) && $filters['date_to'] !== null) {
            $dateTo = $filters['date_to'] instanceof Carbon 
                ? $filters['date_to']->copy()->endOfDay()
                : Carbon::parse($filters['date_to'])->endOfDay();
        } else {
            $dateTo = Carbon::now()->endOfDay();
        }

        // Calculate previous period for growth rate
        $daysDiff = $dateFrom->diffInDays($dateTo);
        $previousDateFrom = $dateFrom->copy()->subDays($daysDiff)->startOfDay();
        $previousDateTo = $dateFrom->copy()->subDay()->endOfDay();

        // Total documents in current period
        $totalDocuments = Document::whereBetween('created_at', [$dateFrom, $dateTo])->count();
        
        // Total documents in previous period
        $previousTotalDocuments = Document::whereBetween('created_at', [$previousDateFrom, $previousDateTo])->count();
        
        // Calculate growth rate
        $growthRate = $previousTotalDocuments > 0 
            ? (($totalDocuments - $previousTotalDocuments) / $previousTotalDocuments) * 100 
            : ($totalDocuments > 0 ? 100 : 0);

        // Average daily uploads
        $avgDailyUploads = $daysDiff > 0 ? $totalDocuments / $daysDiff : 0;

        // Average processing time (from workflow instances)
        $avgProcessingTime = WorkflowInstance::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->whereNotNull('completed_at')
            ->whereNotNull('started_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, started_at, completed_at)) as avg_hours')
            ->value('avg_hours') ?? 0;

        // Daily uploads
        $dailyUploads = Document::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'count' => (int)$item->count,
                ];
            });

        // By classification
        $byClassification = Document::query()
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->selectRaw('COALESCE(classification, "other") as classification, COUNT(*) as count')
            ->groupBy('classification')
            ->get()
            ->map(function ($item) use ($totalDocuments) {
                return [
                    'classification' => $item->classification,
                    'count' => (int)$item->count,
                    'percentage' => $totalDocuments > 0 ? ($item->count / $totalDocuments) * 100 : 0,
                ];
            })
            ->sortByDesc('count')
            ->values();

        // By department (from users who uploaded documents)
        $byDepartment = Document::query()
            ->join('users', 'documents.uploaded_by', '=', 'users.id')
            ->whereBetween('documents.created_at', [$dateFrom, $dateTo])
            ->selectRaw('COALESCE(users.department, "Unknown") as department, COUNT(*) as count')
            ->groupBy('users.department')
            ->get()
            ->map(function ($item) {
                return [
                    'department' => $item->department ?: 'Unknown',
                    'count' => (int)$item->count,
                ];
            })
            ->sortByDesc('count')
            ->values();

        // Weekly comparison
        $weeklyComparison = [];
        $startDate = $dateFrom->copy();
        $weekNumber = 1;
        $maxWeeks = 52; // Safety limit to prevent infinite loops

        while ($startDate->lte($dateTo) && $weekNumber <= $maxWeeks) {
            $weekEnd = $startDate->copy()->addDays(6)->endOfDay();
            if ($weekEnd->gt($dateTo)) {
                $weekEnd = $dateTo->copy();
            }

            // Documents in this week
            $weekDocuments = Document::whereBetween('created_at', [$startDate, $weekEnd])->count();

            // Approvals in this week (from workflow step instances)
            $weekApprovals = WorkflowStepInstance::query()
                ->join('workflow_instances', 'workflow_step_instances.workflow_instance_id', '=', 'workflow_instances.id')
                ->whereBetween('workflow_step_instances.completed_at', [$startDate, $weekEnd])
                ->whereNotNull('workflow_step_instances.completed_at')
                ->where('workflow_step_instances.status', 'approved')
                ->count();

            $weeklyComparison[] = [
                'week' => 'Week ' . $weekNumber,
                'documents' => $weekDocuments,
                'approvals' => $weekApprovals,
            ];

            $startDate = $startDate->copy()->addDays(7)->startOfDay();
            $weekNumber++;
        }

        return [
            'summary' => [
                'total_documents' => $totalDocuments,
                'growth_rate' => round($growthRate, 1),
                'avg_daily_uploads' => round($avgDailyUploads, 1),
                'avg_processing_time' => round($avgProcessingTime, 1),
            ],
            'daily_uploads' => $dailyUploads,
            'by_classification' => $byClassification,
            'by_department' => $byDepartment,
            'weekly_comparison' => $weeklyComparison,
        ];
    }
}
