<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('workflows', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type')->default('approval'); // approval, review, processing
            $table->string('trigger_type')->default('classification'); // classification, manual
            $table->string('trigger_value')->nullable(); // classification type or null for manual
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0); // Higher priority workflows are checked first
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('workflows');
    }
};
