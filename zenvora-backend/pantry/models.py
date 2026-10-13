from django.db import models


class PantryItem(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE,
                             related_name='pantry_items')
    name = models.CharField(max_length=100)
    quantity = models.FloatField()
    unit = models.CharField(max_length=20)
    category = models.CharField(max_length=50, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        ordering = ['expiry_date']

    def __str__(self):
        return f"{self.name} ({self.quantity}{self.unit})"