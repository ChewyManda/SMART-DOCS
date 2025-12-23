<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{

    public function createUser(Request $request)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'user_id' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:8',
            'access_level' => 'required|in:1,2,3,4',
            'role' => 'required|in:admin,staff,user',
            'department' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'user_id' => $request->user_id,
            'password' => Hash::make($request->password),
            'access_level' => $request->access_level,
            'role' => $request->role,
            'department' => $request->department,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ], 201);
    }

    public function getUsers(Request $request)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $users = User::orderBy('created_at', 'desc')->get();

        return response()->json($users);
    }

    public function updateUser(Request $request, $id)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'user_id' => 'sometimes|string|max:255|unique:users,user_id,' . $id,
            'access_level' => 'sometimes|in:1,2,3,4',
            'role' => 'sometimes|in:admin,staff,user',
            'department' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $user->update($request->only([
            'name', 'email', 'user_id', 'access_level', 
            'role', 'department', 'is_active'
        ]));

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    public function deleteUser(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

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