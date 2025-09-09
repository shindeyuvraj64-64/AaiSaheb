/*
# Initial Database Schema for aai Saheb

This migration creates the initial database schema for the aai Saheb women's safety and empowerment platform.

## Tables Created:
1. users - User accounts and profiles
2. oauth - OAuth authentication tokens
3. emergency_contacts - User emergency contacts
4. sos_alerts - Emergency SOS alerts
5. safety_resources - Safety resources (police, hospitals, NGOs)
6. educational_modules - Educational content modules
7. user_progress - User progress in educational modules
8. government_schemes - Government schemes and benefits
9. job_opportunities - Employment opportunities
10. community_posts - Community forum posts
11. community_replies - Replies to community posts

## Security Features:
- Row Level Security (RLS) enabled on all tables
- Appropriate policies for data access
- Indexes for performance optimization
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url VARCHAR(500),
    age INTEGER CHECK (age >= 13 AND age <= 120),
    district VARCHAR(100),
    phone VARCHAR(20),
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL,
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- OAuth table
CREATE TABLE IF NOT EXISTS oauth (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255),
    token JSONB,
    browser_session_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, browser_session_key, provider)
);

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- SOS alerts table
CREATE TABLE IF NOT EXISTS sos_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    location_accuracy DECIMAL(8, 2),
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'resolved', 'cancelled', 'false_alarm')),
    priority VARCHAR(10) DEFAULT 'high' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    notes TEXT,
    response_time INTEGER,
    responder_id VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Safety resources table
CREATE TABLE IF NOT EXISTS safety_resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('police_station', 'hospital', 'ngo', 'helpline', 'women_center')),
    category VARCHAR(50),
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours VARCHAR(200),
    services_offered TEXT,
    languages_supported VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    last_verified TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Educational modules table
CREATE TABLE IF NOT EXISTS educational_modules (
    id SERIAL PRIMARY KEY,
    title_en VARCHAR(200) NOT NULL,
    title_hi VARCHAR(200),
    title_mr VARCHAR(200),
    description_en TEXT NOT NULL,
    description_hi TEXT,
    description_mr TEXT,
    content_en TEXT NOT NULL,
    content_hi TEXT,
    content_mr TEXT,
    category VARCHAR(100) NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'beginner' NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes INTEGER DEFAULT 0 NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    video_url VARCHAR(500),
    audio_url VARCHAR(500),
    pdf_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_featured BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES educational_modules(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0 NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    completed BOOLEAN DEFAULT false NOT NULL,
    time_spent_minutes INTEGER DEFAULT 0 NOT NULL,
    quiz_score DECIMAL(5, 2),
    quiz_attempts INTEGER DEFAULT 0 NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, module_id)
);

-- Government schemes table
CREATE TABLE IF NOT EXISTS government_schemes (
    id SERIAL PRIMARY KEY,
    name_en VARCHAR(200) NOT NULL,
    name_hi VARCHAR(200),
    name_mr VARCHAR(200),
    description_en TEXT NOT NULL,
    description_hi TEXT,
    description_mr TEXT,
    eligibility_en TEXT NOT NULL,
    eligibility_hi TEXT,
    eligibility_mr TEXT,
    benefits TEXT NOT NULL,
    application_process TEXT NOT NULL,
    documents_required TEXT NOT NULL,
    contact_info TEXT,
    website_url VARCHAR(500),
    scheme_type VARCHAR(50) NOT NULL CHECK (scheme_type IN ('central', 'state', 'district')),
    applicable_districts JSONB,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Job opportunities table
CREATE TABLE IF NOT EXISTS job_opportunities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    company VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    district VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('government', 'private', 'freelance', 'internship')),
    salary_range VARCHAR(100),
    experience_required VARCHAR(100),
    skills_required TEXT,
    application_deadline TIMESTAMP,
    application_url VARCHAR(500),
    contact_email VARCHAR(200),
    is_women_only BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Community posts table
CREATE TABLE IF NOT EXISTS community_posts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_anonymous BOOLEAN DEFAULT false NOT NULL,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    reply_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Community replies table
CREATE TABLE IF NOT EXISTS community_replies (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false NOT NULL,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_district_active ON users(district, is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_oauth_user_provider ON oauth(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_primary ON emergency_contacts(user_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_status ON sos_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON sos_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_location ON sos_alerts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);

CREATE INDEX IF NOT EXISTS idx_safety_resources_district_type ON safety_resources(district, type);
CREATE INDEX IF NOT EXISTS idx_safety_resources_location ON safety_resources(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_safety_resources_active ON safety_resources(is_active, is_verified);

CREATE INDEX IF NOT EXISTS idx_educational_modules_category ON educational_modules(category, is_active);
CREATE INDEX IF NOT EXISTS idx_educational_modules_order ON educational_modules(order_index);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(completed, completed_at);

CREATE INDEX IF NOT EXISTS idx_government_schemes_type ON government_schemes(scheme_type, is_active);

CREATE INDEX IF NOT EXISTS idx_job_opportunities_district_type ON job_opportunities(district, job_type);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_active ON job_opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_job_opportunities_deadline ON job_opportunities(application_deadline);

CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category, is_approved);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at);

CREATE INDEX IF NOT EXISTS idx_community_replies_post ON community_replies(post_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = current_setting('app.current_user_id', true));

-- RLS Policies for emergency_contacts table
CREATE POLICY "Users can manage own emergency contacts" ON emergency_contacts
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- RLS Policies for sos_alerts table
CREATE POLICY "Users can manage own SOS alerts" ON sos_alerts
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- RLS Policies for user_progress table
CREATE POLICY "Users can view own progress" ON user_progress
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- RLS Policies for community_posts table
CREATE POLICY "Users can view approved posts" ON community_posts
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can manage own posts" ON community_posts
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- RLS Policies for community_replies table
CREATE POLICY "Users can view approved replies" ON community_replies
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can manage own replies" ON community_replies
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_alerts_updated_at BEFORE UPDATE ON sos_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_resources_updated_at BEFORE UPDATE ON safety_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_educational_modules_updated_at BEFORE UPDATE ON educational_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_government_schemes_updated_at BEFORE UPDATE ON government_schemes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_opportunities_updated_at BEFORE UPDATE ON job_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();