// aai Saheb - Service Worker for PWA and Offline Support

const CACHE_NAME = 'aai-saheb-v1.0.0';
const OFFLINE_PAGE = '/offline';

// Critical resources to cache for offline functionality
const CRITICAL_RESOURCES = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/sos.js',
    '/static/manifest.json',
    // Emergency and safety critical pages
    '/sos',
    '/safety_resources',
    '/profile',
    // Bootstrap and external dependencies
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@300;400;600&family=Roboto:wght@300;400;500;700&display=swap'
];

// Emergency contacts and data that should be available offline
const EMERGENCY_DATA = [
    '/api/emergency-contacts',
    '/api/safety-resources',
    '/api/emergency-numbers'
];

// Install event - cache critical resources
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching critical resources...');
                return cache.addAll(CRITICAL_RESOURCES.map(url => {
                    return new Request(url, { mode: 'no-cors' });
                })).catch(error => {
                    console.warn('[Service Worker] Failed to cache some resources:', error);
                    // Cache individual resources that succeed
                    return Promise.allSettled(
                        CRITICAL_RESOURCES.map(url => cache.add(url))
                    );
                });
            })
            .then(() => {
                console.log('[Service Worker] Critical resources cached successfully');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache critical resources:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients immediately
            self.clients.claim()
        ])
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cross-origin requests that are not in our critical resources
    if (url.origin !== location.origin && !CRITICAL_RESOURCES.includes(request.url)) {
        return;
    }
    
    // Handle different types of requests
    if (request.method === 'GET') {
        event.respondWith(handleGetRequest(request));
    } else if (request.method === 'POST') {
        event.respondWith(handlePostRequest(request));
    }
});

// Handle GET requests with cache-first or network-first strategies
async function handleGetRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Emergency and critical pages - cache first
        if (isCriticalResource(request.url)) {
            return await cacheFirst(request);
        }
        
        // API requests - network first with cache fallback
        if (url.pathname.startsWith('/api/')) {
            return await networkFirst(request);
        }
        
        // Static assets - cache first
        if (isStaticAsset(request.url)) {
            return await cacheFirst(request);
        }
        
        // All other requests - network first
        return await networkFirst(request);
        
    } catch (error) {
        console.error('[Service Worker] Request failed:', error);
        return await handleOfflineScenario(request);
    }
}

// Handle POST requests - important for SOS functionality
async function handlePostRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first for all POST requests
        const response = await fetch(request);
        
        // If successful and it's SOS-related, cache the response
        if (response.ok && isSosRequest(request.url)) {
            await cacheSosData(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.error('[Service Worker] POST request failed:', error);
        
        // Handle offline SOS requests specially
        if (isSosRequest(request.url)) {
            return await handleOfflineSos(request);
        }
        
        // For other POST requests, return an error response
        return new Response(
            JSON.stringify({ 
                error: 'Offline', 
                message: 'Request cannot be completed offline' 
            }),
            { 
                status: 503, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

// Cache-first strategy
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Update cache in background
        fetch(request).then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
        }).catch(() => {
            // Ignore background update failures
        });
        
        return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
        cache.put(request, response.clone());
    }
    
    return response;
}

// Network-first strategy
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            // Cache successful responses
            cache.put(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Handle offline scenarios
async function handleOfflineScenario(request) {
    const url = new URL(request.url);
    
    // For HTML pages, return offline page or cached version
    if (request.headers.get('accept')?.includes('text/html')) {
        const cache = await caches.open(CACHE_NAME);
        
        // Try to return cached version of the page
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page
        const offlinePage = await cache.match('/');
        if (offlinePage) {
            return new Response(
                await generateOfflinePage(),
                { 
                    headers: { 'Content-Type': 'text/html' } 
                }
            );
        }
    }
    
    // For API requests, return offline indicator
    if (url.pathname.startsWith('/api/')) {
        return new Response(
            JSON.stringify({ 
                offline: true, 
                message: 'This feature requires internet connection' 
            }),
            { 
                status: 503, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
    
    // Default offline response
    return new Response(
        'Offline - This content is not available offline',
        { status: 503 }
    );
}

// Handle offline SOS requests
async function handleOfflineSos(request) {
    console.log('[Service Worker] Handling offline SOS request');
    
    try {
        // Get request data
        const requestData = await request.clone().json();
        
        // Store SOS data for later sync
        await storeOfflineSosData(requestData);
        
        // Return success response
        return new Response(
            JSON.stringify({ 
                success: true, 
                offline: true,
                alert_id: 'offline_' + Date.now(),
                message: 'SOS alert stored offline and will be sent when connection is restored' 
            }),
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
        
    } catch (error) {
        console.error('[Service Worker] Failed to handle offline SOS:', error);
        
        return new Response(
            JSON.stringify({ 
                success: false, 
                offline: true,
                error: 'Failed to store offline SOS data' 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

// Store offline SOS data
async function storeOfflineSosData(sosData) {
    return new Promise((resolve, reject) => {
        // Use IndexedDB to store offline SOS data
        const request = indexedDB.open('aaiSahebOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['sosAlerts'], 'readwrite');
            const store = transaction.objectStore('sosAlerts');
            
            const offlineAlert = {
                id: 'offline_' + Date.now(),
                data: sosData,
                timestamp: Date.now(),
                synced: false
            };
            
            const addRequest = store.add(offlineAlert);
            addRequest.onsuccess = () => resolve(offlineAlert.id);
            addRequest.onerror = () => reject(addRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('sosAlerts')) {
                const store = db.createObjectStore('sosAlerts', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('synced', 'synced', { unique: false });
            }
        };
    });
}

// Sync offline data when online
self.addEventListener('sync', event => {
    console.log('[Service Worker] Background sync triggered:', event.tag);
    
    if (event.tag === 'sos-sync') {
        event.waitUntil(syncOfflineSosData());
    } else if (event.tag === 'data-sync') {
        event.waitUntil(syncOfflineData());
    }
});

// Sync offline SOS data
async function syncOfflineSosData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('aaiSahebOfflineDB', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['sosAlerts'], 'readwrite');
            const store = transaction.objectStore('sosAlerts');
            const index = store.index('synced');
            
            const cursorRequest = index.openCursor(IDBKeyRange.only(false));
            
            cursorRequest.onsuccess = async (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    const alert = cursor.value;
                    
                    try {
                        // Try to send SOS data to server
                        const response = await fetch('/activate_sos', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(alert.data)
                        });
                        
                        if (response.ok) {
                            // Mark as synced
                            alert.synced = true;
                            alert.syncedAt = Date.now();
                            cursor.update(alert);
                            
                            console.log('[Service Worker] SOS data synced:', alert.id);
                        }
                        
                    } catch (error) {
                        console.error('[Service Worker] Failed to sync SOS data:', error);
                    }
                    
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            cursorRequest.onerror = () => reject(cursorRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Sync other offline data
async function syncOfflineData() {
    console.log('[Service Worker] Syncing offline data...');
    
    // Sync any other offline data here
    // For now, just sync SOS data
    return syncOfflineSosData();
}

// Handle push notifications
self.addEventListener('push', event => {
    console.log('[Service Worker] Push notification received:', event);
    
    if (event.data) {
        try {
            const data = event.data.json();
            
            const options = {
                body: data.body || 'You have a new notification',
                icon: '/static/favicon.ico',
                badge: '/static/favicon.ico',
                tag: data.tag || 'general',
                requireInteraction: data.urgent || false,
                actions: data.actions || [],
                data: data.data || {}
            };
            
            event.waitUntil(
                self.registration.showNotification(
                    data.title || 'aai Saheb',
                    options
                )
            );
            
        } catch (error) {
            console.error('[Service Worker] Failed to parse push data:', error);
            
            // Show default notification
            event.waitUntil(
                self.registration.showNotification('aai Saheb', {
                    body: 'You have a new notification',
                    icon: '/static/favicon.ico'
                })
            );
        }
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification clicked:', event);
    
    event.notification.close();
    
    const notificationData = event.notification.data || {};
    let targetUrl = notificationData.url || '/';
    
    // Handle different notification types
    if (event.notification.tag === 'sos-alert') {
        targetUrl = '/sos';
    } else if (event.notification.tag === 'safety-update') {
        targetUrl = '/safety_resources';
    } else if (event.notification.tag === 'community') {
        targetUrl = '/community';
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                // Try to focus existing window
                for (const client of clientList) {
                    if (client.url.includes(targetUrl) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', event => {
    console.log('[Service Worker] Message received:', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'CACHE_EMERGENCY_DATA':
                cacheEmergencyData(event.data.data);
                break;
                
            case 'SYNC_NOW':
                self.registration.sync.register('data-sync');
                break;
                
            case 'SOS_SYNC':
                self.registration.sync.register('sos-sync');
                break;
                
            default:
                console.warn('[Service Worker] Unknown message type:', event.data.type);
        }
    }
});

// Utility functions
function isCriticalResource(url) {
    return CRITICAL_RESOURCES.includes(url) || 
           url.includes('/sos') || 
           url.includes('/safety_resources') ||
           url.includes('/emergency');
}

function isStaticAsset(url) {
    return url.includes('/static/') ||
           url.includes('.css') ||
           url.includes('.js') ||
           url.includes('.png') ||
           url.includes('.jpg') ||
           url.includes('.svg') ||
           url.includes('.woff') ||
           url.includes('.ttf');
}

function isSosRequest(url) {
    return url.includes('/activate_sos') || 
           url.includes('/cancel_sos') ||
           url.includes('/emergency');
}

// Cache emergency data
async function cacheEmergencyData(data) {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache emergency contacts
        if (data.contacts) {
            await cache.put(
                '/api/emergency-contacts',
                new Response(JSON.stringify(data.contacts), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        }
        
        // Cache safety resources
        if (data.safetyResources) {
            await cache.put(
                '/api/safety-resources',
                new Response(JSON.stringify(data.safetyResources), {
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        }
        
        console.log('[Service Worker] Emergency data cached successfully');
        
    } catch (error) {
        console.error('[Service Worker] Failed to cache emergency data:', error);
    }
}

// Generate offline page HTML
async function generateOfflinePage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - aai Saheb</title>
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #3F51B5 0%, #303F9F 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .offline-container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 2rem; opacity: 0.9; }
        .emergency-numbers {
            background: rgba(244, 67, 54, 0.2);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        .emergency-numbers h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.2rem;
        }
        .phone-number {
            display: block;
            color: #FFE0B2;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0.5rem 0;
        }
        .retry-btn {
            background: #FF9800;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
        }
        .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📱💔</div>
        <h1>You're Offline</h1>
        <p>आप ऑफ़लाइन हैं। आपातकालीन सेवाएं नीचे उपलब्ध हैं।</p>
        
        <div class="emergency-numbers">
            <h3>🚨 Emergency Numbers</h3>
            <a href="tel:112" class="phone-number">📞 Emergency: 112</a>
            <a href="tel:1091" class="phone-number">👩 Women Helpline: 1091</a>
            <a href="tel:181" class="phone-number">🛡️ Women Safety: 181</a>
        </div>
        
        <p>Some features may still work offline. Check your connection and try again.</p>
        
        <button class="retry-btn" onclick="window.location.reload()">
            🔄 Retry Connection
        </button>
    </div>
</body>
</html>
    `;
}

// Performance monitoring
self.addEventListener('fetch', event => {
    // Monitor performance for critical requests
    if (isCriticalResource(event.request.url)) {
        const startTime = performance.now();
        
        event.respondWith(
            handleGetRequest(event.request).then(response => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                console.log(`[Service Worker] ${event.request.url} took ${duration.toFixed(2)}ms`);
                
                return response;
            })
        );
    }
});

console.log('[Service Worker] aai Saheb Service Worker loaded successfully');
