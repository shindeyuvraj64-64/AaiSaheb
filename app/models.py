from datetime import datetime
from flask_login import UserMixin
from flask_dance.consumer.storage.sqla import OAuthConsumerMixin
from sqlalchemy import UniqueConstraint, Index, text
from app import db

class User(UserMixin, db.Model):
    """User model with enhanced security and indexing"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(255), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=True, index=True)
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    profile_image_url = db.Column(db.String(500), nullable=True)
    
    # Profile fields
    age = db.Column(db.Integer, nullable=True)
    district = db.Column(db.String(100), nullable=True, index=True)
    phone = db.Column(db.String(20), nullable=True)
    preferred_language = db.Column(db.String(10), default='en', nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False)
    
    # Security fields
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    login_count = db.Column(db.Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    emergency_contacts = db.relationship('EmergencyContact', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    sos_alerts = db.relationship('SOSAlert', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    user_progress = db.relationship('UserProgress', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    community_posts = db.relationship('CommunityPost', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        Index('idx_user_district_active', 'district', 'is_active'),
        Index('idx_user_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    def get_full_name(self):
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.email or "User"
    
    def update_last_login(self):
        """Update last login timestamp and count"""
        self.last_login = datetime.utcnow()
        self.login_count += 1
        db.session.commit()

class OAuth(OAuthConsumerMixin, db.Model):
    """OAuth model for authentication"""
    __tablename__ = 'oauth'
    
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    browser_session_key = db.Column(db.String(255), nullable=False)
    user = db.relationship('User', backref='oauth_tokens')

    __table_args__ = (
        UniqueConstraint(
            'user_id',
            'browser_session_key', 
            'provider',
            name='uq_user_browser_session_key_provider'
        ),
        Index('idx_oauth_user_provider', 'user_id', 'provider'),
    )

class EmergencyContact(db.Model):
    """Emergency contacts with validation"""
    __tablename__ = 'emergency_contacts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    relationship = db.Column(db.String(50), nullable=False)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_emergency_contact_user', 'user_id'),
        Index('idx_emergency_contact_primary', 'user_id', 'is_primary'),
    )
    
    def __repr__(self):
        return f'<EmergencyContact {self.name} - {self.phone}>'

class SOSAlert(db.Model):
    """SOS alerts with enhanced tracking"""
    __tablename__ = 'sos_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    
    # Location data
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.Text, nullable=True)
    location_accuracy = db.Column(db.Float, nullable=True)
    
    # Alert details
    status = db.Column(db.String(20), default='active', nullable=False)  # active, resolved, cancelled, false_alarm
    priority = db.Column(db.String(10), default='high', nullable=False)  # low, medium, high, critical
    notes = db.Column(db.Text, nullable=True)
    
    # Response tracking
    response_time = db.Column(db.Integer, nullable=True)  # seconds
    responder_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_sos_user_status', 'user_id', 'status'),
        Index('idx_sos_created_at', 'created_at'),
        Index('idx_sos_location', 'latitude', 'longitude'),
    )
    
    def __repr__(self):
        return f'<SOSAlert {self.id} - {self.status}>'

class SafetyResource(db.Model):
    """Safety resources with enhanced categorization"""
    __tablename__ = 'safety_resources'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # police_station, hospital, ngo, helpline
    category = db.Column(db.String(50), nullable=True)  # women_police, emergency_hospital, etc.
    
    # Contact information
    address = db.Column(db.Text, nullable=False)
    district = db.Column(db.String(100), nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    website = db.Column(db.String(500), nullable=True)
    
    # Location data
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    
    # Operational details
    operating_hours = db.Column(db.String(200), nullable=True)
    services_offered = db.Column(db.Text, nullable=True)
    languages_supported = db.Column(db.String(100), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    last_verified = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        Index('idx_safety_resource_district_type', 'district', 'type'),
        Index('idx_safety_resource_location', 'latitude', 'longitude'),
        Index('idx_safety_resource_active', 'is_active', 'is_verified'),
    )
    
    def __repr__(self):
        return f'<SafetyResource {self.name} - {self.type}>'

class EducationalModule(db.Model):
    """Educational modules with multilingual support"""
    __tablename__ = 'educational_modules'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Multilingual titles
    title_en = db.Column(db.String(200), nullable=False)
    title_hi = db.Column(db.String(200), nullable=True)
    title_mr = db.Column(db.String(200), nullable=True)
    
    # Multilingual descriptions
    description_en = db.Column(db.Text, nullable=False)
    description_hi = db.Column(db.Text, nullable=True)
    description_mr = db.Column(db.Text, nullable=True)
    
    # Multilingual content
    content_en = db.Column(db.Text, nullable=False)
    content_hi = db.Column(db.Text, nullable=True)
    content_mr = db.Column(db.Text, nullable=True)
    
    # Module metadata
    category = db.Column(db.String(100), nullable=False, index=True)
    difficulty_level = db.Column(db.String(20), default='beginner', nullable=False)
    duration_minutes = db.Column(db.Integer, default=0, nullable=False)
    order_index = db.Column(db.Integer, default=0, nullable=False)
    
    # Media and resources
    video_url = db.Column(db.String(500), nullable=True)
    audio_url = db.Column(db.String(500), nullable=True)
    pdf_url = db.Column(db.String(500), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user_progress = db.relationship('UserProgress', backref='module', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        Index('idx_educational_module_category', 'category', 'is_active'),
        Index('idx_educational_module_order', 'order_index'),
    )
    
    def __repr__(self):
        return f'<EducationalModule {self.title_en}>'

class UserProgress(db.Model):
    """User progress tracking with analytics"""
    __tablename__ = 'user_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.id'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('educational_modules.id'), nullable=False)
    
    # Progress tracking
    progress_percentage = db.Column(db.Integer, default=0, nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    time_spent_minutes = db.Column(db.Integer, default=0, nullable=False)
    
    # Quiz and assessment
    quiz_score = db.Column(db.Float, nullable=True)
    quiz_attempts = db.Column(db.Integer, default=0, nullable=False)
    
    # Timestamps
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'module_id', name='uq_user_module_progress'),
        Index('idx_user_progress_user', 'user_id'),
        Index('idx_user_progress_completed', 'completed', 'completed_at'),
    )
    
    def __repr__(self):
        return f'<UserProgress {self.user_id} - Module {self.module_id}>'

# Additional models for government schemes, jobs, community posts would follow similar patterns...