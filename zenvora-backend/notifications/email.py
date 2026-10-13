"""
Email helper for ZENVORA notifications.
Uses Resend via django-anymail.
Never raises on failure — logs and returns False so API calls don't break.
"""
import logging

from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def send_notification_email(user, subject, message):
    """
    Send an email to a user if they have an email set.
    Returns True if sent, False otherwise.
    """
    if not user or not user.email:
        return False

    try:
        sent = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f"Email sent to {user.email}: {subject} (result={sent})")
        return bool(sent)
    except Exception as e:
        logger.warning(f"Email to {user.email} failed: {e}")
        return False


def send_donation_status_email(donation, new_status):
    subject = f"ZENVORA: Donation #{donation.id} is now '{new_status}'"
    message = (
        f"Hi {donation.donor.username},\n\n"
        f"Your donation #{donation.id} ({donation.food_type}) "
        f"has moved to status: {new_status}.\n\n"
        f"Thank you for helping reduce food waste.\n\n"
        f"— ZENVORA"
    )
    return send_notification_email(donation.donor, subject, message)


def send_shelter_response_email(donation):
    shelter_name = donation.shelter.name if donation.shelter else 'N/A'
    subject = f"ZENVORA: Shelter {donation.shelter_response} donation #{donation.id}"
    message = (
        f"Hi {donation.donor.username},\n\n"
        f"Shelter '{shelter_name}' has responded: {donation.shelter_response}.\n"
        f"Note from shelter: {donation.shelter_response_note or '(none)'}\n\n"
        f"— ZENVORA"
    )
    return send_notification_email(donation.donor, subject, message)