<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflow_step_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_step_id')->constrained('workflow_steps')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('assignee_type')->default('user'); // user, role, department
            $table->string('assignee_value')->nullable(); // role name or department name if not user
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflow_step_assignees');
    }
};
