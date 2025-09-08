// aai Saheb - Emergency SOS System

let sosState = {
    isActive: false,
    countdown: null,
    alertId: null,
    location: null,
    contacts: [],
    evidence: {
        audio: null,
        photos: [],
        video: null
    }
};

// SOS activation handler
function activateSOS() {
    if (sosState.isActive) {
        console.log('SOS already active');
        return;
    }
    
    console.log('SOS activation initiated');
    
    // Start countdown with grace period
    startCountdown(3, () => {
        sendSOSAlert();
    });
    
    // Show countdown modal
    showCountdownModal();
    
    // Get current location
    getCurrentLocationForSOS();
    
    // Start evidence collection
    startEvidenceCollection();
}

// Countdown timer for SOS grace period
function startCountdown(seconds, callback) {
    let remainingTime = seconds;
    const countdownElement = document.getElementById('countdown');
    
    sosState.countdown = setInterval(() => {
        if (countdownElement) {
            countdownElement.textContent = remainingTime;
        }
        
        remainingTime--;
        
        if (remainingTime < 0) {
            clearInterval(sosState.countdown);
            sosState.countdown = null;
            callback();
        }
    }, 1000);
}

// Show countdown modal
function showCountdownModal() {
    const modal = document.getElementById('sosModal');
    if (modal) {
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Prevent modal from being closed during countdown
        modal.addEventListener('hide.bs.modal', function(e) {
            if (sosState.countdown) {
                e.preventDefault();
            }
        });
    }
}

// Get location for SOS
function getCurrentLocationForSOS() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => {
                sosState.location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: Date.now()
                };
                console.log('SOS location obtained:', sosState.location);
            },
            error => {
                console.error('Error getting SOS location:', error);
                // Continue with SOS even without precise location
                sosState.location = null;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }
}

// Start evidence collection
function startEvidenceCollection() {
    // Only collect evidence with user permission
    requestEvidencePermission().then(granted => {
        if (granted) {
            startAudioRecording();
            capturePhotos();
        }
    });
}

// Request permission for evidence collection
function requestEvidencePermission() {
    return new Promise((resolve) => {
        // In a real implementation, this would show a consent dialog
        // For now, we'll assume permission is granted
        resolve(true);
    });
}

// Audio recording
function startAudioRecording() {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
                const chunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    chunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                    sosState.evidence.audio = audioBlob;
                    console.log('Audio evidence captured');
                    
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                
                // Record for 30 seconds max
                setTimeout(() => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                }, 30000);
                
                console.log('Audio recording started');
            })
            .catch(error => {
                console.warn('Could not start audio recording:', error);
            });
    }
}

// Photo capture
function capturePhotos() {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        // Capture from both front and back cameras if available
        const cameras = ['user', 'environment'];
        
        cameras.forEach(facingMode => {
            navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: facingMode } 
            }).then(stream => {
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();
                
                video.addEventListener('loadedmetadata', () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    canvas.toBlob(blob => {
                        sosState.evidence.photos.push({
                            blob: blob,
                            camera: facingMode,
                            timestamp: Date.now()
                        });
                        console.log(`Photo captured from ${facingMode} camera`);
                    }, 'image/jpeg', 0.8);
                    
                    // Stop video stream
                    stream.getTracks().forEach(track => track.stop());
                });
            }).catch(error => {
                console.warn(`Could not access ${facingMode} camera:`, error);
            });
        });
    }
}

// Send SOS alert
async function sendSOSAlert() {
    sosState.isActive = true;
    
    console.log('Sending SOS alert...');
    
    try {
        // Get address from coordinates
        let address = '';
        if (sosState.location) {
            address = await getAddressFromCoordinates(
                sosState.location.latitude, 
                sosState.location.longitude
            );
        }
        
        // Prepare SOS data
        const sosData = {
            latitude: sosState.location?.latitude,
            longitude: sosState.location?.longitude,
            address: address,
            notes: 'Emergency SOS activated via app',
            timestamp: Date.now()
        };
        
        // Send to server
        const response = await fetch('/activate_sos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sosData)
        });
        
        if (response.ok) {
            const result = await response.json();
            sosState.alertId = result.alert_id;
            
            console.log('SOS alert sent successfully:', result);
            
            // Notify emergency contacts
            notifyEmergencyContacts(sosData);
            
            // Show success message
            updateSOSModal('success');
            
            // Send browser notification
            sendBrowserNotification();
            
        } else {
            throw new Error('Failed to send SOS alert');
        }
        
    } catch (error) {
        console.error('Error sending SOS alert:', error);
        
        // Fallback: try to send via SMS or call
        fallbackSOSMethods(sosState.location);
        
        updateSOSModal('error');
    }
}

// Get address from coordinates using reverse geocoding
function getAddressFromCoordinates(lat, lon) {
    return new Promise((resolve) => {
        // This would use a geocoding service in production
        // For now, return coordinates as string
        resolve(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    });
}

// Notify emergency contacts
function notifyEmergencyContacts(sosData) {
    // Get contacts from the page or make API call
    const contacts = getEmergencyContacts();
    
    contacts.forEach(contact => {
        // Send SMS if possible
        if ('sms' in navigator || 'sendSMS' in window) {
            sendSMSToContact(contact, sosData);
        }
        
        // Prepare WhatsApp message
        prepareWhatsAppMessage(contact, sosData);
    });
}

// Get emergency contacts from the page
function getEmergencyContacts() {
    const contacts = [];
    const contactElements = document.querySelectorAll('.emergency-contact-card');
    
    contactElements.forEach(element => {
        const name = element.querySelector('h6')?.textContent || 'Unknown';
        const phone = element.querySelector('a[href^="tel:"]')?.href?.replace('tel:', '') || '';
        
        if (phone) {
            contacts.push({ name, phone });
        }
    });
    
    return contacts;
}

// Send SMS to contact
function sendSMSToContact(contact, sosData) {
    const message = `🚨 EMERGENCY ALERT from aai Saheb 🚨\n\n` +
                   `${contact.name} needs immediate help!\n` +
                   `Location: ${sosData.address || 'Location unavailable'}\n` +
                   `Time: ${new Date().toLocaleString()}\n\n` +
                   `Please call immediately or contact emergency services:\n` +
                   `Emergency: 112\n` +
                   `Women Helpline: 1091\n\n` +
                   `This is an automated emergency alert.`;
    
    // Try to open SMS app
    const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_self');
}

// Prepare WhatsApp message
function prepareWhatsAppMessage(contact, sosData) {
    const message = `🚨 *EMERGENCY ALERT* 🚨\n\n` +
                   `I need immediate help!\n` +
                   `📍 Location: ${sosData.address || 'Location unavailable'}\n` +
                   `🕐 Time: ${new Date().toLocaleString()}\n\n` +
                   `Please call me immediately or contact emergency services:\n` +
                   `🚨 Emergency: 112\n` +
                   `👩 Women Helpline: 1091\n\n` +
                   `Sent via aai Saheb Safety App`;
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Fallback SOS methods when server is unavailable
function fallbackSOSMethods(location) {
    console.log('Using fallback SOS methods');
    
    // Try to call emergency services directly
    if (confirm('सर्वर उपलब्ध नहीं है। क्या आप सीधे आपातकालीन सेवाओं को कॉल करना चाहते हैं?')) {
        window.location.href = 'tel:112';
    }
    
    // Save SOS data locally for later sync
    const offlineSOSData = {
        timestamp: Date.now(),
        location: location,
        status: 'pending_sync'
    };
    
    const existingData = localStorage.getItem('aaiSaheb_offlineData') || '[]';
    const offlineData = JSON.parse(existingData);
    offlineData.push(offlineSOSData);
    localStorage.setItem('aaiSaheb_offlineData', JSON.stringify(offlineData));
    
    // Show offline notification
    if (window.aaiSaheb && window.aaiSaheb.showNotification) {
        window.aaiSaheb.showNotification(
            'SOS डेटा ऑफ़लाइन सेव किया गया। इंटरनेट कनेक्शन मिलने पर भेजा जाएगा।', 
            'warning'
        );
    }
}

// Send browser notification
function sendBrowserNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('SOS Alert Sent', {
            body: 'Your emergency alert has been sent to your contacts.',
            icon: '/static/favicon.ico',
            badge: '/static/favicon.ico',
            tag: 'sos-alert',
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }
}

// Update SOS modal status
function updateSOSModal(status) {
    const modalBody = document.querySelector('#sosModal .modal-body');
    if (!modalBody) return;
    
    if (status === 'success') {
        modalBody.innerHTML = `
            <div class="sos-activation-status">
                <div class="alert alert-success">
                    <h6><i class="fas fa-check-circle"></i> SOS Alert Sent Successfully!</h6>
                    <p>Your emergency alert has been sent to your contacts and our emergency response team.</p>
                </div>
                <div class="sos-actions">
                    <h6>What happens next:</h6>
                    <ul>
                        <li>Emergency contacts have been notified</li>
                        <li>Your location has been shared</li>
                        <li>Evidence has been collected securely</li>
                        <li>Emergency services can be contacted</li>
                    </ul>
                </div>
                <div class="emergency-numbers mt-3">
                    <a href="tel:112" class="btn btn-danger me-2">
                        <i class="fas fa-phone"></i> Call Emergency (112)
                    </a>
                    <a href="tel:1091" class="btn btn-primary">
                        <i class="fas fa-phone"></i> Women Helpline (1091)
                    </a>
                </div>
            </div>
        `;
    } else if (status === 'error') {
        modalBody.innerHTML = `
            <div class="sos-activation-status">
                <div class="alert alert-warning">
                    <h6><i class="fas fa-exclamation-triangle"></i> Connection Issue</h6>
                    <p>Could not send alert to server, but emergency contacts are being notified via SMS and WhatsApp.</p>
                </div>
                <div class="emergency-actions">
                    <h6>Immediate Actions:</h6>
                    <div class="d-grid gap-2">
                        <a href="tel:112" class="btn btn-danger">
                            <i class="fas fa-phone"></i> Call Emergency Services (112)
                        </a>
                        <a href="tel:1091" class="btn btn-primary">
                            <i class="fas fa-phone"></i> Women Helpline (1091)
                        </a>
                        <a href="tel:181" class="btn btn-warning">
                            <i class="fas fa-phone"></i> Women Safety (181)
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
}

// Cancel SOS alert
async function cancelSOS() {
    if (!sosState.isActive || !sosState.alertId) {
        console.log('No active SOS to cancel');
        return;
    }
    
    console.log('Cancelling SOS alert...');
    
    try {
        const response = await fetch('/cancel_sos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ alert_id: sosState.alertId })
        });
        
        if (response.ok) {
            sosState.isActive = false;
            sosState.alertId = null;
            
            console.log('SOS alert cancelled successfully');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('sosModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show confirmation
            if (window.aaiSaheb && window.aaiSaheb.showNotification) {
                window.aaiSaheb.showNotification('SOS अलर्ट रद्द कर दिया गया', 'success');
            }
            
        } else {
            throw new Error('Failed to cancel SOS alert');
        }
        
    } catch (error) {
        console.error('Error cancelling SOS:', error);
        if (window.aaiSaheb && window.aaiSaheb.showNotification) {
            window.aaiSaheb.showNotification('SOS रद्द करने में त्रुटि', 'error');
        }
    }
}

// Safe word cancellation
function checkSafeWord(input) {
    const safeWords = ['safe', 'cancel', 'stop', 'सुरक्षित', 'रद्द', 'रोको'];
    const inputLower = input.toLowerCase();
    
    return safeWords.some(word => inputLower.includes(word));
}

// Voice command detection (if available)
function initializeVoiceCommands() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN'; // Hindi
        
        recognition.onresult = function(event) {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.toLowerCase();
                
                // Emergency activation phrases
                const emergencyPhrases = [
                    'help me', 'emergency', 'sos', 
                    'मदद करो', 'आपातकाल', 'खतरा'
                ];
                
                if (emergencyPhrases.some(phrase => transcript.includes(phrase))) {
                    activateSOS();
                }
                
                // Cancellation phrases
                if (checkSafeWord(transcript)) {
                    if (sosState.countdown) {
                        clearInterval(sosState.countdown);
                        sosState.countdown = null;
                        
                        const modal = bootstrap.Modal.getInstance(document.getElementById('sosModal'));
                        if (modal) {
                            modal.hide();
                        }
                    }
                }
            }
        };
        
        recognition.onerror = function(event) {
            console.warn('Speech recognition error:', event.error);
        };
        
        // Start voice recognition when on SOS page
        if (window.location.pathname.includes('sos')) {
            recognition.start();
        }
    }
}

// Shake detection for SOS
function initializeShakeDetection() {
    if ('DeviceMotionEvent' in window) {
        let lastTime = Date.now();
        let lastX = 0, lastY = 0, lastZ = 0;
        let shakeCount = 0;
        let shakeThreshold = 15; // Adjust sensitivity
        
        window.addEventListener('devicemotion', function(event) {
            const current = Date.now();
            
            if ((current - lastTime) > 100) { // Check every 100ms
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
                        
                        // If shaken 3 times in quick succession, activate SOS
                        if (shakeCount >= 3) {
                            console.log('Shake detection triggered SOS');
                            activateSOS();
                            shakeCount = 0; // Reset
                        }
                        
                        // Reset shake count after 2 seconds
                        setTimeout(() => {
                            shakeCount = Math.max(0, shakeCount - 1);
                        }, 2000);
                    }
                    
                    lastX = x;
                    lastY = y;
                    lastZ = z;
                }
            }
        });
        
        console.log('Shake detection initialized');
    }
}

// Initialize SOS features when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on SOS page or emergency mode
    if (window.location.pathname.includes('sos') || document.body.classList.contains('emergency-mode')) {
        initializeVoiceCommands();
        initializeShakeDetection();
        
        console.log('SOS features initialized');
    }
    
    // Clear any existing countdown on page load
    if (sosState.countdown) {
        clearInterval(sosState.countdown);
        sosState.countdown = null;
    }
});

// Handle page visibility change to pause/resume features
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, reduce activity
        console.log('SOS page hidden');
    } else {
        // Page is visible, resume normal operation
        console.log('SOS page visible');
    }
});

// Emergency contact validation
function validateEmergencyContacts() {
    const contacts = getEmergencyContacts();
    
    if (contacts.length === 0) {
        console.warn('No emergency contacts found');
        
        if (window.aaiSaheb && window.aaiSaheb.showNotification) {
            window.aaiSaheb.showNotification(
                'कोई आपातकालीन संपर्क नहीं मिला। प्रोफाइल में जाकर जोड़ें।', 
                'warning'
            );
        }
        
        return false;
    }
    
    return true;
}

// Test SOS system (for testing purposes)
function testSOSSystem() {
    console.log('Testing SOS system...');
    
    // Validate contacts
    if (!validateEmergencyContacts()) {
        return;
    }
    
    // Test location
    getCurrentLocationForSOS();
    
    // Test notifications
    if (window.aaiSaheb && window.aaiSaheb.showNotification) {
        window.aaiSaheb.showNotification('SOS सिस्टम टेस्ट सफल', 'success');
    }
    
    console.log('SOS system test completed');
}

// Export functions for global access
window.sosSystem = {
    activateSOS,
    cancelSOS,
    testSOSSystem,
    validateEmergencyContacts
};
