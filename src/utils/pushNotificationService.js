/**
 * Browser Push Notification Service
 * Handles browser push notifications with user permission management
 */

class PushNotificationService {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.registration = null;
    this.subscription = null;
  }

  /**
   * Check if push notifications are supported
   */
  isNotificationSupported() {
    return this.isSupported;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    return this.permission;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  /**
   * Initialize service worker for push notifications
   */
  async initializeServiceWorker() {
    if (!this.isSupported) {
      throw new Error('Service workers are not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(vapidPublicKey) {
    if (!this.registration) {
      await this.initializeServiceWorker();
    }

    if (this.permission !== 'granted') {
      await this.requestPermission();
    }

    if (this.permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push subscription successful');
      return this.subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        this.subscription = null;
        console.log('Push unsubscription successful');
        return true;
      } catch (error) {
        console.error('Push unsubscription failed:', error);
        throw error;
      }
    }
    return false;
  }

  /**
   * Show local notification
   */
  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      if (this.registration) {
        // Use service worker to show notification
        await this.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to basic notification
        new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      throw error;
    }
  }

  /**
   * Show notification with action buttons
   */
  async showActionNotification(title, body, actions = [], data = {}) {
    const options = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      actions: actions.map(action => ({
        action: action.id,
        title: action.title,
        icon: action.icon || '/favicon.ico'
      })),
      data,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    return this.showNotification(title, options);
  }

  /**
   * Show priority notification with custom styling
   */
  async showPriorityNotification(notification) {
    const { title, body, priority = 'normal', category, actions = [] } = notification;

    let options = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { category, priority, ...notification.data },
      vibrate: [200, 100, 200]
    };

    // Customize based on priority
    switch (priority) {
      case 'urgent':
        options.requireInteraction = true;
        options.vibrate = [300, 100, 300, 100, 300];
        options.silent = false;
        break;
      case 'high':
        options.requireInteraction = true;
        options.vibrate = [200, 100, 200];
        break;
      case 'low':
        options.silent = true;
        options.vibrate = [];
        break;
      default:
        // normal priority - use defaults
        break;
    }

    // Add action buttons if provided
    if (actions.length > 0) {
      options.actions = actions.slice(0, 3).map(action => ({
        action: action.id,
        title: action.title,
        icon: action.icon || '/favicon.ico'
      }));
    }

    return this.showNotification(title, options);
  }

  /**
   * Handle notification click events
   */
  setupNotificationHandlers() {
    if (!this.registration) return;

    // Handle notification click
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { notification, action } = event.data;
        this.handleNotificationClick(notification, action);
      }
    });
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notification, action) {
    console.log('Notification clicked:', notification, action);
    
    // Handle different actions
    if (action) {
      switch (action) {
        case 'view':
          if (notification.data && notification.data.url) {
            window.open(notification.data.url, '_blank');
          }
          break;
        case 'dismiss':
          // Just close the notification
          break;
        default:
          // Custom action handling
          this.handleCustomAction(action, notification);
          break;
      }
    } else {
      // Default click behavior
      if (notification.data && notification.data.url) {
        window.open(notification.data.url, '_blank');
      }
    }
  }

  /**
   * Handle custom notification actions
   */
  handleCustomAction(action, notification) {
    // Emit custom event for application to handle
    window.dispatchEvent(new CustomEvent('notificationAction', {
      detail: { action, notification }
    }));
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get subscription details
   */
  getSubscription() {
    return this.subscription;
  }

  /**
   * Check if currently subscribed
   */
  isSubscribed() {
    return !!this.subscription;
  }

  /**
   * Test notification functionality
   */
  async testNotification() {
    if (this.permission !== 'granted') {
      await this.requestPermission();
    }

    if (this.permission === 'granted') {
      await this.showNotification('Test Notification', {
        body: 'This is a test notification from Agno WorkSphere',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
      return true;
    }
    return false;
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
