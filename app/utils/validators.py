import re
from functools import wraps
from flask import request, jsonify, current_app
from flask_login import current_user

def validate_phone_number(phone):
    """Validate Indian phone number format"""
    if not phone:
        return False
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Check for valid Indian mobile number patterns
    patterns = [
        r'^[6-9]\d{9}$',  # 10 digit mobile
        r'^91[6-9]\d{9}$',  # With country code
        r'^0[6-9]\d{9}$'   # With leading zero
    ]
    
    return any(re.match(pattern, digits) for pattern in patterns)

def validate_email(email):
    """Validate email format"""
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_district(district):
    """Validate Maharashtra district"""
    maharashtra_districts = {
        'Mumbai City', 'Mumbai Suburban', 'Thane', 'Palghar', 'Raigad', 
        'Ratnagiri', 'Sindhudurg', 'Pune', 'Solapur', 'Satara', 'Kolhapur', 
        'Sangli', 'Nashik', 'Dhule', 'Nandurbar', 'Jalgaon', 'Ahmednagar',
        'Aurangabad', 'Jalna', 'Beed', 'Hingoli', 'Parbhani', 'Nanded',
        'Latur', 'Osmanabad', 'Amravati', 'Akola', 'Washim', 'Buldhana',
        'Yavatmal', 'Nagpur', 'Wardha', 'Bhandara', 'Gondia', 'Chandrapur',
        'Gadchiroli'
    }
    return district in maharashtra_districts

def validate_coordinates(latitude, longitude):
    """Validate GPS coordinates for Maharashtra region"""
    if not latitude or not longitude:
        return False
    
    try:
        lat = float(latitude)
        lon = float(longitude)
        
        # Maharashtra approximate bounds
        if 15.6 <= lat <= 22.0 and 72.6 <= lon <= 80.9:
            return True
    except (ValueError, TypeError):
        pass
    
    return False

def rate_limit(max_requests=10, window=60):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Simple in-memory rate limiting (use Redis in production)
            client_id = request.remote_addr
            if current_user.is_authenticated:
                client_id = current_user.id
            
            # This is a simplified implementation
            # In production, use Redis or similar for distributed rate limiting
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def sanitize_input(text, max_length=None):
    """Sanitize user input"""
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>"\']', '', str(text))
    
    # Limit length if specified
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()

def validate_sos_data(data):
    """Validate SOS alert data"""
    errors = []
    
    if 'latitude' in data and 'longitude' in data:
        if not validate_coordinates(data['latitude'], data['longitude']):
            errors.append("Invalid coordinates")
    
    if 'notes' in data:
        data['notes'] = sanitize_input(data['notes'], 500)
    
    return errors, data