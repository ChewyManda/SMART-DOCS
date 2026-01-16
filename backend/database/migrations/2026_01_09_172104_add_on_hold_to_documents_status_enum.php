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
        // Modify the enum to include 'on_hold'
        DB::statement("ALTER TABLE documents MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed', 'on_hold') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        // Note: This will fail if there are documents with 'on_hold' status
        DB::statement("ALTER TABLE documents MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending'");
    }
};
