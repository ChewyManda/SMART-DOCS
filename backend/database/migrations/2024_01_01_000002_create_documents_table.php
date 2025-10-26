<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('document_id')->unique();
            $table->string('file_path');
            $table->string('file_type');
            $table->bigInteger('file_size');
            $table->text('description')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->text('ocr_text')->nullable();
            $table->boolean('is_ocr_processed')->default(false);
            $table->string('qr_code_path')->nullable();
            $table->string('paper_id')->unique();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('documents');
    }
};