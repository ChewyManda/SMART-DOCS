<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{

    public function getDashboardStats(Request $request)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $stats = [
            'total_documents' => Document::count(),
            'pending_documents' => Document::where('status', 'pending')->count(),
            'processed_documents' => Document::where('status', 'completed')->count(),
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'documents_today' => Document::whereDate('created_at', today())->count(),
        ];

        return response()->json($stats);
    }

    public function getActivityLogs(Request $request)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $logs = \App\Models\DocumentActivity::with(['user', 'document'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($logs);
    }
}