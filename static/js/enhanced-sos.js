// Enhanced SOS System with improved error handling and offline support

class EnhancedSOSSystem {
    constructor() {
        this.isActive = false;
        this.alertId = null;
        this.location = null;
        this.evidence = {
            audio: null,
            photos: [],
            video: null
        };
        this.offlineQueue = [];
        this.retryAttempts = 0;
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeLocationTracking();
        this.setupOfflineHandling();
        this.loadOfflineQueue();
    }
    
    setupEventListeners() {
        // Enhanced SOS button with multiple activation methods
        const sosButton = document.getElementById('sosButton');
        if (sosButton) {
            // Touch/click activation
            sosButton.addEventListener('click', (e) => this.handleSOSActivation(e));
            
            // Long press activation
            let pressTimer;
            sosButton.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => this.activateSOS(), 1000);
            });
            
            sosButton.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
            
            // Keyboard activation (Space or Enter)
            sosButton.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.handleSOSActivation(e);
                }
            });
        }
        
        // Shake detection for mobile devices
        this.initializeShakeDetection();
        
        // Voice command detection
        this.initializeVoiceCommands();
        
        // Panic gesture (volume buttons)
        this.initializePanicGesture();
    }
    
    handleSOSActivation(event) {
        event.preventDefault();
        
        if (this.isActive) {
            console.log('SOS already active');
            return;
        }
        
        // Show confirmation dialog with countdown
        this.showActivationConfirmation();
    }
    
    showActivationConfirmation() {
        const modal = this.createConfirmationModal();
        document.body.appendChild(modal);
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Start countdown
        this.startActivationCountdown(3, () => {
            bootstrapModal.hide();
            this.activateSOS();
        });
    }
    
    createConfirmationModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'sosConfirmationModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-danger">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle"></i>
                            Emergency SOS Activation
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="sos-countdown-display">
                            <div class="countdown-circle">
                                <span id="countdownNumber">3</span>
                            </div>
                            <p class="mt-3">SOS will activate in <span id="countdownText">3</span> seconds</p>
                            <p class="text-muted small">Say "CANCEL" or press Cancel to stop</p>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-center">
                        <button type="button" class="btn btn-outline-secondary" onclick="sosSystem.cancelActivation()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-danger" onclick="sosSystem.activateSOSImmediately()">
                            <i class="fas fa-exclamation-triangle"></i> Activate Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }
    
    startActivationCountdown(seconds, callback) {
        let remaining = seconds;
        const countdownNumber = document.getElementById('countdownNumber');
        const countdownText = document.getElementById('countdownText');
        
        this.countdownInterval = setInterval(() => {
            remaining--;
            
            if (countdownNumber) countdownNumber.textContent = remaining;
            if (countdownText) countdownText.textContent = remaining;
            
            if (remaining <= 0) {
                clearInterval(this.countdownInterval);
                callback();
            }
        }, 1000);
    }
    
    cancelActivation() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('sosConfirmationModal'));
        if (modal) {
            modal.hide();
        }
        
        this.showNotification('SOS activation cancelled', 'info');
    }
    
    activateSOSImmediately() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('sosConfirmationModal'));
        if (modal) {
            modal.hide();
        }
        
        this.activateSOS();
    }
    
    async activateSOS() {
        if (this.isActive) return;
        
        console.log('Activating SOS...');
        this.isActive = true;
        
        try {
            // Get current location
            await this.getCurrentLocation();
            
            // Start evidence collection
            await this.startEvidenceCollection();
            
            // Send SOS alert
            await this.sendSOSAlert();
            
            // Show success status
            this.showSOSActiveStatus();
            
        } catch (error) {
            console.error('SOS activation failed:', error);
            this.handleSOSError(error);
        }
    }
    
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: Date.now()
                    };
                    resolve(this.location);
                },
                (error) => {
                    console.warn('Location error:', error);
                    // Continue without precise location
                    this.location = null;
                    resolve(null);
                },
                options
            );
        });
    }
    
    async startEvidenceCollection() {
        try {
            // Request permissions first
            const permissions = await this.requestEvidencePermissions();
            
            if (permissions.camera) {
                this.capturePhotos();
            }
            
            if (permissions.microphone) {
                this.startAudioRecording();
            }
            
        } catch (error) {
            console.warn('Evidence collection failed:', error);
            // Continue without evidence
        }
    }
    
    async requestEvidencePermissions() {
        const permissions = {
            camera: false,
            microphone: false
        };
        
        try {
            // Check camera permission
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            permissions.camera = true;
            cameraStream.getTracks().forEach(track => track.stop());
        } catch (e) {
            console.warn('Camera permission denied');
        }
        
        try {
            // Check microphone permission
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            permissions.microphone = true;
            audioStream.getTracks().forEach(track => track.stop());
        } catch (e) {
            console.warn('Microphone permission denied');
        }
        
        return permissions;
    }
    
    async sendSOSAlert() {
        const sosData = {
            latitude: this.location?.latitude,
            longitude: this.location?.longitude,
            address: await this.getAddressFromCoordinates(),
            notes: 'Emergency SOS activated via enhanced system',
            timestamp: Date.now(),
            evidence_available: Object.keys(this.evidence).some(key => this.evidence[key])
        };
        
        try {
            const response = await fetch('/api/sos/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(sosData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            this.alertId = result.alert_id;
            
            console.log('SOS alert sent successfully:', result);
            
            // Notify emergency contacts
            this.notifyEmergencyContacts(sosData);
            
            // Send browser notification
            this.sendBrowserNotification();
            
            return result;
            
        } catch (error) {
            console.error('Failed to send SOS alert:', error);
            
            // Store for offline retry
            this.storeOfflineAlert(sosData);
            
            // Try fallback methods
            this.tryFallbackMethods(sosData);
            
            throw error;
        }
    }
    
    storeOfflineAlert(sosData) {
        const offlineAlert = {
            ...sosData,
            id: 'offline_' + Date.now(),
            stored_at: Date.now(),
            retry_count: 0
        };
        
        this.offlineQueue.push(offlineAlert);
        localStorage.setItem('aaiSaheb_offlineAlerts', JSON.stringify(this.offlineQueue));
        
        console.log('SOS alert stored offline for retry');
    }
    
    tryFallbackMethods(sosData) {
        // Try to open emergency dialer
        if (confirm('Could not send SOS alert online. Call emergency services directly?')) {
            window.location.href = 'tel:112';
        }
        
        // Try to send via SMS
        this.sendEmergencySMS(sosData);
    }
    
    sendEmergencySMS(sosData) {
        const message = `🚨 EMERGENCY 🚨\nI need immediate help!\nLocation: ${sosData.address || 'Unknown'}\nTime: ${new Date().toLocaleString()}\nCall 112 or contact me immediately.`;
        
        // Try to open SMS app
        const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
        window.open(smsUrl, '_self');
    }
    
    showSOSActiveStatus() {
        const statusModal = this.createStatusModal();
        document.body.appendChild(statusModal);
        
        const bootstrapModal = new bootstrap.Modal(statusModal);
        bootstrapModal.show();
    }
    
    createStatusModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'sosActiveModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-success">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-check-circle"></i>
                            SOS Alert Active
                        </h5>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <div class="sos-active-indicator">
                                <div class="pulse-animation"></div>
                                <i class="fas fa-broadcast-tower fa-2x text-success"></i>
                            </div>
                        </div>
                        
                        <div class="alert alert-success">
                            <h6><i class="fas fa-check-circle"></i> Alert Sent Successfully!</h6>
                            <ul class="mb-0">
                                <li>Emergency contacts notified</li>
                                <li>Location shared securely</li>
                                <li>Evidence collected</li>
                                <li>Authorities can be contacted</li>
                            </ul>
                        </div>
                        
                        <div class="emergency-actions">
                            <h6>Immediate Actions:</h6>
                            <div class="d-grid gap-2">
                                <a href="tel:112" class="btn btn-danger">
                                    <i class="fas fa-phone"></i> Call Emergency (112)
                                </a>
                                <a href="tel:1091" class="btn btn-primary">
                                    <i class="fas fa-phone"></i> Women Helpline (1091)
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-danger" onclick="sosSystem.cancelSOS()">
                            <i class="fas fa-times"></i> Cancel Alert
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Keep Active
                        </button>
                    </div>
                </div>
            </div>
        `;
        return modal;
    }
    
    async cancelSOS() {
        if (!this.isActive || !this.alertId) {
            console.log('No active SOS to cancel');
            return;
        }
        
        try {
            const response = await fetch('/api/sos/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    alert_id: this.alertId,
                    reason: 'User cancelled - safe now'
                })
            });
            
            if (response.ok) {
                this.isActive = false;
                this.alertId = null;
                
                // Close active modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('sosActiveModal'));
                if (modal) modal.hide();
                
                this.showNotification('SOS alert cancelled successfully', 'success');
                
            } else {
                throw new Error('Failed to cancel SOS alert');
            }
            
        } catch (error) {
            console.error('Error cancelling SOS:', error);
            this.showNotification('Failed to cancel SOS alert', 'error');
        }
    }
    
    // Enhanced shake detection
    initializeShakeDetection() {
        if (!window.DeviceMotionEvent) return;
        
        let lastTime = Date.now();
        let lastX = 0, lastY = 0, lastZ = 0;
        let shakeCount = 0;
        const shakeThreshold = 15;
        const shakeTimeout = 1000;
        
        window.addEventListener('devicemotion', (event) => {
            const current = Date.now();
            
            if ((current - lastTime) > 100) {
                const deltaTime = current - lastTime;
                lastTime = current;
                
                const acceleration = event.accelerationIncludingGravity;
                if (acceleration) {
                    const x = acceleration.x || 0;
                    const y = acceleration.y || 0;
                    const z = acceleration.z || 0;
                    
                    const deltaX = Math.abs(x - lastX);
                    const deltaY = Math.abs(y - lastY);
                    const deltaZ = Math.abs(z - lastZ);
                    
                    const totalDelta = deltaX + deltaY + deltaZ;
                    
                    if (totalDelta > shakeThreshold) {
                        shakeCount++;
                        
                        if (shakeCount >= 3) {
                            console.log('Shake detection triggered SOS');
                            this.handleSOSActivation(new Event('shake'));
                            shakeCount = 0;
                        }
                        
                        setTimeout(() => {
                            shakeCount = Math.max(0, shakeCount - 1);
                        }, shakeTimeout);
                    }
                    
                    lastX = x;
                    lastY = y;
                    lastZ = z;
                }
            }
        });
    }
    
    // Voice command detection
    initializeVoiceCommands() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.toLowerCase();
                
                // Emergency activation phrases
                const emergencyPhrases = [
                    'emergency', 'help me', 'sos', 'call police',
                    'मदद करो', 'आपातकाल', 'पुलिस बुलाओ'
                ];
                
                if (emergencyPhrases.some(phrase => transcript.includes(phrase))) {
                    console.log('Voice command triggered SOS');
                    this.handleSOSActivation(new Event('voice'));
                }
                
                // Cancellation phrases
                const cancelPhrases = ['cancel', 'stop', 'safe', 'रद्द करो', 'रोको', 'सुरक्षित'];
                if (cancelPhrases.some(phrase => transcript.includes(phrase))) {
                    this.cancelActivation();
                }
            }
        };
        
        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
        };
        
        // Start voice recognition on SOS page
        if (window.location.pathname.includes('sos')) {
            try {
                recognition.start();
            } catch (e) {
                console.warn('Could not start voice recognition:', e);
            }
        }
    }
    
    // Panic gesture (volume buttons simulation)
    initializePanicGesture() {
        let volumeDownCount = 0;
        const resetTimeout = 2000;
        
        document.addEventListener('keydown', (event) => {
            // Simulate volume down detection (actual implementation would need native app)
            if (event.code === 'VolumeDown' || (event.ctrlKey && event.code === 'Minus')) {
                volumeDownCount++;
                
                if (volumeDownCount >= 5) {
                    console.log('Panic gesture detected');
                    this.handleSOSActivation(new Event('panic'));
                    volumeDownCount = 0;
                }
                
                setTimeout(() => {
                    volumeDownCount = Math.max(0, volumeDownCount - 1);
                }, resetTimeout);
            }
        });
    }
    
    // Offline handling
    setupOfflineHandling() {
        window.addEventListener('online', () => {
            console.log('Connection restored, syncing offline alerts');
            this.syncOfflineAlerts();
        });
        
        window.addEventListener('offline', () => {
            console.log('Connection lost, enabling offline mode');
            this.showNotification('You are offline. Emergency features still available.', 'warning');
        });
    }
    
    loadOfflineQueue() {
        const stored = localStorage.getItem('aaiSaheb_offlineAlerts');
        if (stored) {
            try {
                this.offlineQueue = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to load offline queue:', e);
                this.offlineQueue = [];
            }
        }
    }
    
    async syncOfflineAlerts() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`Syncing ${this.offlineQueue.length} offline alerts`);
        
        for (const alert of this.offlineQueue) {
            try {
                const response = await fetch('/api/sos/activate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(alert)
                });
                
                if (response.ok) {
                    console.log('Offline alert synced:', alert.id);
                    this.offlineQueue = this.offlineQueue.filter(a => a.id !== alert.id);
                } else {
                    alert.retry_count = (alert.retry_count || 0) + 1;
                    if (alert.retry_count >= this.maxRetries) {
                        console.error('Max retries reached for alert:', alert.id);
                        this.offlineQueue = this.offlineQueue.filter(a => a.id !== alert.id);
                    }
                }
                
            } catch (error) {
                console.error('Failed to sync offline alert:', error);
                alert.retry_count = (alert.retry_count || 0) + 1;
            }
        }
        
        localStorage.setItem('aaiSaheb_offlineAlerts', JSON.stringify(this.offlineQueue));
        
        if (this.offlineQueue.length === 0) {
            this.showNotification('All offline alerts synced successfully', 'success');
        }
    }
    
    // Utility methods
    async getAddressFromCoordinates() {
        if (!this.location) return 'Location unavailable';
        
        try {
            // In production, use a geocoding service
            return `${this.location.latitude.toFixed(6)}, ${this.location.longitude.toFixed(6)}`;
        } catch (error) {
            return 'Address lookup failed';
        }
    }
    
    showNotification(message, type = 'info') {
        if (window.aaiSaheb && window.aaiSaheb.showNotification) {
            window.aaiSaheb.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    sendBrowserNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('SOS Alert Sent', {
                body: 'Your emergency alert has been sent to your contacts.',
                icon: '/static/favicon.ico',
                badge: '/static/favicon.ico',
                tag: 'sos-alert',
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            setTimeout(() => notification.close(), 10000);
        }
    }
    
    notifyEmergencyContacts(sosData) {
        // This would integrate with the backend to send notifications
        console.log('Notifying emergency contacts with data:', sosData);
    }
}

// Initialize enhanced SOS system
let sosSystem;
document.addEventListener('DOMContentLoaded', () => {
    sosSystem = new EnhancedSOSSystem();
    window.sosSystem = sosSystem; // Make globally available
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSOSSystem;
}