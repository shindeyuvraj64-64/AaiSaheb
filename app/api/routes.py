from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from app.models import SOSAlert, SafetyResource, User
from app.services.sos_service import SOSService
from app.utils.validators import validate_sos_data, rate_limit
from app.utils.security import AuditLogger
import logging

bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

@bp.route('/sos/activate', methods=['POST'])
@login_required
@rate_limit(max_requests=5, window=300)  # 5 requests per 5 minutes
def activate_sos():
    """Activate SOS alert via API"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate SOS data
        errors, validated_data = validate_sos_data(data)
        if errors:
            return jsonify({'errors': errors}), 400
        
        # Create SOS alert
        alert = SOSService.create_sos_alert(
            user_id=current_user.id,
            location_data={
                'latitude': validated_data.get('latitude'),
                'longitude': validated_data.get('longitude'),
                'address': validated_data.get('address'),
                'accuracy': validated_data.get('accuracy')
            },
            notes=validated_data.get('notes')
        )
        
        return jsonify({
            'success': True,
            'alert_id': alert.id,
            'message': 'SOS alert activated successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"SOS activation failed: {str(e)}")
        return jsonify({'error': 'Failed to activate SOS'}), 500

@bp.route('/sos/cancel', methods=['POST'])
@login_required
def cancel_sos():
    """Cancel SOS alert via API"""
    try:
        data = request.get_json()
        alert_id = data.get('alert_id')
        reason = data.get('reason')
        
        if not alert_id:
            return jsonify({'error': 'Alert ID required'}), 400
        
        success = SOSService.cancel_sos_alert(alert_id, current_user.id, reason)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'SOS alert cancelled successfully'
            })
        else:
            return jsonify({'error': 'Failed to cancel alert'}), 400
            
    except Exception as e:
        logger.error(f"SOS cancellation failed: {str(e)}")
        return jsonify({'error': 'Failed to cancel SOS'}), 500

@bp.route('/safety-resources', methods=['GET'])
@login_required
def get_safety_resources():
    """Get safety resources with filtering"""
    try:
        # Get query parameters
        resource_type = request.args.get('type', 'all')
        district = request.args.get('district', current_user.district)
        latitude = request.args.get('lat', type=float)
        longitude = request.args.get('lon', type=float)
        radius = request.args.get('radius', 10, type=int)  # km
        
        # Build query
        query = SafetyResource.query.filter_by(is_active=True)
        
        if resource_type != 'all':
            query = query.filter_by(type=resource_type)
        
        if district and district != 'all':
            query = query.filter_by(district=district)
        
        # If location provided, filter by proximity
        if latitude and longitude:
            # This is a simplified distance calculation
            # In production, use PostGIS or similar for accurate geo queries
            query = query.filter(
                SafetyResource.latitude.isnot(None),
                SafetyResource.longitude.isnot(None)
            )
        
        resources = query.limit(50).all()
        
        # Convert to JSON
        resources_data = []
        for resource in resources:
            resources_data.append({
                'id': resource.id,
                'name': resource.name,
                'type': resource.type,
                'address': resource.address,
                'district': resource.district,
                'phone': resource.phone,
                'latitude': resource.latitude,
                'longitude': resource.longitude,
                'operating_hours': resource.operating_hours,
                'services_offered': resource.services_offered
            })
        
        return jsonify({
            'success': True,
            'resources': resources_data,
            'count': len(resources_data)
        })
        
    except Exception as e:
        logger.error(f"Failed to get safety resources: {str(e)}")
        return jsonify({'error': 'Failed to fetch resources'}), 500

@bp.route('/user/location', methods=['POST'])
@login_required
def update_user_location():
    """Update user's current location (for safety features)"""
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not latitude or not longitude:
            return jsonify({'error': 'Latitude and longitude required'}), 400
        
        # Store location in session or cache (not in database for privacy)
        # This would be used for nearby resource recommendations
        
        AuditLogger.log_user_action('location_update', details={
            'latitude': latitude,
            'longitude': longitude
        })
        
        return jsonify({
            'success': True,
            'message': 'Location updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Failed to update location: {str(e)}")
        return jsonify({'error': 'Failed to update location'}), 500

@bp.route('/alerts/history', methods=['GET'])
@login_required
def get_alert_history():
    """Get user's SOS alert history"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 50)
        
        alerts = SOSAlert.query.filter_by(user_id=current_user.id)\
                              .order_by(SOSAlert.created_at.desc())\
                              .paginate(page=page, per_page=per_page, error_out=False)
        
        alerts_data = []
        for alert in alerts.items:
            alerts_data.append({
                'id': alert.id,
                'status': alert.status,
                'priority': alert.priority,
                'address': alert.address,
                'notes': alert.notes,
                'created_at': alert.created_at.isoformat(),
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            })
        
        return jsonify({
            'success': True,
            'alerts': alerts_data,
            'pagination': {
                'page': alerts.page,
                'pages': alerts.pages,
                'per_page': alerts.per_page,
                'total': alerts.total
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get alert history: {str(e)}")
        return jsonify({'error': 'Failed to fetch alert history'}), 500

@bp.route('/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0'
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# Error handlers for API
@bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@bp.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@bp.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden'}), 403

@bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@bp.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500