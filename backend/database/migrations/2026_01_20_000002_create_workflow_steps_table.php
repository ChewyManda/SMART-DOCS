<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('workflows')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('step_order')->default(0); // Order of execution
            $table->string('step_type')->default('approval'); // approval, review, processing
            $table->boolean('is_required')->default(true); // Must be completed to proceed
            $table->boolean('requires_all_assignees')->default(false); // If true, all assignees must complete; if false, any assignee can complete
            $table->integer('timeout_hours')->nullable(); // Optional timeout for step
            $table->json('conditions')->nullable(); // JSON conditions for step execution
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflow_steps');
    }
};
