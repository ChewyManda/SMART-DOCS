<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;



Route::post('/login', [AuthController::class, 'login']);
Route::get('/document/verify/{paperId}', [DocumentController::class, 'verifyDocument'])->name('document.verify');

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
        Route::get('/ocr/{id}', [DocumentController::class, 'ocr']);




        //QR Codes
         Route::get('/document/{id}/qr-code', [DocumentController::class, 'getQRCode']);
    Route::get('/document/{id}/qr-code/download', [DocumentController::class, 'downloadQRCode']);

    
    });
    // Admin routes (staff and admin only)
    Route::prefix('admin')->group(function () {
        Route::post('/users', [AdminController::class, 'createUser']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::get('/dashboard/stats', [AdminController::class, 'getDashboardStats']);
        Route::get('/activity-logs', [AdminController::class, 'getActivityLogs']);
    });

    // Notification routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'getNotifications']);
        Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/read-all', [NotificationController::class, 'markAllAsRead']);
    });
});