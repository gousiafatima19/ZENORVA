from django.contrib import admin
from .models import Shop, Offer


class OfferInline(admin.TabularInline):
    model = Offer
    extra = 1


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_verified', 'is_demo', 'latitude', 'longitude')
    inlines = [OfferInline]


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'shop', 'price', 'discount_percent', 'valid_until')