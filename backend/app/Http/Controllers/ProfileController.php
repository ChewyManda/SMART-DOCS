<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\UserInfo;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    // ======================================================
    // SHOW PROFILE
    // ======================================================
    public function show(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Load related user info with department and position
        $user->load('info.department', 'info.position');

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'access_level' => $user->access_level,
            'department' => $user->info && $user->info->department ? $user->info->department->name : null,
            'department_id' => $user->info && $user->info->department_id ? $user->info->department_id : null,
            'avatar' => $user->info && $user->info->profile_picture ? asset('storage/' . $user->info->profile_picture) : null,
            'info' => [
                'first_name' => $user->info->first_name ?? '',
                'middle_name' => $user->info->middle_name ?? '',
                'last_name' => $user->info->last_name ?? '',
                'phone_number' => $user->info->phone_number ?? '',
                'position' => $user->info && $user->info->position ? $user->info->position->name : null,
                'position_id' => $user->info && $user->info->position_id ? $user->info->position_id : null,
                'profile_picture' => $user->info && $user->info->profile_picture ? asset('storage/' . $user->info->profile_picture) : null,
            ],
        ]);
    }

    // ======================================================
    // UPDATE PROFILE INFO
    // ======================================================
    public function update(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthenticated'], 401);

        $request->validate([
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'phone_number' => 'nullable|string|max:30',
            'position_id' => 'nullable|exists:positions,id',
            'department_id' => 'nullable|exists:departments,id',
        ], [
            'position_id.exists' => 'The selected position does not exist.',
            'department_id.exists' => 'The selected department does not exist.'
        ]);

        // Update or create UserInfo
        UserInfo::updateOrCreate(
            ['user_id' => $user->id],
            $request->only([
                'first_name',
                'middle_name',
                'last_name',
                'phone_number',
                'position_id',
                'department_id',
            ])
        );

        return response()->json(['message' => 'Profile updated']);
    }

    // ======================================================
    // UPDATE PASSWORD
    // ======================================================
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8',
            'new_password_confirmation' => 'required',
        ]);

        $user = $request->user();
        if (!$user) return response()->json(['error' => 'Unauthenticated'], 401);

        // Check current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password incorrect'], 422);
        }

        // Check new password match
        if ($request->new_password !== $request->new_password_confirmation) {
            return response()->json(['error' => 'Passwords do not match'], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password updated']);
    }

    // ======================================================
    // UPLOAD AVATAR
    // ======================================================
    public function uploadAvatar(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) return response()->json(['error' => 'Unauthenticated'], 401);

            $request->validate([
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            ], [
                'avatar.required' => 'Please select an image file.',
                'avatar.image' => 'The file must be an image.',
                'avatar.mimes' => 'The image must be a file of type: jpeg, png, jpg, gif.',
                'avatar.max' => 'The image may not be greater than 2MB.',
            ]);

            $file = $request->file('avatar');
            if (!$file) {
                return response()->json(['error' => 'No file uploaded'], 400);
            }

            $path = $file->store('avatars', 'public');
            if (!$path) {
                return response()->json(['error' => 'Failed to store file'], 500);
            }

            // Get or create user info
            $userInfo = $user->info;
            if (!$userInfo) {
                $userInfo = UserInfo::create(['user_id' => $user->id]);
            }

            // Delete old profile picture if exists
            if ($userInfo->profile_picture && Storage::disk('public')->exists($userInfo->profile_picture)) {
                Storage::disk('public')->delete($userInfo->profile_picture);
            }

            // Update profile picture in user_info
            $userInfo->profile_picture = $path;
            $userInfo->save();

            return response()->json([
                'message' => 'Avatar updated successfully',
                'avatar' => asset('storage/' . $path),
                'profile_picture' => asset('storage/' . $path),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Avatar upload error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to upload avatar: ' . $e->getMessage()
            ], 500);
        }
    }
}
