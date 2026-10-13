"""
Background job: check for pantry items expiring soon and notify users.

Run manually:   python manage.py check_expiry
On Render:      add a Cron Job that runs this daily.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from pantry.models import PantryItem
from notifications.services import create_notification
from notifications.email import send_notification_email


class Command(BaseCommand):
    help = 'Check for pantry items expiring within 3 days and notify users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=3,
            help='Notify for items expiring within N days (default: 3)'
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff = timezone.now().date() + timedelta(days=days)

        notified_users = 0
        notified_items = 0

        for user in User.objects.all():
            expiring = PantryItem.objects.filter(
                user=user,
                expiry_date__lte=cutoff,
                expiry_date__gte=timezone.now().date(),
            ).order_by('expiry_date')

            if not expiring.exists():
                continue

            items_list = list(expiring)
            names = ', '.join(f"{i.name} ({i.expiry_date})" for i in items_list)

            # In-app notification, deduped per user per day
            event_key = f"expiry_reminder_{timezone.now().date()}_{user.id}"
            notif = create_notification(
                user=user,
                notif_type='expiry',
                message=f"{len(items_list)} item(s) expiring soon: {names}",
                event_key=event_key,
            )

            # Only send email if the notification was new (deduped)
            if notif:
                send_notification_email(
                    user=user,
                    subject=f"ZENVORA: {len(items_list)} pantry item(s) expiring soon",
                    message=(
                        f"Hi {user.username},\n\n"
                        f"These pantry items are expiring in the next {days} days:\n\n"
                        + '\n'.join(f"  • {i.name} — expires {i.expiry_date}" for i in items_list)
                        + f"\n\nCook something with them to avoid waste.\n\n"
                        f"— ZENVORA"
                    ),
                )
                notified_users += 1
                notified_items += len(items_list)

        self.stdout.write(self.style.SUCCESS(
            f"Done. Notified {notified_users} user(s) about {notified_items} item(s)."
        ))