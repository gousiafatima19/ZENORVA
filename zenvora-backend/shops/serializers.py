from rest_framework import serializers
from .models import Shop, Offer


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ['id', 'item_name', 'price', 'unit_price',
                  'discount_percent', 'valid_until', 'is_demo']


class ShopSerializer(serializers.ModelSerializer):
    offers = OfferSerializer(many=True, read_only=True)
    distance_km = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = Shop
        fields = ['id', 'name', 'address', 'latitude', 'longitude',
                  'is_verified', 'is_demo', 'distance_km', 'offers']