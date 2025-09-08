from flask import render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import current_user
from app import app, db
from replit_auth import require_login, make_replit_blueprint
from models import User, EmergencyContact, SOSAlert, SafetyResource, EducationalModule, UserProgress, GovernmentScheme, JobOpportunity, CommunityPost, CommunityReply
from datetime import datetime
import json

app.register_blueprint(make_replit_blueprint(), url_prefix="/auth")

@app.before_request
def make_session_permanent():
    session.permanent = True

# Helper function to get user's preferred language
def get_user_language():
    if current_user.is_authenticated and current_user.preferred_language:
        return current_user.preferred_language
    return session.get('language', 'en')

# Helper function to get localized content
def get_localized_content(obj, field, lang=None):
    if not lang:
        lang = get_user_language()
    
    if lang == 'mr':
        return getattr(obj, f"{field}_mr", None) or getattr(obj, f"{field}_en")
    elif lang == 'hi':
        return getattr(obj, f"{field}_hi", None) or getattr(obj, f"{field}_en")
    else:
        return getattr(obj, f"{field}_en")

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    return render_template('index.html')

@app.route('/home')
@require_login
def home():
    # Get recent SOS alerts for user
    recent_alerts = SOSAlert.query.filter_by(user_id=current_user.id).order_by(SOSAlert.created_at.desc()).limit(5).all()
    
    # Get user's educational progress
    completed_modules = UserProgress.query.filter_by(user_id=current_user.id, completed=True).count()
    
    # Get nearby safety resources based on user's district
    safety_resources = SafetyResource.query.filter_by(district=current_user.district, is_active=True).limit(5).all() if current_user.district else []
    
    return render_template('home.html', 
                         recent_alerts=recent_alerts,
                         completed_modules=completed_modules,
                         safety_resources=safety_resources)

@app.route('/sos')
@require_login
def sos():
    # Get user's emergency contacts
    emergency_contacts = EmergencyContact.query.filter_by(user_id=current_user.id).all()
    return render_template('sos.html', emergency_contacts=emergency_contacts)

@app.route('/activate_sos', methods=['POST'])
@require_login
def activate_sos():
    try:
        data = request.get_json()
        
        # Create SOS alert
        alert = SOSAlert(
            user_id=current_user.id,
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            address=data.get('address'),
            notes=data.get('notes', 'Emergency SOS activated')
        )
        
        db.session.add(alert)
        db.session.commit()
        
        return jsonify({'success': True, 'alert_id': alert.id})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/cancel_sos', methods=['POST'])
@require_login
def cancel_sos():
    try:
        data = request.get_json()
        alert_id = data.get('alert_id')
        
        alert = SOSAlert.query.filter_by(id=alert_id, user_id=current_user.id).first()
        if alert:
            alert.status = 'cancelled'
            alert.resolved_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Alert not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/safety_resources')
@require_login
def safety_resources():
    # Get all districts for filter
    districts = db.session.query(SafetyResource.district.distinct()).filter(SafetyResource.is_active == True).all()
    districts = [d[0] for d in districts]
    
    # Filter by type and district
    resource_type = request.args.get('type', 'all')
    district = request.args.get('district', current_user.district or 'all')
    
    query = SafetyResource.query.filter_by(is_active=True)
    
    if resource_type != 'all':
        query = query.filter_by(type=resource_type)
    
    if district != 'all':
        query = query.filter_by(district=district)
    
    resources = query.all()
    
    return render_template('safety_resources.html', 
                         resources=resources,
                         districts=districts,
                         selected_type=resource_type,
                         selected_district=district)

@app.route('/education')
@require_login
def education():
    # Get all educational modules
    modules = EducationalModule.query.filter_by(is_active=True).all()
    
    # Get user's progress for each module
    user_progress = {}
    for module in modules:
        progress = UserProgress.query.filter_by(user_id=current_user.id, module_id=module.id).first()
        user_progress[module.id] = progress
    
    return render_template('education.html', 
                         modules=modules,
                         user_progress=user_progress,
                         get_localized_content=get_localized_content)

@app.route('/education/<int:module_id>')
@require_login
def education_module(module_id):
    module = EducationalModule.query.get_or_404(module_id)
    
    # Get or create user progress
    progress = UserProgress.query.filter_by(user_id=current_user.id, module_id=module_id).first()
    if not progress:
        progress = UserProgress(user_id=current_user.id, module_id=module_id)
        db.session.add(progress)
        db.session.commit()
    
    return render_template('education_module.html', 
                         module=module,
                         progress=progress,
                         get_localized_content=get_localized_content)

@app.route('/complete_module/<int:module_id>', methods=['POST'])
@require_login
def complete_module(module_id):
    progress = UserProgress.query.filter_by(user_id=current_user.id, module_id=module_id).first()
    if progress:
        progress.completed = True
        progress.progress_percentage = 100
        progress.completed_at = datetime.utcnow()
        db.session.commit()
        flash('Module completed successfully!', 'success')
    
    return redirect(url_for('education'))

@app.route('/government_schemes')
@require_login
def government_schemes():
    scheme_type = request.args.get('type', 'all')
    
    query = GovernmentScheme.query.filter_by(is_active=True)
    
    if scheme_type != 'all':
        query = query.filter_by(scheme_type=scheme_type)
    
    schemes = query.all()
    
    return render_template('government_schemes.html', 
                         schemes=schemes,
                         selected_type=scheme_type,
                         get_localized_content=get_localized_content)

@app.route('/scheme/<int:scheme_id>')
@require_login
def scheme_detail(scheme_id):
    scheme = GovernmentScheme.query.get_or_404(scheme_id)
    return render_template('scheme_detail.html', 
                         scheme=scheme,
                         get_localized_content=get_localized_content)

@app.route('/employment')
@require_login
def employment():
    job_type = request.args.get('type', 'all')
    district = request.args.get('district', current_user.district or 'all')
    
    query = JobOpportunity.query.filter_by(is_active=True)
    
    if job_type != 'all':
        query = query.filter_by(job_type=job_type)
    
    if district != 'all':
        query = query.filter_by(district=district)
    
    jobs = query.order_by(JobOpportunity.created_at.desc()).all()
    
    # Get unique districts
    districts = db.session.query(JobOpportunity.district.distinct()).filter(JobOpportunity.is_active == True).all()
    districts = [d[0] for d in districts]
    
    return render_template('employment.html', 
                         jobs=jobs,
                         districts=districts,
                         selected_type=job_type,
                         selected_district=district)

@app.route('/community')
@require_login
def community():
    category = request.args.get('category', 'all')
    
    query = CommunityPost.query.filter_by(is_approved=True)
    
    if category != 'all':
        query = query.filter_by(category=category)
    
    posts = query.order_by(CommunityPost.created_at.desc()).all()
    
    return render_template('community.html', 
                         posts=posts,
                         selected_category=category)

@app.route('/community/new', methods=['GET', 'POST'])
@require_login
def new_community_post():
    if request.method == 'POST':
        title = request.form.get('title')
        content = request.form.get('content')
        category = request.form.get('category')
        is_anonymous = 'anonymous' in request.form
        
        post = CommunityPost(
            user_id=current_user.id,
            title=title,
            content=content,
            category=category,
            is_anonymous=is_anonymous,
            is_approved=True  # Auto-approve for now
        )
        
        db.session.add(post)
        db.session.commit()
        
        flash('Your post has been submitted successfully!', 'success')
        return redirect(url_for('community'))
    
    return render_template('new_post.html')

@app.route('/profile')
@require_login
def profile():
    emergency_contacts = EmergencyContact.query.filter_by(user_id=current_user.id).all()
    return render_template('profile.html', emergency_contacts=emergency_contacts)

@app.route('/update_profile', methods=['POST'])
@require_login
def update_profile():
    current_user.age = request.form.get('age')
    current_user.district = request.form.get('district')
    current_user.phone = request.form.get('phone')
    current_user.preferred_language = request.form.get('preferred_language', 'en')
    
    db.session.commit()
    flash('Profile updated successfully!', 'success')
    return redirect(url_for('profile'))

@app.route('/add_emergency_contact', methods=['POST'])
@require_login
def add_emergency_contact():
    name = request.form.get('name')
    phone = request.form.get('phone')
    relationship = request.form.get('relationship')
    is_primary = 'is_primary' in request.form
    
    # If this is primary, make all others non-primary
    if is_primary:
        EmergencyContact.query.filter_by(user_id=current_user.id).update({'is_primary': False})
    
    contact = EmergencyContact(
        user_id=current_user.id,
        name=name,
        phone=phone,
        relationship=relationship,
        is_primary=is_primary
    )
    
    db.session.add(contact)
    db.session.commit()
    
    flash('Emergency contact added successfully!', 'success')
    return redirect(url_for('profile'))

@app.route('/set_language/<lang>')
def set_language(lang):
    session['language'] = lang
    if current_user.is_authenticated:
        current_user.preferred_language = lang
        db.session.commit()
    return redirect(request.referrer or url_for('index'))

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500
