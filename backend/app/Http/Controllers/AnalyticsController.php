<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AnalyticsService;
use Illuminate\Support\Facades\Validator;

class AnalyticsController extends Controller
{
    protected $analyticsService;

    public function __construct(AnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Get workflow bottlenecks analytics
     */
    public function getWorkflowBottlenecks(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'workflow_id' => 'nullable|exists:workflows,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filters = [
                'date_from' => $request->date_from ? new \Carbon\Carbon($request->date_from) : null,
                'date_to' => $request->date_to ? new \Carbon\Carbon($request->date_to) : null,
                'workflow_id' => $request->workflow_id,
            ];

            $analytics = $this->analyticsService->getWorkflowBottlenecks($filters);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve workflow bottlenecks',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get precalling time analytics
     */
    public function getPrecallingTime(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'workflow_id' => 'nullable|exists:workflows,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filters = [
                'date_from' => $request->date_from ? new \Carbon\Carbon($request->date_from) : null,
                'date_to' => $request->date_to ? new \Carbon\Carbon($request->date_to) : null,
                'workflow_id' => $request->workflow_id,
            ];

            $analytics = $this->analyticsService->getPrecallingTimeAnalytics($filters);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve precalling time analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get document status analytics
     */
    public function getDocumentStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'classification' => 'nullable|in:invoice,contract,report,form,other',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filters = [
                'date_from' => $request->date_from ? new \Carbon\Carbon($request->date_from) : null,
                'date_to' => $request->date_to ? new \Carbon\Carbon($request->date_to) : null,
                'classification' => $request->classification,
            ];

            $analytics = $this->analyticsService->getDocumentStatusAnalytics($filters);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve document status analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get comprehensive analytics (all metrics)
     */
    public function getComprehensive(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'workflow_id' => 'nullable|exists:workflows,id',
            'classification' => 'nullable|in:invoice,contract,report,form,other',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filters = [
                'date_from' => $request->date_from ? new \Carbon\Carbon($request->date_from) : null,
                'date_to' => $request->date_to ? new \Carbon\Carbon($request->date_to) : null,
                'workflow_id' => $request->workflow_id,
                'classification' => $request->classification,
            ];

            $analytics = $this->analyticsService->getComprehensiveAnalytics($filters);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve comprehensive analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get trends and insights analytics
     */
    public function getTrends(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $filters = [
                'date_from' => $request->date_from ? \Carbon\Carbon::parse($request->date_from)->startOfDay() : null,
                'date_to' => $request->date_to ? \Carbon\Carbon::parse($request->date_to)->endOfDay() : null,
            ];

            $analytics = $this->analyticsService->getTrendsAnalytics($filters);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);
        } catch (\Exception $e) {
            \Log::error('Trends analytics error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'filters' => $filters,
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve trends analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
