from rest_framework import serializers
from .models import Shelter


class ShelterSerializer(serializers.ModelSerializer):
    distance_km = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = Shelter
        fields = ['id', 'name', 'address', 'latitude', 'longitude',
                  'contact', 'resident_count', 'age_groups', 'needs',
                  'dietary_requirements', 'allergy_flags',
                  'deadline', 'is_verified', 'is_demo', 'distance_km']


class ShelterUpdateSerializer(serializers.ModelSerializer):
    """Only allows a shelter to update its own operational fields."""
    class Meta:
        model = Shelter
        fields = ['resident_count', 'age_groups', 'needs',
                  'dietary_requirements', 'allergy_flags',
                  'contact', 'deadline']

    def validate_resident_count(self, value):
        if value < 0:
            raise serializers.ValidationError('resident_count cannot be negative')
        return value