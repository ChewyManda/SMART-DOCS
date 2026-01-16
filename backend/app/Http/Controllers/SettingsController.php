<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Get all settings
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Setting::getAllFlat()
        ]);
    }

    /**
     * Get settings grouped by category
     */
    public function getGrouped(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Setting::getAllGrouped()
        ]);
    }

    /**
     * Get settings by group
     */
    public function getByGroup(string $group): JsonResponse
    {
        $validGroups = ['general', 'notifications', 'security', 'document'];
        
        if (!in_array($group, $validGroups)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid settings group'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data' => Setting::getByGroup($group)
        ]);
    }

    /**
     * Update settings
     */
    public function update(Request $request): JsonResponse
    {
        $settings = $request->all();
        
        // Remove any non-setting fields that might be sent
        unset($settings['_method']);
        
        try {
            Setting::setMany($settings);
            
            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => Setting::getAllFlat()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset settings to defaults
     */
    public function reset(): JsonResponse
    {
        try {
            Setting::resetToDefaults();
            
            return response()->json([
                'success' => true,
                'message' => 'Settings reset to defaults successfully',
                'data' => Setting::getAllFlat()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single setting
     */
    public function show(string $key): JsonResponse
    {
        $value = Setting::get($key);
        
        if ($value === null) {
            return response()->json([
                'success' => false,
                'message' => 'Setting not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'key' => $key,
                'value' => $value
            ]
        ]);
    }
}
