// Service Worker for Agno WorkSphere PWA with Push Notifications
const CACHE_NAME = 'agno-worksphere-v1.0.0';
const STATIC_CACHE_NAME = 'agno-worksphere-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'agno-worksphere-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/projects',
  '/teams',
  '/settings',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/v1\/organizations\/[^\/]+\/analytics/,
  /\/api\/v1\/organizations\/[^\/]+\/projects/,
  /\/api\/v1\/organizations\/[^\/]+\/members/,
  /\/api\/v1\/users\/profile/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('agno-worksphere-')) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    // Static assets - cache first, network fallback
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - network first, cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for specific endpoints
    if (networkResponse.ok && shouldCacheApiResponse(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API request, trying cache');
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical API endpoints
    if (shouldReturnOfflineResponse(url.pathname)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'OFFLINE',
            message: 'You are currently offline. Some features may not be available.'
          },
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to load static asset', request.url);
    throw error;
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for page request, trying cache');
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlinePage = await caches.match('/');
    if (offlinePage) {
      return offlinePage;
    }
    
    throw error;
  }
}

// Check if API response should be cached
function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Check if offline response should be returned
function shouldReturnOfflineResponse(pathname) {
  return pathname.includes('/analytics') || 
         pathname.includes('/dashboard') ||
         pathname.includes('/projects');
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-tasks') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when connection is restored
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or localStorage
    const offlineActions = await getOfflineActions();
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove successful action from offline storage
        await removeOfflineAction(action.id);
        
        console.log('Service Worker: Synced offline action', action.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync offline action', action.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error during background sync', error);
  }
}

// Placeholder functions for offline action management
async function getOfflineActions() {
  // Implementation would use IndexedDB to store offline actions
  return [];
}

async function removeOfflineAction(actionId) {
  // Implementation would remove action from IndexedDB
  console.log('Removing offline action:', actionId);
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
  
  // Track notification close analytics if needed
  if (event.notification.data?.trackClose) {
    // Send analytics event
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Push Notification Event Handlers

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: 'Agno WorkSphere',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'default',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Customize notification based on type/priority
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/favicon.ico',
    badge: notificationData.badge || '/favicon.ico',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    requireInteraction: notificationData.priority === 'urgent' || notificationData.priority === 'high',
    silent: notificationData.priority === 'low',
    vibrate: getVibrationPattern(notificationData.priority),
    actions: notificationData.actions || getDefaultActions(notificationData.category)
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle different actions
  if (action) {
    handleNotificationAction(action, data, event);
  } else {
    // Default click behavior - open the app
    handleDefaultClick(data, event);
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);

  // Track notification dismissal if needed
  const data = event.notification.data || {};
  if (data.trackDismissal) {
    trackNotificationDismissal(data);
  }
});

// Helper Functions for Push Notifications

// Handle notification actions
function handleNotificationAction(action, data, event) {
  switch (action) {
    case 'view':
      openUrl(data.url || '/', event);
      break;
    case 'dismiss':
      // Just close - already handled above
      break;
    case 'accept_task':
      handleTaskAction('accept', data, event);
      break;
    case 'complete_task':
      handleTaskAction('complete', data, event);
      break;
    case 'view_project':
      openUrl(data.projectUrl || `/projects/${data.projectId}`, event);
      break;
    case 'view_task':
      openUrl(data.taskUrl || `/tasks/${data.taskId}`, event);
      break;
    default:
      // Send message to main thread for custom handling
      sendMessageToClient({
        type: 'NOTIFICATION_ACTION',
        action,
        data
      });
      break;
  }
}

// Handle default notification click
function handleDefaultClick(data, event) {
  const url = data.url || '/';
  openUrl(url, event);
}

// Open URL in browser
function openUrl(url, event) {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
}

// Handle task-specific actions
function handleTaskAction(action, data, event) {
  // Send message to main thread to handle task action
  sendMessageToClient({
    type: 'TASK_ACTION',
    action,
    taskId: data.taskId,
    data
  });

  // Also open the task page
  if (data.taskUrl) {
    openUrl(data.taskUrl, event);
  }
}

// Send message to client
function sendMessageToClient(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// Get vibration pattern based on priority
function getVibrationPattern(priority) {
  switch (priority) {
    case 'urgent':
      return [300, 100, 300, 100, 300];
    case 'high':
      return [200, 100, 200];
    case 'normal':
      return [100, 50, 100];
    case 'low':
      return [];
    default:
      return [100, 50, 100];
  }
}

// Get default actions based on notification category
function getDefaultActions(category) {
  const commonActions = [
    { action: 'view', title: 'View', icon: '/favicon.ico' },
    { action: 'dismiss', title: 'Dismiss', icon: '/favicon.ico' }
  ];

  switch (category) {
    case 'task_assigned':
      return [
        { action: 'view_task', title: 'View Task', icon: '/favicon.ico' },
        { action: 'accept_task', title: 'Accept', icon: '/favicon.ico' },
        { action: 'dismiss', title: 'Dismiss', icon: '/favicon.ico' }
      ];
    case 'task_reminder':
      return [
        { action: 'view_task', title: 'View Task', icon: '/favicon.ico' },
        { action: 'complete_task', title: 'Mark Complete', icon: '/favicon.ico' },
        { action: 'dismiss', title: 'Dismiss', icon: '/favicon.ico' }
      ];
    case 'project_update':
      return [
        { action: 'view_project', title: 'View Project', icon: '/favicon.ico' },
        { action: 'dismiss', title: 'Dismiss', icon: '/favicon.ico' }
      ];
    default:
      return commonActions;
  }
}

// Track notification dismissal
function trackNotificationDismissal(data) {
  // Send tracking data to analytics endpoint
  fetch('/api/analytics/notification-dismissed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      notificationId: data.notificationId,
      category: data.category,
      timestamp: Date.now()
    })
  }).catch((error) => {
    console.error('Failed to track notification dismissal:', error);
  });
}
