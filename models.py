from datetime import datetime
from app import db
from flask_dance.consumer.storage.sqla import OAuthConsumerMixin
from flask_login import UserMixin
from sqlalchemy import UniqueConstraint

# User model for Replit Auth
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=True)
    first_name = db.Column(db.String, nullable=True)
    last_name = db.Column(db.String, nullable=True)
    profile_image_url = db.Column(db.String, nullable=True)
    
    # Additional profile fields
    age = db.Column(db.Integer, nullable=True)
    district = db.Column(db.String, nullable=True)
    phone = db.Column(db.String, nullable=True)
    preferred_language = db.Column(db.String, default='marathi')
    role = db.Column(db.String, default='user')  # user, volunteer, moderator, admin
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# OAuth model for Replit Auth
class OAuth(OAuthConsumerMixin, db.Model):
    user_id = db.Column(db.String, db.ForeignKey(User.id))
    browser_session_key = db.Column(db.String, nullable=False)
    user = db.relationship(User)

    __table_args__ = (UniqueConstraint(
        'user_id',
        'browser_session_key',
        'provider',
        name='uq_user_browser_session_key_provider',
    ),)

# Emergency contacts
class EmergencyContact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    relationship = db.Column(db.String(50), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# SOS alerts
class SOSAlert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='active')  # active, resolved, cancelled
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

# Safety resources
class SafetyResource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # police_station, hospital, ngo, helpline
    address = db.Column(db.Text, nullable=False)
    district = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Educational content
class EducationalModule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title_en = db.Column(db.String(200), nullable=False)
    title_hi = db.Column(db.String(200), nullable=True)
    title_mr = db.Column(db.String(200), nullable=True)
    description_en = db.Column(db.Text, nullable=False)
    description_hi = db.Column(db.Text, nullable=True)
    description_mr = db.Column(db.Text, nullable=True)
    content_en = db.Column(db.Text, nullable=False)
    content_hi = db.Column(db.Text, nullable=True)
    content_mr = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(100), nullable=False)
    duration_minutes = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# User progress in educational modules
class UserProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('educational_module.id'), nullable=False)
    progress_percentage = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

# Government schemes
class GovernmentScheme(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name_en = db.Column(db.String(200), nullable=False)
    name_hi = db.Column(db.String(200), nullable=True)
    name_mr = db.Column(db.String(200), nullable=True)
    description_en = db.Column(db.Text, nullable=False)
    description_hi = db.Column(db.Text, nullable=True)
    description_mr = db.Column(db.Text, nullable=True)
    eligibility_en = db.Column(db.Text, nullable=False)
    eligibility_hi = db.Column(db.Text, nullable=True)
    eligibility_mr = db.Column(db.Text, nullable=True)
    benefits = db.Column(db.Text, nullable=False)
    application_process = db.Column(db.Text, nullable=False)
    documents_required = db.Column(db.Text, nullable=False)
    contact_info = db.Column(db.Text, nullable=True)
    website_url = db.Column(db.String(500), nullable=True)
    scheme_type = db.Column(db.String(50), nullable=False)  # central, state, district
    applicable_districts = db.Column(db.Text, nullable=True)  # JSON array of district names
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Employment opportunities
class JobOpportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    job_type = db.Column(db.String(50), nullable=False)  # government, private, freelance
    salary_range = db.Column(db.String(100), nullable=True)
    experience_required = db.Column(db.String(100), nullable=True)
    skills_required = db.Column(db.Text, nullable=True)
    application_deadline = db.Column(db.DateTime, nullable=True)
    application_url = db.Column(db.String(500), nullable=True)
    contact_email = db.Column(db.String(200), nullable=True)
    is_women_only = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Community forum posts
class CommunityPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    is_anonymous = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)
    reply_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Community post replies
class CommunityReply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('community_post.id'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_anonymous = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
