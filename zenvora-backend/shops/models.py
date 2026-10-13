from django.db import models


class Shop(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    is_verified = models.BooleanField(default=False)
    is_demo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Offer(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='offers')
    item_name = models.CharField(max_length=100)
    price = models.FloatField()
    unit_price = models.FloatField(null=True, blank=True)
    discount_percent = models.FloatField(default=0)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_demo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.item_name} @ {self.shop.name}"