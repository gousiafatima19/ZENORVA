from rest_framework import serializers
from .models import Donation


class DonationSerializer(serializers.ModelSerializer):
    donor_username = serializers.CharField(source='donor.username', read_only=True)
    shelter_name = serializers.CharField(source='shelter.name', read_only=True)

    class Meta:
        model = Donation
        fields = ['id', 'donor', 'donor_username', 'shelter', 'shelter_name',
                  'food_type', 'quantity', 'unit', 'preparation_details',
                  'storage_conditions', 'ingredient_info', 'allergen_info',
                  'collection_deadline', 'status', 'is_flagged', 'flag_reason',
                  'created_at', 'updated_at', 'is_demo']
        read_only_fields = ['donor', 'created_at', 'updated_at',
                            'is_flagged', 'flag_reason']


class DonationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = ['food_type', 'quantity', 'unit', 'preparation_details',
                  'storage_conditions', 'ingredient_info', 'allergen_info',
                  'collection_deadline']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive')
        return value


class DonationStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        'available', 'reserved', 'collected', 'delivered'
    ])