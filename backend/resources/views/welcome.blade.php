<!DOCTYPE html>
<html>
<body>
    <h2>New Notification</h2>
    <p>Hello {{ $notification->user->name }},</p>

    <p>You received a new notification:</p>

    <blockquote>
        {{ $notification->message }}
    </blockquote>

    <p>Please log in to view more details.</p>

    <p>— {{ config('app.name') }}</p>
</body>
</html>
