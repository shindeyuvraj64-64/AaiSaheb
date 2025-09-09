import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime
from app import create_app, db
from app.models import User, SOSAlert, EmergencyContact
from app.services.sos_service import SOSService

class TestSOSService(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Create test user
        self.user = User(
            id='test_user_123',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            district='Mumbai City'
        )
        db.session.add(self.user)
        
        # Create emergency contact
        self.contact = EmergencyContact(
            user_id=self.user.id,
            name='Emergency Contact',
            phone='+919876543210',
            relationship='Friend',
            is_primary=True
        )
        db.session.add(self.contact)
        db.session.commit()
    
    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_create_sos_alert_success(self):
        """Test successful SOS alert creation"""
        location_data = {
            'latitude': 19.0760,
            'longitude': 72.8777,
            'address': 'Mumbai, Maharashtra',
            'accuracy': 10.0
        }
        
        with patch('app.services.sos_service.SOSService._notify_emergency_contacts') as mock_notify:
            alert = SOSService.create_sos_alert(
                user_id=self.user.id,
                location_data=location_data,
                notes='Test emergency'
            )
            
            self.assertIsNotNone(alert)
            self.assertEqual(alert.user_id, self.user.id)
            self.assertEqual(alert.status, 'active')
            self.assertEqual(alert.priority, 'critical')
            self.assertEqual(alert.latitude, 19.0760)
            self.assertEqual(alert.longitude, 72.8777)
            mock_notify.assert_called_once()
    
    def test_cancel_sos_alert_success(self):
        """Test successful SOS alert cancellation"""
        # Create alert first
        alert = SOSAlert(
            user_id=self.user.id,
            latitude=19.0760,
            longitude=72.8777,
            status='active'
        )
        db.session.add(alert)
        db.session.commit()
        
        # Cancel the alert
        result = SOSService.cancel_sos_alert(alert.id, self.user.id, 'Test cancellation')
        
        self.assertTrue(result)
        
        # Verify alert is cancelled
        updated_alert = SOSAlert.query.get(alert.id)
        self.assertEqual(updated_alert.status, 'cancelled')
        self.assertIsNotNone(updated_alert.resolved_at)
    
    def test_cancel_nonexistent_alert(self):
        """Test cancelling non-existent alert"""
        result = SOSService.cancel_sos_alert(999, self.user.id, 'Test')
        self.assertFalse(result)
    
    @patch('app.services.notification_service.NotificationService.send_sms')
    @patch('app.services.notification_service.NotificationService.send_whatsapp')
    def test_notify_emergency_contacts(self, mock_whatsapp, mock_sms):
        """Test emergency contact notification"""
        alert = SOSAlert(
            user_id=self.user.id,
            latitude=19.0760,
            longitude=72.8777,
            status='active'
        )
        db.session.add(alert)
        db.session.commit()
        
        SOSService._notify_emergency_contacts(alert)
        
        mock_sms.assert_called_once()
        mock_whatsapp.assert_called_once()
    
    def test_get_user_alerts(self):
        """Test retrieving user's alerts"""
        # Create multiple alerts
        for i in range(3):
            alert = SOSAlert(
                user_id=self.user.id,
                latitude=19.0760 + i * 0.001,
                longitude=72.8777 + i * 0.001,
                status='resolved' if i > 0 else 'active'
            )
            db.session.add(alert)
        db.session.commit()
        
        alerts = SOSService.get_user_alerts(self.user.id, limit=5)
        
        self.assertEqual(len(alerts), 3)
        # Should be ordered by created_at desc
        self.assertEqual(alerts[0].status, 'resolved')
    
    def test_get_active_alerts_count(self):
        """Test getting count of active alerts"""
        # Create alerts with different statuses
        statuses = ['active', 'active', 'resolved', 'cancelled']
        for status in statuses:
            alert = SOSAlert(
                user_id=self.user.id,
                latitude=19.0760,
                longitude=72.8777,
                status=status
            )
            db.session.add(alert)
        db.session.commit()
        
        count = SOSService.get_active_alerts_count()
        self.assertEqual(count, 2)  # Only 2 active alerts

if __name__ == '__main__':
    unittest.main()