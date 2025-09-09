import logging
from datetime import datetime
from flask import current_app
from app import db
from app.models import SOSAlert, EmergencyContact, User
from app.utils.security import AuditLogger
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class SOSService:
    """Service for handling SOS alerts and emergency responses"""
    
    @staticmethod
    def create_sos_alert(user_id, location_data, notes=None):
        """Create a new SOS alert"""
        try:
            alert = SOSAlert(
                user_id=user_id,
                latitude=location_data.get('latitude'),
                longitude=location_data.get('longitude'),
                address=location_data.get('address'),
                location_accuracy=location_data.get('accuracy'),
                notes=notes,
                status='active',
                priority='critical'
            )
            
            db.session.add(alert)
            db.session.commit()
            
            # Log the SOS event
            AuditLogger.log_sos_event(
                alert.id, 
                'sos_created',
                {'location': location_data, 'notes': notes}
            )
            
            # Notify emergency contacts
            SOSService._notify_emergency_contacts(alert)
            
            # Notify authorities if configured
            SOSService._notify_authorities(alert)
            
            logger.critical(f"SOS Alert created: {alert.id} for user {user_id}")
            
            return alert
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create SOS alert: {str(e)}")
            raise
    
    @staticmethod
    def cancel_sos_alert(alert_id, user_id, reason=None):
        """Cancel an active SOS alert"""
        try:
            alert = SOSAlert.query.filter_by(
                id=alert_id, 
                user_id=user_id, 
                status='active'
            ).first()
            
            if not alert:
                return False
            
            alert.status = 'cancelled'
            alert.resolved_at = datetime.utcnow()
            alert.notes = f"{alert.notes or ''}\nCancelled: {reason or 'User cancelled'}"
            
            db.session.commit()
            
            # Log the cancellation
            AuditLogger.log_sos_event(
                alert.id,
                'sos_cancelled',
                {'reason': reason}
            )
            
            # Notify contacts about cancellation
            SOSService._notify_cancellation(alert)
            
            logger.info(f"SOS Alert cancelled: {alert_id}")
            
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to cancel SOS alert: {str(e)}")
            return False
    
    @staticmethod
    def _notify_emergency_contacts(alert):
        """Notify user's emergency contacts"""
        try:
            contacts = EmergencyContact.query.filter_by(
                user_id=alert.user_id
            ).order_by(EmergencyContact.is_primary.desc()).all()
            
            user = User.query.get(alert.user_id)
            
            for contact in contacts:
                message = SOSService._create_emergency_message(user, alert, contact)
                
                # Send SMS notification
                NotificationService.send_sms(contact.phone, message)
                
                # Send WhatsApp message if possible
                NotificationService.send_whatsapp(contact.phone, message)
                
                logger.info(f"Notified emergency contact: {contact.name}")
                
        except Exception as e:
            logger.error(f"Failed to notify emergency contacts: {str(e)}")
    
    @staticmethod
    def _notify_authorities(alert):
        """Notify relevant authorities"""
        try:
            # This would integrate with local emergency services
            # For now, we'll log the alert for manual processing
            
            user = User.query.get(alert.user_id)
            
            authority_message = {
                'alert_id': alert.id,
                'user_info': {
                    'name': user.get_full_name(),
                    'district': user.district,
                    'phone': user.phone
                },
                'location': {
                    'latitude': alert.latitude,
                    'longitude': alert.longitude,
                    'address': alert.address
                },
                'timestamp': alert.created_at.isoformat(),
                'priority': alert.priority
            }
            
            logger.critical(f"AUTHORITY NOTIFICATION: {authority_message}")
            
            # In production, this would send to emergency services API
            
        except Exception as e:
            logger.error(f"Failed to notify authorities: {str(e)}")
    
    @staticmethod
    def _create_emergency_message(user, alert, contact):
        """Create emergency notification message"""
        location_text = ""
        if alert.address:
            location_text = f"Location: {alert.address}"
        elif alert.latitude and alert.longitude:
            location_text = f"Coordinates: {alert.latitude}, {alert.longitude}"
        
        message = f"""🚨 EMERGENCY ALERT 🚨

{user.get_full_name()} needs immediate help!

{location_text}
Time: {alert.created_at.strftime('%Y-%m-%d %H:%M:%S')}

Please call immediately or contact emergency services:
Emergency: 112
Women Helpline: 1091

This is an automated alert from aai Saheb Safety Platform."""
        
        return message
    
    @staticmethod
    def _notify_cancellation(alert):
        """Notify contacts about alert cancellation"""
        try:
            contacts = EmergencyContact.query.filter_by(
                user_id=alert.user_id
            ).all()
            
            user = User.query.get(alert.user_id)
            
            message = f"""✅ ALERT CANCELLED

{user.get_full_name()}'s emergency alert has been cancelled.

Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}

They are now safe.

- aai Saheb Safety Platform"""
            
            for contact in contacts:
                NotificationService.send_sms(contact.phone, message)
                
        except Exception as e:
            logger.error(f"Failed to notify cancellation: {str(e)}")
    
    @staticmethod
    def get_user_alerts(user_id, limit=10):
        """Get user's recent SOS alerts"""
        return SOSAlert.query.filter_by(user_id=user_id)\
                           .order_by(SOSAlert.created_at.desc())\
                           .limit(limit).all()
    
    @staticmethod
    def get_active_alerts_count():
        """Get count of active alerts (for admin dashboard)"""
        return SOSAlert.query.filter_by(status='active').count()