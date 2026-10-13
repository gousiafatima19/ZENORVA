from django.db import models


class DietaryProfile(models.Model):
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE,
                                related_name='dietary_profile')
    allergies = models.JSONField(default=list, blank=True)
    preferences = models.JSONField(default=list, blank=True)
    medical_restrictions = models.JSONField(default=list, blank=True)
    nutrition_prefs = models.JSONField(default=list, blank=True)
    budget_preference = models.CharField(max_length=30, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"DietaryProfile({self.user.username})"