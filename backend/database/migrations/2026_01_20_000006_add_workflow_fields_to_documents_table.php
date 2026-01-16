<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('workflow_instance_id')->nullable()->constrained('workflow_instances')->onDelete('set null');
            $table->string('workflow_status')->nullable(); // pending, in_progress, completed, cancelled
        });
    }

    public function down()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['workflow_instance_id']);
            $table->dropColumn(['workflow_instance_id', 'workflow_status']);
        });
    }
};
