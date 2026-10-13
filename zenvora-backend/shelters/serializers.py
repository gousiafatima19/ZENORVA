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