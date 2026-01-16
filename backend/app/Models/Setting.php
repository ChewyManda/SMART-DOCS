<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group'];

    /**
     * Get a setting value by key
     */
    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        
        if (!$setting) {
            return $default;
        }

        return static::castValue($setting->value, $setting->type);
    }

    /**
     * Set a setting value by key
     */
    public static function set(string $key, $value, string $type = null, string $group = null): bool
    {
        $setting = static::where('key', $key)->first();

        if ($setting) {
            $setting->value = static::serializeValue($value);
            if ($type) {
                $setting->type = $type;
            }
            if ($group) {
                $setting->group = $group;
            }
            return $setting->save();
        }

        // Create new setting if it doesn't exist
        return static::create([
            'key' => $key,
            'value' => static::serializeValue($value),
            'type' => $type ?? 'string',
            'group' => $group ?? 'general',
        ]) ? true : false;
    }

    /**
     * Get all settings grouped by their group
     */
    public static function getAllGrouped(): array
    {
        $settings = static::all();
        $grouped = [];

        foreach ($settings as $setting) {
            $grouped[$setting->group][$setting->key] = static::castValue($setting->value, $setting->type);
        }

        return $grouped;
    }

    /**
     * Get all settings as a flat array
     */
    public static function getAllFlat(): array
    {
        $settings = static::all();
        $flat = [];

        foreach ($settings as $setting) {
            $flat[$setting->key] = static::castValue($setting->value, $setting->type);
        }

        return $flat;
    }

    /**
     * Get settings by group
     */
    public static function getByGroup(string $group): array
    {
        $settings = static::where('group', $group)->get();
        $result = [];

        foreach ($settings as $setting) {
            $result[$setting->key] = static::castValue($setting->value, $setting->type);
        }

        return $result;
    }

    /**
     * Update multiple settings at once
     */
    public static function setMany(array $settings): bool
    {
        foreach ($settings as $key => $value) {
            $setting = static::where('key', $key)->first();
            if ($setting) {
                $setting->value = static::serializeValue($value);
                $setting->save();
            }
        }

        return true;
    }

    /**
     * Reset all settings to their defaults
     */
    public static function resetToDefaults(): bool
    {
        $defaults = [
            // General Settings
            'system_name' => 'SMART-DOCS',
            'organization_name' => '',
            'default_language' => 'en',
            'timezone' => 'UTC',

            // Notification Settings
            'email_notifications' => true,
            'push_notifications' => true,
            'document_alerts' => true,
            'reminder_alerts' => true,

            // Security Settings
            'session_timeout' => 60,
            'max_login_attempts' => 5,
            'two_factor_required' => false,
            'password_complexity' => true,

            // Document Settings
            'max_file_size' => 25,
            'allowed_file_types' => 'pdf,doc,docx,xls,xlsx,png,jpg',
            'document_retention' => 365,
            'auto_archive' => true,
        ];

        return static::setMany($defaults);
    }

    /**
     * Cast value to the appropriate type
     */
    protected static function castValue($value, string $type)
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $value,
            'float' => (float) $value,
            'json' => json_decode($value, true),
            default => $value,
        };
    }

    /**
     * Serialize value for storage
     */
    protected static function serializeValue($value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_array($value)) {
            return json_encode($value);
        }
        return (string) $value;
    }
}
