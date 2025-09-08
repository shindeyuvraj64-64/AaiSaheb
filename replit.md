# aai Saheb - Women's Safety & Empowerment Platform

## Overview

aai Saheb is a comprehensive women's safety and empowerment platform specifically designed for Maharashtra, India. The application serves as both a critical safety tool and an empowerment resource, providing emergency SOS capabilities, educational modules, employment opportunities, government scheme information, and community support. The platform addresses the urgent need for women's safety while simultaneously focusing on long-term empowerment through education, skill development, and economic opportunities.

The application is built as a web-based platform with Progressive Web App (PWA) capabilities, making it accessible across devices while providing native app-like functionality. It serves women across all 36 districts of Maharashtra, offering localized content in Marathi (primary), Hindi, and English.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

**Web Framework & Backend**
The application uses Flask as the primary web framework with SQLAlchemy for database operations. The architecture follows a traditional MVC pattern with clear separation between models, routes, and templates. The backend is designed for scalability with connection pooling and proper session management.

**Authentication System**
Authentication is handled through Replit Auth integration using OAuth2 flow with Flask-Dance. The system supports social login and maintains user sessions with browser-specific storage. User roles include regular users, volunteers, moderators, and admins, each with different access levels.

**Database Design**
The application uses PostgreSQL as the primary database with SQLAlchemy ORM. Key entities include Users (with profile and location data), EmergencyContacts, SOSAlerts (for emergency incidents), SafetyResources (police stations, hospitals, NGOs), EducationalModules, UserProgress, GovernmentSchemes, JobOpportunities, and CommunityPosts. The schema supports multilingual content storage with separate fields for Marathi, Hindi, and English.

**Frontend Architecture**
The frontend uses server-side rendered templates with Bootstrap 5 for responsive design. The UI implements a luxury design language with Material Design principles, featuring a color palette of deep indigo primary (#3F51B5) and saffron accent (#FF9800). The design supports RTL languages and includes custom CSS with CSS variables for consistent theming.

**Progressive Web App (PWA)**
The application includes full PWA capabilities with service worker implementation for offline functionality, app manifest for installation, and caching strategies for critical resources. Emergency functionality remains available offline through cached data and local storage.

**Multilingual Support**
The application implements internationalization (i18n) with support for Marathi (primary), Hindi, and English. Content localization is handled through database fields with fallback mechanisms, and the UI adapts to user language preferences stored in user profiles.

**Security & Privacy**
The system implements session management with secure cookies, CSRF protection, and encrypted storage for sensitive data. Location data is handled with user consent, and emergency evidence is stored with proper encryption and chain of custody features.

## External Dependencies

**Authentication Services**
- Replit Auth for OAuth2 authentication flow
- Flask-Dance for OAuth consumer implementation
- Flask-Login for session management

**Database Services**
- PostgreSQL database (configured via DATABASE_URL environment variable)
- SQLAlchemy ORM with connection pooling and pre-ping health checks

**Frontend Libraries**
- Bootstrap 5.3.0 for responsive UI framework
- Font Awesome 6.4.0 for icons and visual elements
- Google Fonts (Noto Sans Devanagari for Marathi, Roboto for English/Hindi)

**Location Services**
- Browser Geolocation API for emergency location tracking
- Maharashtra district-specific location data integration

**Real-time Communication**
- Emergency contact notification system
- SMS/call integration for SOS alerts (configured through external providers)

**Government Data Integration**
- Maharashtra Police station database
- Government hospital and health center listings
- NGO and women's helpline directory
- Government scheme databases (state and central)

**Media Services**
- Camera and microphone access for evidence collection
- Audio/video recording capabilities for emergency situations
- Encrypted file storage for sensitive evidence

**CDN and Static Assets**
- Bootstrap CSS/JS from jsDelivr CDN
- Font Awesome from cdnjs
- Google Fonts API for typography