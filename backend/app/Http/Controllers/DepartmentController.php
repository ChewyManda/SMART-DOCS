<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    /**
     * Get all departments
     */
    public function index(Request $request)
    {
        $query = Department::with('head.info');

        // Search functionality
        if ($request->filled('search') && trim($request->search) !== '') {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by active status
        if ($request->has('is_active') && $request->is_active !== null && $request->is_active !== '') {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $departments = $query->orderBy('name')->get();

        // Add users count to each department (using accessor)
        $departments->each(function ($dept) {
            $dept->users_count = $dept->users_count;
        });

        return response()->json([
            'data' => $departments
        ]);
    }

    /**
     * Get a single department
     */
    public function show($id)
    {
        $department = Department::with('head.info')->findOrFail($id);
        // users_count is automatically available via accessor
        
        return response()->json($department);
    }

    /**
     * Create a new department
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:departments,code',
            'description' => 'nullable|string',
            'head_user_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        // Convert empty string to null for head_user_id
        if (isset($data['head_user_id']) && $data['head_user_id'] === '') {
            $data['head_user_id'] = null;
        }
        $department = Department::create($data);
        $department->load('head.info');
        $department->users_count = 0;

        return response()->json([
            'message' => 'Department created successfully',
            'data' => $department
        ], 201);
    }

    /**
     * Update a department
     */
    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:departments,code,' . $id,
            'description' => 'nullable|string',
            'head_user_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        // Convert empty string to null for head_user_id
        if (isset($data['head_user_id']) && $data['head_user_id'] === '') {
            $data['head_user_id'] = null;
        }
        $department->update($data);
        $department->load('head.info');
        // users_count is automatically available via accessor

        return response()->json([
            'message' => 'Department updated successfully',
            'data' => $department
        ]);
    }

    /**
     * Delete a department
     */
    public function destroy($id)
    {
        $department = Department::findOrFail($id);

        // Check if department has users
        if ($department->users_count > 0) {
            return response()->json([
                'message' => 'Cannot delete department with assigned users'
            ], 422);
        }

        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully'
        ]);
    }
}
