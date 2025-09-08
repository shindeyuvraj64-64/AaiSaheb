// aai Saheb - Main Application JavaScript

// Define showNotification function first to ensure global availability
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'} notification-toast`;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    // Add to page
    const container = document.getElementById('notification-container') || createNotificationContainer();
    container.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Create notification container if needed
function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

// Make showNotification globally available immediately
window.showNotification = showNotification;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global application state
const app = {
    currentUser: null,
    location: null,
    isOnline: navigator.onLine,
    settings: {
        language: 'en',
        notifications: true,
        locationSharing: true
    }
};

// Application initialization
function initializeApp() {
    console.log('Initializing aai Saheb application...');
    
    // Initialize core features
    initializeNavigation();
    initializeNotifications();
    initializeLocationServices();
    initializeOfflineSupport();
    initializePWA();
    
    // Check for emergency mode
    checkEmergencyMode();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Application initialized successfully');
}

// Navigation and UI
function initializeNavigation() {
    // Highlight active navigation item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .bottom-nav-item');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href) && href !== '/') {
            link.classList.add('active');
        }
    });
    
    // Mobile menu handling
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        navbarToggler.addEventListener('click', function() {
            navbarCollapse.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navbarCollapse.contains(e.target) && !navbarToggler.contains(e.target)) {
                navbarCollapse.classList.remove('show');
            }
        });
    }
}

// Notification system
function initializeNotifications() {
    // Check if notifications are supported
    if ('Notification' in window) {
        // Request permission if not already granted
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
    }
    
    // Initialize in-app notification system
    window.showNotification = function(message, type = 'info', duration = 5000) {
        const notification = createNotificationElement(message, type);
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    };
}

function createNotificationElement(message, type) {
    const notification = document.createElement('div');
    notification.className = `app-notification app-notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .app-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                max-width: 300px;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                border-left: 4px solid #3F51B5;
            }
            .app-notification.show {
                transform: translateX(0);
            }
            .app-notification-success { border-left-color: #4CAF50; }
            .app-notification-warning { border-left-color: #FF9800; }
            .app-notification-error { border-left-color: #F44336; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .notification-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                cursor: pointer;
                color: #757575;
            }
        `;
        document.head.appendChild(styles);
    }
    
    return notification;
}

function getNotificationIcon(type) {
    const icons = {
        info: 'info-circle',
        success: 'check-circle',
        warning: 'exclamation-triangle',
        error: 'times-circle'
    };
    return icons[type] || icons.info;
}

// Location services
function initializeLocationServices() {
    if ('geolocation' in navigator) {
        // Get initial location
        getCurrentLocation().then(location => {
            app.location = location;
            console.log('Current location obtained:', location);
        }).catch(error => {
            console.warn('Location access denied or unavailable:', error);
        });
        
        // Watch location for safety features
        if (app.settings.locationSharing) {
            navigator.geolocation.watchPosition(
                position => {
                    app.location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                },
                error => console.warn('Location tracking error:', error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }
    }
}

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            error => {
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    });
}

// Offline support and caching
function initializeOfflineSupport() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });
    }
    
    // Handle online/offline status
    window.addEventListener('online', function() {
        app.isOnline = true;
        showNotification('आपका इंटरनेट कनेक्शन बहाल हो गया है', 'success');
        syncOfflineData();
    });
    
    window.addEventListener('offline', function() {
        app.isOnline = false;
        showNotification('आप ऑफ़लाइन हैं। आपातकालीन सुविधाएं उपलब्ध हैं।', 'warning');
    });
}

function syncOfflineData() {
    // Sync any offline data when connection is restored
    const offlineData = localStorage.getItem('aaiSaheb_offlineData');
    if (offlineData) {
        try {
            const data = JSON.parse(offlineData);
            // Process offline data...
            console.log('Syncing offline data:', data);
            localStorage.removeItem('aaiSaheb_offlineData');
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }
}

// Progressive Web App features
function initializePWA() {
    let deferredPrompt;
    
    // Handle PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button or banner
        showInstallPrompt();
    });
    
    // Handle app installation
    window.addEventListener('appinstalled', (evt) => {
        console.log('aai Saheb app installed successfully');
        showNotification('ऐप सफलतापूर्वक इंस्टॉल हो गया!', 'success');
    });
    
    function showInstallPrompt() {
        if (deferredPrompt) {
            const installBanner = document.createElement('div');
            installBanner.innerHTML = `
                <div class="install-banner">
                    <div class="install-content">
                        <i class="fas fa-mobile-alt"></i>
                        <span>अपने फोन में aai Saheb ऐप इंस्टॉल करें</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="installApp()">
                        इंस्टॉल करें
                    </button>
                    <button class="btn btn-sm" onclick="this.closest('.install-banner').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add styles
            const styles = document.createElement('style');
            styles.textContent = `
                .install-banner {
                    position: fixed;
                    bottom: 80px;
                    left: 16px;
                    right: 16px;
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border: 2px solid #3F51B5;
                }
                .install-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 500;
                }
                @media (min-width: 768px) {
                    .install-banner {
                        max-width: 400px;
                        right: auto;
                        bottom: 20px;
                    }
                }
            `;
            document.head.appendChild(styles);
            document.body.appendChild(installBanner);
            
            window.installApp = function() {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    installBanner.remove();
                });
            };
        }
    }
}

// Emergency mode detection
function checkEmergencyMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('emergency') === 'true') {
        enableEmergencyMode();
    }
    
    // Check for emergency keywords in URL
    if (window.location.pathname.includes('sos') || window.location.pathname.includes('emergency')) {
        document.body.classList.add('emergency-mode');
    }
}

function enableEmergencyMode() {
    document.body.classList.add('emergency-mode');
    
    // Show emergency header
    const emergencyHeader = document.createElement('div');
    emergencyHeader.className = 'emergency-header-bar';
    emergencyHeader.innerHTML = `
        <div class="container">
            <div class="emergency-status">
                <i class="fas fa-exclamation-triangle"></i>
                <span>आपातकालीन मोड सक्रिय</span>
            </div>
            <button class="btn btn-sm btn-light" onclick="disableEmergencyMode()">
                निष्क्रिय करें
            </button>
        </div>
    `;
    
    document.body.insertBefore(emergencyHeader, document.body.firstChild);
    
    // Add emergency styles
    const emergencyStyles = document.createElement('style');
    emergencyStyles.textContent = `
        .emergency-mode {
            --primary-color: #F44336;
        }
        .emergency-header-bar {
            background: #F44336;
            color: white;
            padding: 8px 0;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1100;
        }
        .emergency-header-bar .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .emergency-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
        }
        .emergency-mode .navbar {
            margin-top: 44px;
        }
    `;
    document.head.appendChild(emergencyStyles);
}

function disableEmergencyMode() {
    document.body.classList.remove('emergency-mode');
    document.querySelector('.emergency-header-bar')?.remove();
    
    // Remove emergency styles
    document.querySelector('style[emergency-styles]')?.remove();
}

// Event listeners
function setupEventListeners() {
    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Emergency shortcut: Ctrl + Shift + E
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            window.location.href = '/sos';
        }
        
        // Help shortcut: F1
        if (e.key === 'F1') {
            e.preventDefault();
            showHelp();
        }
    });
    
    // Handle form submissions with loading states
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM') {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> प्रतीक्षा करें...';
                submitBtn.disabled = true;
                
                // Re-enable after a timeout to handle errors
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 10000);
            }
        }
    });
    
    // Handle external links
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.hostname !== window.location.hostname) {
            e.preventDefault();
            if (confirm('आप एक बाहरी वेबसाइट पर जा रहे हैं। क्या आप जारी रखना चाहते हैं?')) {
                window.open(link.href, '_blank', 'noopener,noreferrer');
            }
        }
    });
    
    // Double-tap to zoom prevention on buttons
    document.addEventListener('touchend', function(e) {
        const target = e.target;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
            e.preventDefault();
        }
    });
}

// Utility functions
function showHelp() {
    const helpModal = document.createElement('div');
    helpModal.className = 'modal fade';
    helpModal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-question-circle"></i> सहायता
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <h6>कीबोर्ड शॉर्टकट:</h6>
                    <ul>
                        <li><kbd>Ctrl + Shift + E</kbd> - आपातकालीन SOS</li>
                        <li><kbd>F1</kbd> - सहायता</li>
                    </ul>
                    
                    <h6>आपातकालीन नंबर:</h6>
                    <ul>
                        <li>112 - आपातकालीन सेवाएं</li>
                        <li>1091 - महिला हेल्पलाइन</li>
                        <li>181 - महिला सुरक्षा</li>
                    </ul>
                    
                    <h6>सुविधाएं:</h6>
                    <ul>
                        <li>ऑफ़लाइन पहुंच</li>
                        <li>स्थान साझाकरण</li>
                        <li>आपातकालीन संपर्क</li>
                        <li>शैक्षिक सामग्री</li>
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                        समझ गया
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
    const modal = new bootstrap.Modal(helpModal);
    modal.show();
    
    helpModal.addEventListener('hidden.bs.modal', function() {
        helpModal.remove();
    });
}

// Language switching
function setLanguage(lang) {
    app.settings.language = lang;
    localStorage.setItem('aaiSaheb_language', lang);
    
    // Update document lang attribute
    document.documentElement.lang = lang;
    
    // Update text direction for RTL languages if needed
    if (lang === 'ur' || lang === 'ar') {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }
}

// Accessibility features
function initializeAccessibility() {
    // High contrast mode toggle
    const highContrastToggle = document.createElement('button');
    highContrastToggle.innerHTML = '<i class="fas fa-adjust"></i>';
    highContrastToggle.className = 'accessibility-toggle';
    highContrastToggle.title = 'हाई कंट्रास्ट मोड टॉगल करें';
    
    highContrastToggle.addEventListener('click', function() {
        document.body.classList.toggle('high-contrast');
        localStorage.setItem('aaiSaheb_highContrast', 
            document.body.classList.contains('high-contrast'));
    });
    
    // Font size controls
    const fontSizeControls = document.createElement('div');
    fontSizeControls.className = 'font-size-controls';
    fontSizeControls.innerHTML = `
        <button onclick="adjustFontSize(-1)" title="फ़ॉन्ट साइज़ कम करें">A-</button>
        <button onclick="adjustFontSize(0)" title="डिफ़ॉल्ट फ़ॉन्ट साइज़">A</button>
        <button onclick="adjustFontSize(1)" title="फ़ॉन्ट साइज़ बढ़ाएं">A+</button>
    `;
    
    // Add accessibility panel
    const accessibilityPanel = document.createElement('div');
    accessibilityPanel.className = 'accessibility-panel';
    accessibilityPanel.appendChild(highContrastToggle);
    accessibilityPanel.appendChild(fontSizeControls);
    
    document.body.appendChild(accessibilityPanel);
}

function adjustFontSize(change) {
    const root = document.documentElement;
    const currentSize = parseFloat(getComputedStyle(root).fontSize);
    let newSize;
    
    if (change === 0) {
        newSize = 16; // Default
    } else {
        newSize = Math.max(14, Math.min(20, currentSize + change));
    }
    
    root.style.fontSize = newSize + 'px';
    localStorage.setItem('aaiSaheb_fontSize', newSize);
}

// Load saved settings on page load
function loadSavedSettings() {
    // Load language preference
    const savedLang = localStorage.getItem('aaiSaheb_language');
    if (savedLang) {
        app.settings.language = savedLang;
        setLanguage(savedLang);
    }
    
    // Load high contrast preference
    const highContrast = localStorage.getItem('aaiSaheb_highContrast') === 'true';
    if (highContrast) {
        document.body.classList.add('high-contrast');
    }
    
    // Load font size preference
    const fontSize = localStorage.getItem('aaiSaheb_fontSize');
    if (fontSize) {
        document.documentElement.style.fontSize = fontSize + 'px';
    }
    
    // Load notification preferences
    const notifications = localStorage.getItem('aaiSaheb_notifications');
    if (notifications !== null) {
        app.settings.notifications = notifications === 'true';
    }
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
    
    // Don't show error notifications for minor issues
    if (!e.error?.message?.includes('Script error')) {
        showNotification('कुछ गलत हुआ है। कृपया पेज को रीफ्रेश करें।', 'error');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// Initialize accessibility and load settings when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadSavedSettings();
    initializeAccessibility();
});

// Make showNotification globally available
window.showNotification = showNotification;

// Export global functions
window.aaiSaheb = {
    showNotification,
    getCurrentLocation,
    enableEmergencyMode,
    disableEmergencyMode,
    setLanguage,
    adjustFontSize
};

// Network status indicator
function updateNetworkStatus() {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'network-status';
    statusIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        transition: all 0.3s ease;
        opacity: 0;
        pointer-events: none;
    `;
    
    function updateStatus() {
        if (navigator.onLine) {
            statusIndicator.style.background = '#4CAF50';
            statusIndicator.style.color = 'white';
            statusIndicator.textContent = 'ऑनलाइन';
            statusIndicator.style.opacity = '0';
        } else {
            statusIndicator.style.background = '#F44336';
            statusIndicator.style.color = 'white';
            statusIndicator.textContent = 'ऑफ़लाइन मोड';
            statusIndicator.style.opacity = '1';
        }
    }
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    document.body.appendChild(statusIndicator);
    updateStatus();
}

// Initialize network status indicator
document.addEventListener('DOMContentLoaded', updateNetworkStatus);
