<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('document_activities', function (Blueprint $table) {
            // Add new fields for comprehensive audit trails
            $table->string('ip_address', 45)->nullable()->after('user_id');
            $table->text('user_agent')->nullable()->after('ip_address');
            $table->text('old_value')->nullable()->after('details');
            $table->text('new_value')->nullable()->after('old_value');
            $table->json('metadata')->nullable()->after('new_value');
        });

        // Modify the activity_type enum to include all audit trail activities
        // First, we need to drop the existing enum and recreate it with new values
        DB::statement("ALTER TABLE document_activities MODIFY COLUMN activity_type ENUM(
            'uploaded',
            'viewed',
            'downloaded',
            'printed',
            'exported',
            'acknowledged',
            'approved',
            'rejected',
            'held',
            'forwarded',
            'sent_back',
            'classified',
            'modified',
            'status_changed',
            'recipient_added',
            'recipient_removed',
            'file_added',
            'file_deleted',
            'deleted',
            'title_updated',
            'description_updated',
            'classification_updated'
        ) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_activities', function (Blueprint $table) {
            $table->dropColumn(['ip_address', 'user_agent', 'old_value', 'new_value', 'metadata']);
        });

        // Revert to original enum values
        DB::statement("ALTER TABLE document_activities MODIFY COLUMN activity_type ENUM(
            'uploaded',
            'viewed',
            'downloaded',
            'printed',
            'exported',
            'acknowledged'
        ) NOT NULL");
    }
};
