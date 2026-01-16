<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    // ======================================================
    // CREATE USER
    // ======================================================
    public function createUser(Request $request)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Validate request
        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone_number' => 'nullable|numeric',
            'position_id' => 'nullable|exists:positions,id',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users',
                'regex:/^[\w.+\-]+@(gmail\.com|yahoo\.com|outlook\.com|[\w\-]+\.edu\.ph)$/i'
            ],
            'user_id' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:8',
            'access_level' => 'required|in:1,2,3,4',
            'role' => 'required|in:admin,staff,user',
            'department_id' => 'nullable|exists:departments,id',
            'send_email' => 'sometimes|boolean',
            'require_password_change' => 'sometimes|boolean',
        ], [
            'email.regex' => 'Email must be a valid @gmail.com, @yahoo.com, @outlook.com, or @*.edu.ph address.',
            'phone_number.numeric' => 'Phone number must contain only numbers.',
            'position_id.exists' => 'The selected position does not exist.',
            'department_id.exists' => 'The selected department does not exist.'
        ]);

        // Create user
        $user = User::create([
            'name' => $request->first_name . ' ' . ($request->middle_name ? $request->middle_name . ' ' : '') . $request->last_name,
            'email' => $request->email,
            'user_id' => $request->user_id,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'is_active' => true,
            'require_password_change' => $request->require_password_change ?? true,
        ]);

        // Save additional user info including access_level, department_id, and position_id
        UserInfo::create([
            'user_id' => $user->id,
            'access_level' => $request->access_level,
            'department_id' => $request->department_id,
            'position_id' => $request->position_id,
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'phone_number' => $request->phone_number,
        ]);

        // Send email if send_email is true
        if ($request->send_email) {
            try {
                \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\SendCredentialsMail($user, $request->password));
            } catch (\Exception $e) {
                // Optional: log error but do not fail creation
                \Log::error('Failed to send credentials email: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load('info.department', 'info.position') // include info with relationships for frontend
        ], 201);
    }

    public function getUsers(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Allow all authenticated users to access user list (for forwarding, etc.)
        // Staff users get full access, regular users get basic user list
        $query = User::with('info.department', 'info.position');

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('is_active', $request->status === 'active' ? 1 : 0);
        }

        if ($request->filled('department_id') && $request->department_id !== 'all') {
            $query->whereHas('info', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }

        // Handle sorting first (before search to avoid join conflicts)
        $needsJoin = in_array($request->sort, ['a-z', 'z-a']);
        
        if ($needsJoin) {
            $query->leftJoin('user_info', 'users.id', '=', 'user_info.user_id');
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search, $needsJoin) {
                $q->where('users.email', 'like', "%{$search}%")
                ->orWhere('users.user_id', 'like', "%{$search}%");
                
                // If we already have a join, use it directly; otherwise use whereHas
                if ($needsJoin) {
                    $q->orWhere('user_info.first_name', 'like', "%{$search}%")
                      ->orWhere('user_info.last_name', 'like', "%{$search}%");
                } else {
                    $q->orWhereHas('info', function ($q2) use ($search) {
                        $q2->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
                }
            });
        }

        // Apply sorting
        switch ($request->sort) {
            case 'a-z':
                $query->orderBy('user_info.first_name', 'asc')
                    ->orderBy('user_info.last_name', 'asc')
                    ->select('users.*'); // Important to prevent ambiguous columns
                break;
            case 'z-a':
                $query->orderBy('user_info.first_name', 'desc')
                    ->orderBy('user_info.last_name', 'desc')
                    ->select('users.*');
                break;
            default:
                $query->orderBy('users.created_at', 'desc');
                break;
        }

        return response()->json($query->paginate(10));
    }

    // ======================================================
    // UPDATE USER
    // ======================================================
    public function updateUser(Request $request, $id)
    {
        if (!$request->user()->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);
        $info = $user->info;

        $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'middle_name' => 'sometimes|nullable|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'phone_number' => 'sometimes|nullable|numeric',
            'position_id' => 'sometimes|nullable|exists:positions,id',
            'email' => [
                'sometimes',
                'string',
                'email',
                'max:255',
                'unique:users,email,' . $id,
                'regex:/^[\w.+\-]+@(gmail\.com|yahoo\.com|outlook\.com|[\w\-]+\.edu\.ph)$/i'
            ],
            'user_id' => 'sometimes|string|max:255|unique:users,user_id,' . $id,
            'access_level' => 'sometimes|in:1,2,3,4',
            'role' => 'sometimes|in:admin,staff,user',
            'department_id' => 'sometimes|nullable|exists:departments,id',
            'is_active' => 'sometimes|boolean',
        ], [
            'email.regex' => 'Email must be a valid @gmail.com, @yahoo.com, @outlook.com, or @*.edu.ph address.',
            'phone_number.numeric' => 'Phone number must contain only numbers.',
            'position_id.exists' => 'The selected position does not exist.',
            'department_id.exists' => 'The selected department does not exist.'
        ]);

        $user->update($request->only([
            'email', 'user_id', 'role', 'is_active'
        ]));

        if ($info) {
            $info->update($request->only(['access_level', 'department_id', 'position_id', 'first_name', 'middle_name', 'last_name', 'phone_number']));
        } else {
            // Create user_info if it doesn't exist
            UserInfo::create([
                'user_id' => $user->id,
                'access_level' => $request->access_level ?? 1,
                'department_id' => $request->department_id ?? null,
                'position_id' => $request->position_id ?? null,
                'first_name' => $request->first_name ?? '',
                'middle_name' => $request->middle_name ?? null,
                'last_name' => $request->last_name ?? '',
                'phone_number' => $request->phone_number ?? null,
            ]);
        }

        $user->update([
            'name' => ($info->first_name ?? '') . ' ' . ($info->middle_name ?? '') . ' ' . ($info->last_name ?? '')
        ]);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load('info.department', 'info.position')
        ]);
    }

    // ======================================================
    // DELETE USER
    // ======================================================
    public function deleteUser(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);
        $user->info()->delete();
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

    // ======================================================
    // AUTOCOMPLETE USERS
    // ======================================================
    public function autocomplete(Request $request)
    {
        $request->validate(['query' => 'required|string|min:2']);

        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $searchTerm = $request->query('query', '');

        $users = User::with('info')
            ->where(function ($q) use ($searchTerm) {
                $q->where('user_id', 'like', "%{$searchTerm}%")
                ->orWhere('email', 'like', "%{$searchTerm}%")
                ->orWhereHas('info', function ($q2) use ($searchTerm) {
                    $q2->where('first_name', 'like', "%{$searchTerm}%")
                        ->orWhere('last_name', 'like', "%{$searchTerm}%");
                });
            })
            ->orderBy(UserInfo::select('first_name')
                    ->whereColumn('user_id', 'users.id'), 'asc')
            ->limit(10)
            ->get();

        return response()->json($users->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => trim(($user->info->first_name ?? '') . ' ' . ($user->info->last_name ?? '')),
                'user_id' => $user->user_id,
                'email' => $user->email,
                'first_name' => $user->info->first_name ?? null,
                'last_name' => $user->info->last_name ?? null,
                'profile_picture' => $user->info && $user->info->profile_picture ? asset('storage/' . $user->info->profile_picture) : null,
            ];
        }));
    }

    public function documentDecisions()
    {
        return $this->hasMany(DocumentDecision::class);
    }


}
