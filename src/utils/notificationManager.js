/**
 * Comprehensive Notification Manager
 * Handles multi-channel notification delivery with user preferences
 */

import pushNotificationService from './pushNotificationService';
import websocketService from './websocketService';
import * as notificationService from './notificationService';

class NotificationManager {
  constructor() {
    this.preferences = null;
    this.isInitialized = false;
    this.vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    this.channels = {
      inApp: true,
      push: false,
      email: false,
      websocket: false
    };
  }

  /**
   * Initialize the notification manager
   */
  async initialize(userId, organizationId = null) {
    if (this.isInitialized) return;

    try {
      // Load user preferences
      await this.loadPreferences();

      // Initialize in-app notifications (always enabled)
      this.channels.inApp = true;

      // Initialize WebSocket if available
      try {
        if (websocketService.isConnected) {
          websocketService.joinNotificationRoom(organizationId);
          this.channels.websocket = true;
        }
      } catch (error) {
        console.warn('WebSocket initialization failed:', error);
      }

      // Initialize push notifications if enabled and supported
      if (this.preferences?.push_enabled && pushNotificationService.isNotificationSupported()) {
        try {
          await this.initializePushNotifications();
        } catch (error) {
          console.warn('Push notification initialization failed:', error);
        }
      }

      this.isInitialized = true;
      console.log('Notification Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Notification Manager:', error);
    }
  }

  /**
   * Load user notification preferences
   */
  async loadPreferences() {
    try {
      const result = await notificationService.getNotificationPreferencesEnhanced();
      if (result.success) {
        this.preferences = result.data;
      } else {
        // Use default preferences
        this.preferences = this.getDefaultPreferences();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.preferences = this.getDefaultPreferences();
    }
  }

  /**
   * Get default notification preferences
   */
  getDefaultPreferences() {
    return {
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true,
      categories: {
        welcome: true,
        task_assigned: true,
        task_reminder: true,
        task_updated: true,
        project_update: true,
        project_milestone: true,
        team_member_added: true,
        system: true
      },
      priorities: {
        urgent: true,
        high: true,
        normal: true,
        low: false
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00'
      },
      digest_frequency: 'immediate'
    };
  }

  /**
   * Initialize push notifications
   */
  async initializePushNotifications() {
    if (!this.vapidPublicKey) {
      throw new Error('VAPID public key not configured');
    }

    // Request permission
    const permission = await pushNotificationService.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Push notification permission denied');
    }

    // Subscribe to push notifications
    await pushNotificationService.subscribeToPush(this.vapidPublicKey);
    this.channels.push = true;

    // Setup notification handlers
    pushNotificationService.setupNotificationHandlers();

    console.log('Push notifications initialized successfully');
  }

  /**
   * Send notification through appropriate channels
   */
  async sendNotification(notification) {
    if (!this.isInitialized) {
      console.warn('Notification Manager not initialized');
      return;
    }

    const { category, priority, title, body, data = {} } = notification;

    // Check if notification should be sent based on preferences
    if (!this.shouldSendNotification(category, priority)) {
      console.log('Notification filtered by preferences:', category, priority);
      return;
    }

    // Check quiet hours
    if (this.isQuietHours() && priority !== 'urgent') {
      console.log('Notification suppressed due to quiet hours');
      return;
    }

    const results = {};

    // Send in-app notification (always enabled)
    if (this.channels.inApp && this.preferences?.in_app_enabled) {
      try {
        results.inApp = await this.sendInAppNotification(notification);
      } catch (error) {
        console.error('Failed to send in-app notification:', error);
        results.inApp = { success: false, error: error.message };
      }
    }

    // Send push notification
    if (this.channels.push && this.preferences?.push_enabled) {
      try {
        results.push = await this.sendPushNotification(notification);
      } catch (error) {
        console.error('Failed to send push notification:', error);
        results.push = { success: false, error: error.message };
      }
    }

    // Send WebSocket notification for real-time updates
    if (this.channels.websocket) {
      try {
        results.websocket = await this.sendWebSocketNotification(notification);
      } catch (error) {
        console.error('Failed to send WebSocket notification:', error);
        results.websocket = { success: false, error: error.message };
      }
    }

    // Send email notification (if enabled and appropriate)
    if (this.preferences?.email_enabled && this.shouldSendEmail(category, priority)) {
      try {
        results.email = await this.sendEmailNotification(notification);
      } catch (error) {
        console.error('Failed to send email notification:', error);
        results.email = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(notification) {
    const { category, title, body, data, actions, priority } = notification;

    switch (category) {
      case 'welcome':
        return await notificationService.sendWelcomeNotification(data.userId, data.organizationId, data.message);
      case 'task_assigned':
        return await notificationService.sendTaskAssignmentNotification(
          data.userId, data.taskId, data.taskTitle, data.assignedBy, data.projectId, data.dueDate, data.message
        );
      case 'task_reminder':
        return await notificationService.sendTaskReminderNotification(
          data.userId, data.taskId, data.taskTitle, data.dueDate, data.projectId
        );
      case 'project_update':
        return await notificationService.sendProjectUpdateNotificationInApp(
          data.userId, data.projectId, data.projectName, data.updateType, data.updatedBy, data.changes
        );
      case 'system':
        return await notificationService.sendSystemNotification(
          data.userId, title, body, priority, actions, data.organizationId
        );
      default:
        return await notificationService.createInAppNotification(
          data.userId, title, body, category, priority, actions, data.organizationId, data
        );
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(notification) {
    const { title, body, priority, category, data, actions } = notification;

    const pushData = {
      title,
      body,
      priority,
      category,
      data,
      actions: actions?.slice(0, 3) // Browser limit
    };

    await pushNotificationService.showPriorityNotification(pushData);
    return { success: true };
  }

  /**
   * Send WebSocket notification
   */
  async sendWebSocketNotification(notification) {
    if (!websocketService.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const { data } = notification;
    
    if (data.targetUserId) {
      websocketService.sendNotificationToUser(data.targetUserId, notification);
    } else if (data.organizationId && data.targetRoles) {
      websocketService.sendNotificationToRoles(data.organizationId, data.targetRoles, notification);
    } else if (data.organizationId) {
      websocketService.sendNotificationToOrganization(data.organizationId, notification);
    }

    return { success: true };
  }

  /**
   * Send email notification (placeholder - would integrate with backend)
   */
  async sendEmailNotification(notification) {
    // This would typically call a backend API to send emails
    console.log('Email notification would be sent:', notification);
    return { success: true, message: 'Email notification queued' };
  }

  /**
   * Check if notification should be sent based on preferences
   */
  shouldSendNotification(category, priority) {
    if (!this.preferences) return true;

    // Check category preference
    if (this.preferences.categories && !this.preferences.categories[category]) {
      return false;
    }

    // Check priority preference
    if (this.preferences.priorities && !this.preferences.priorities[priority]) {
      return false;
    }

    return true;
  }

  /**
   * Check if currently in quiet hours
   */
  isQuietHours() {
    if (!this.preferences?.quiet_hours?.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.preferences.quiet_hours.start_time.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quiet_hours.end_time.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day range
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Check if email should be sent for this notification
   */
  shouldSendEmail(category, priority) {
    // Send emails for urgent/high priority or specific categories
    return priority === 'urgent' || priority === 'high' || 
           ['welcome', 'task_assigned', 'project_milestone'].includes(category);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(newPreferences) {
    try {
      const result = await notificationService.updateNotificationPreferencesEnhanced(newPreferences);
      if (result.success) {
        this.preferences = newPreferences;
        
        // Reinitialize channels based on new preferences
        if (newPreferences.push_enabled && !this.channels.push) {
          await this.initializePushNotifications();
        } else if (!newPreferences.push_enabled && this.channels.push) {
          await pushNotificationService.unsubscribeFromPush();
          this.channels.push = false;
        }
      }
      return result;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test notification functionality
   */
  async testNotification() {
    const testNotification = {
      category: 'system',
      priority: 'normal',
      title: 'Test Notification',
      body: 'This is a test notification from Agno WorkSphere',
      data: {
        userId: 'current-user',
        url: '/',
        testNotification: true
      }
    };

    return await this.sendNotification(testNotification);
  }

  /**
   * Get notification manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      channels: this.channels,
      preferences: this.preferences,
      pushSupported: pushNotificationService.isNotificationSupported(),
      pushPermission: pushNotificationService.getPermissionStatus(),
      websocketConnected: websocketService.isConnected
    };
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager;
