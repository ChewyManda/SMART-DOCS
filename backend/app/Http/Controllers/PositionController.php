<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PositionController extends Controller
{
    /**
     * Get all positions
     */
    public function index(Request $request)
    {
        $query = Position::query();

        // Search functionality
        if ($request->filled('search') && trim($request->search) !== '') {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $positions = $query->orderBy('name')->get();

        // Add users count to each position
        $positions->each(function ($position) {
            $position->users_count = $position->users()->count();
        });

        return response()->json([
            'data' => $positions
        ]);
    }

    /**
     * Get a single position
     */
    public function show($id)
    {
        $position = Position::findOrFail($id);
        $position->users_count = $position->users()->count();
        return response()->json($position);
    }

    /**
     * Create a new position
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $position = Position::create($request->all());
        $position->users_count = 0;

        return response()->json([
            'message' => 'Position created successfully',
            'data' => $position
        ], 201);
    }

    /**
     * Update a position
     */
    public function update(Request $request, $id)
    {
        $position = Position::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $position->update($request->all());
        $position->users_count = $position->users()->count();

        return response()->json([
            'message' => 'Position updated successfully',
            'data' => $position
        ]);
    }

    /**
     * Delete a position
     */
    public function destroy($id)
    {
        $position = Position::findOrFail($id);

        // Check if position has users
        $usersCount = $position->users()->count();
        if ($usersCount > 0) {
            return response()->json([
                'message' => "Cannot delete position with {$usersCount} assigned user(s). Please reassign users first."
            ], 422);
        }

        $position->delete();

        return response()->json([
            'message' => 'Position deleted successfully'
        ]);
    }
}
