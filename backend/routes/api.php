<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\ResetPasswordController;
use App\Http\Controllers\DocumentDecisionController;
use App\Http\Controllers\DocumentSendBackController;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\ReportsController;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/document/verify/{paperId}', [DocumentController::class, 'verifyDocument'])->name('document.verify');

Route::post('auth/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('auth/reset-password', [ResetPasswordController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Document routes
    Route::prefix('document')->group(function () {
        Route::get('/', [DocumentController::class, 'getDocuments']);
        Route::post('/', [DocumentController::class, 'upload']);
        Route::post('/ocr', [DocumentController::class, 'uploadOCR']);
        Route::get('/search', [DocumentController::class, 'search']);
        Route::get('/autocomplete', [DocumentController::class, 'autocomplete']);
        Route::get('/{id}', [DocumentController::class, 'getDocument']);
        Route::post('/{id}/acknowledge', [DocumentController::class, 'acknowledgeDocument']);
        Route::get('/{id}/download', [DocumentController::class, 'downloadDocument']);
        Route::get('/view/{id}', [DocumentController::class, 'viewDocument']);
        Route::delete('/{id}', [DocumentController::class, 'deleteDocument']);
        Route::get('/info/{id}', [DocumentController::class, 'getInfo']);
        Route::post('/crop/{id}', [DocumentController::class, 'crop']);
        Route::get('/ocr/{file}', [DocumentController::class, 'ocr']);
        Route::post('/{id}/forward', [DocumentController::class, 'forward']);
        Route::post('/{id}/classify', [DocumentController::class, 'classifyDocument']);
        Route::get('/{id}/audit-trail', [DocumentController::class, 'getAuditTrail']);
        Route::post('/{id}/validate', [DocumentController::class, 'validateDocument']);
        Route::get('/{id}/validation-summary', [DocumentController::class, 'getValidationSummary']);
        
        //QR Codes
        Route::get('/document/{id}/qr-code', [DocumentController::class, 'getQRCode']);
        Route::get('/document/{id}/qr-code/download', [DocumentController::class, 'downloadQRCode']);
    });

    // Admin routes (staff and admin only)
    Route::prefix('admin')->group(function () {
        Route::get('/dashboard/stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/activity-logs', [AdminController::class, 'getActivityLogs']);
    });

    // Admin routes (staff and admin only)
    Route::prefix('user')->group(function () {
        Route::post('/users', [UserController::class, 'createUser']);
        Route::get('/users', [UserController::class, 'getUsers']);
        Route::put('/users/{id}', [UserController::class, 'updateUser']);
        Route::delete('/users/{id}', [UserController::class, 'deleteUser']);
        Route::get('/search', [UserController::class, 'search']);
        Route::get('/autocomplete', [UserController::class, 'autocomplete']);
    });

    // Notification routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'getNotifications']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    });

    // Department routes (Level 3+)
    Route::prefix('departments')->group(function () {
        Route::get('/', [DepartmentController::class, 'index']);
        Route::post('/', [DepartmentController::class, 'store']);
        Route::get('/{id}', [DepartmentController::class, 'show']);
        Route::put('/{id}', [DepartmentController::class, 'update']);
        Route::delete('/{id}', [DepartmentController::class, 'destroy']);
    });

    // Position routes (Level 3+)
    Route::prefix('positions')->group(function () {
        Route::get('/', [PositionController::class, 'index']);
        Route::post('/', [PositionController::class, 'store']);
        Route::get('/{id}', [PositionController::class, 'show']);
        Route::put('/{id}', [PositionController::class, 'update']);
        Route::delete('/{id}', [PositionController::class, 'destroy']);
    });

});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/document/{documentId}/decision', [DocumentDecisionController::class, 'store']);
    Route::get('/document/{documentId}/decision-status', [DocumentDecisionController::class, 'decisionStatus']);
    Route::get('/document/{documentId}/decision-history', [DocumentDecisionController::class, 'history']);
    Route::get('/document/{documentId}/has-decision', [DocumentDecisionController::class, 'hasDecision']);
});
Route::middleware('auth:sanctum')->post('/document/send-back', [DocumentSendBackController::class, 'store']);

// Workflow routes
Route::middleware('auth:sanctum')->prefix('workflow')->group(function () {
    // Workflow CRUD
    Route::get('/', [WorkflowController::class, 'index']);
    Route::post('/', [WorkflowController::class, 'store']);
    Route::get('/{id}', [WorkflowController::class, 'show']);
    Route::put('/{id}', [WorkflowController::class, 'update']);
    Route::delete('/{id}', [WorkflowController::class, 'destroy']);
    
    // Workflow steps
    Route::post('/{workflowId}/steps', [WorkflowController::class, 'addStep']);
    Route::put('/{workflowId}/steps/{stepId}', [WorkflowController::class, 'updateStep']);
    Route::delete('/{workflowId}/steps/{stepId}', [WorkflowController::class, 'deleteStep']);
    
    // Workflow instances
    Route::post('/assign/{documentId}', [WorkflowController::class, 'assignToDocument']);
    Route::get('/document/{documentId}', [WorkflowController::class, 'getDocumentWorkflow']);
    Route::post('/instance/{instanceId}/cancel', [WorkflowController::class, 'cancelWorkflow']);
    
    // Workflow step execution
    Route::post('/instance/{instanceId}/step/{stepInstanceId}/complete', [WorkflowController::class, 'completeStep']);
    
    // User workflow tasks
    Route::get('/my-pending-steps', [WorkflowController::class, 'getMyPendingSteps']);
});

// Analytics routes
Route::middleware('auth:sanctum')->prefix('analytics')->group(function () {
    Route::get('/bottlenecks', [AnalyticsController::class, 'getWorkflowBottlenecks']);
    Route::get('/precalling-time', [AnalyticsController::class, 'getPrecallingTime']);
    Route::get('/document-status', [AnalyticsController::class, 'getDocumentStatus']);
    Route::get('/comprehensive', [AnalyticsController::class, 'getComprehensive']);
    Route::get('/trends', [AnalyticsController::class, 'getTrends']);
});

// Reports routes
Route::middleware('auth:sanctum')->prefix('reports')->group(function () {
    Route::get('/', [ReportsController::class, 'getReport']);
});

// Settings routes (Super Admin/Owner only - Level 4)
Route::middleware('auth:sanctum')->prefix('settings')->group(function () {
    Route::get('/', [SettingsController::class, 'index']);
    Route::get('/grouped', [SettingsController::class, 'getGrouped']);
    Route::get('/group/{group}', [SettingsController::class, 'getByGroup']);
    Route::get('/{key}', [SettingsController::class, 'show']);
    Route::put('/', [SettingsController::class, 'update']);
    Route::post('/reset', [SettingsController::class, 'reset']);
});
