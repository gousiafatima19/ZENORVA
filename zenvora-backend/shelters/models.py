from django.db import models


class Shelter(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    contact = models.CharField(max_length=100, blank=True)

    resident_count = models.IntegerField(default=0)
    age_groups = models.JSONField(default=list, blank=True)
    needs = models.JSONField(default=list, blank=True)
    dietary_requirements = models.JSONField(default=list, blank=True)
    allergy_flags = models.JSONField(default=list, blank=True)

    deadline = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_demo = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name