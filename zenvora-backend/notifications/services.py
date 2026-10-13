from .models import Notification


def create_notification(user, notif_type, message, event_key=''):
    """
    Creates a notification. If event_key is provided and a notification
    for (user, event_key) already exists, it's skipped (dedup).
    """
    if event_key:
        if Notification.objects.filter(user=user, event_key=event_key).exists():
            return None
    return Notification.objects.create(
        user=user,
        type=notif_type,
        message=message,
        event_key=event_key or '',
    )