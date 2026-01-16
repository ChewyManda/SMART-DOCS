<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // REMOVE the custom CORS middleware
        // $middleware->append(\App\Http\Middleware\Cors::class);
        
        // Exclude API from CSRF
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
    })
    ->withSchedule(function (Schedule $schedule) {
        // Schedule the stuck documents check to run daily at 9:00 AM
        $schedule->command('documents:check-stuck')
            ->dailyAt('09:00')
            ->timezone('UTC')
            ->description('Check for documents stuck in pending or on_hold status for 3+ days');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();