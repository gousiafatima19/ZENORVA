from django.db import models


class Donation(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('collected', 'Collected'),
        ('delivered', 'Delivered'),
    ]

    donor = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                              related_name='donations')
    shelter = models.ForeignKey('shelters.Shelter', on_delete=models.SET_NULL,
                                null=True, blank=True, related_name='received_donations')

    food_type = models.CharField(max_length=100)
    quantity = models.FloatField()
    unit = models.CharField(max_length=20)

    preparation_details = models.TextField(blank=True)
    storage_conditions = models.TextField(blank=True)
    ingredient_info = models.JSONField(default=list, blank=True)
    allergen_info = models.JSONField(default=list, blank=True)

    collection_deadline = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.food_type} ({self.quantity}{self.unit}) → {self.status}"