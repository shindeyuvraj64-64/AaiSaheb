import hashlib
import secrets
from datetime import datetime, timedelta
from flask import current_app, request
from flask_login import current_user
import logging

logger = logging.getLogger(__name__)

class SecurityManager:
    """Security utilities for the application"""
    
    @staticmethod
    def generate_csrf_token():
        """Generate CSRF token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def hash_sensitive_data(data):
        """Hash sensitive data like phone numbers for privacy"""
        if not data:
            return None
        
        salt = current_app.config.get('SECRET_KEY', 'default-salt')
        return hashlib.sha256(f"{data}{salt}".encode()).hexdigest()
    
    @staticmethod
    def log_security_event(event_type, details=None):
        """Log security-related events"""
        user_id = current_user.id if current_user.is_authenticated else 'anonymous'
        ip_address = request.remote_addr if request else 'unknown'
        
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': ip_address,
            'details': details or {}
        }
        
        logger.warning(f"Security Event: {log_data}")
    
    @staticmethod
    def is_safe_redirect_url(url):
        """Check if redirect URL is safe"""
        if not url:
            return False
        
        # Only allow relative URLs or same-origin URLs
        if url.startswith('/') and not url.startswith('//'):
            return True
        
        return False
    
    @staticmethod
    def encrypt_location_data(latitude, longitude):
        """Encrypt location data for storage"""
        # In production, use proper encryption
        # This is a placeholder implementation
        return {
            'encrypted_lat': str(latitude),
            'encrypted_lon': str(longitude),
            'encrypted': True
        }
    
    @staticmethod
    def decrypt_location_data(encrypted_data):
        """Decrypt location data"""
        # In production, use proper decryption
        # This is a placeholder implementation
        if encrypted_data.get('encrypted'):
            return {
                'latitude': float(encrypted_data['encrypted_lat']),
                'longitude': float(encrypted_data['encrypted_lon'])
            }
        return encrypted_data

class AuditLogger:
    """Audit logging for compliance"""
    
    @staticmethod
    def log_user_action(action, resource=None, details=None):
        """Log user actions for audit trail"""
        if not current_user.is_authenticated:
            return
        
        audit_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': current_user.id,
            'action': action,
            'resource': resource,
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent') if request else None,
            'details': details or {}
        }
        
        logger.info(f"Audit Log: {audit_data}")
    
    @staticmethod
    def log_sos_event(alert_id, event_type, details=None):
        """Log SOS-related events"""
        audit_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'alert_id': alert_id,
            'event_type': event_type,
            'user_id': current_user.id if current_user.is_authenticated else None,
            'details': details or {}
        }
        
        logger.critical(f"SOS Event: {audit_data}")

def require_verified_user(f):
    """Decorator to require verified user"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        
        if not current_user.email_verified:
            flash('Please verify your email address to access this feature.', 'warning')
            return redirect(url_for('main.profile'))
        
        return f(*args, **kwargs)
    return decorated_function