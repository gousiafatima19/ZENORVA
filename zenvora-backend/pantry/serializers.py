from rest_framework import serializers
from .models import PantryItem


class PantryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PantryItem
        fields = '__all__'
        read_only_fields = ['user', 'added_at']