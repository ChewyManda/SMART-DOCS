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
        Schema::table('documents', function (Blueprint $table) {
            $table->boolean('is_validated')->default(false)->after('classification_method');
            $table->decimal('validation_confidence', 5, 2)->nullable()->after('is_validated');
            $table->timestamp('validated_at')->nullable()->after('validation_confidence');
            $table->json('validation_results')->nullable()->after('validated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'is_validated',
                'validation_confidence',
                'validated_at',
                'validation_results',
            ]);
        });
    }
};
