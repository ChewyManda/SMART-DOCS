<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, integer, boolean, json
            $table->string('group')->default('general'); // general, notifications, security, document
            $table->timestamps();
        });

        // Insert default settings
        $this->seedDefaultSettings();
    }

    /**
     * Seed default settings
     */
    private function seedDefaultSettings(): void
    {
        $defaultSettings = [
            // General Settings
            ['key' => 'system_name', 'value' => 'SMART-DOCS', 'type' => 'string', 'group' => 'general'],
            ['key' => 'organization_name', 'value' => '', 'type' => 'string', 'group' => 'general'],
            ['key' => 'default_language', 'value' => 'en', 'type' => 'string', 'group' => 'general'],
            ['key' => 'timezone', 'value' => 'UTC', 'type' => 'string', 'group' => 'general'],

            // Notification Settings
            ['key' => 'email_notifications', 'value' => 'true', 'type' => 'boolean', 'group' => 'notifications'],
            ['key' => 'push_notifications', 'value' => 'true', 'type' => 'boolean', 'group' => 'notifications'],
            ['key' => 'document_alerts', 'value' => 'true', 'type' => 'boolean', 'group' => 'notifications'],
            ['key' => 'reminder_alerts', 'value' => 'true', 'type' => 'boolean', 'group' => 'notifications'],

            // Security Settings
            ['key' => 'session_timeout', 'value' => '60', 'type' => 'integer', 'group' => 'security'],
            ['key' => 'max_login_attempts', 'value' => '5', 'type' => 'integer', 'group' => 'security'],
            ['key' => 'two_factor_required', 'value' => 'false', 'type' => 'boolean', 'group' => 'security'],
            ['key' => 'password_complexity', 'value' => 'true', 'type' => 'boolean', 'group' => 'security'],

            // Document Settings
            ['key' => 'max_file_size', 'value' => '25', 'type' => 'integer', 'group' => 'document'],
            ['key' => 'allowed_file_types', 'value' => 'pdf,doc,docx,xls,xlsx,png,jpg', 'type' => 'string', 'group' => 'document'],
            ['key' => 'document_retention', 'value' => '365', 'type' => 'integer', 'group' => 'document'],
            ['key' => 'auto_archive', 'value' => 'true', 'type' => 'boolean', 'group' => 'document'],
        ];

        $now = now();
        foreach ($defaultSettings as &$setting) {
            $setting['created_at'] = $now;
            $setting['updated_at'] = $now;
        }

        \DB::table('settings')->insert($defaultSettings);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
