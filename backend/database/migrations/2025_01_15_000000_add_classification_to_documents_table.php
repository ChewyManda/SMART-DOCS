<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->enum('classification', ['invoice', 'contract', 'report', 'form', 'other'])->nullable()->after('description');
            $table->decimal('classification_confidence', 5, 2)->nullable()->after('classification');
            $table->string('classification_method')->nullable()->after('classification_confidence')->comment('rule-based, ai, manual');
        });
    }

    public function down()
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['classification', 'classification_confidence', 'classification_method']);
        });
    }
};
