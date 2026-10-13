from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ('expiry', 'Expiry'),
        ('offer', 'Offer'),
        ('donation', 'Donation'),
        ('reservation', 'Reservation'),
        ('status', 'Status'),
        ('system', 'System'),
    ]

    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                             related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    event_key = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'event_key'],
                name='unique_user_event'
            )
        ]

    def __str__(self):
        return f"[{self.type}] {self.message[:50]}"