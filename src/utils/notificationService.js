import realApiService from './realApiService.js';

/**
 * Notification service for managing user notifications
 */

// Get notifications for the current user (real backend if available)
export const getNotifications = async (filters = {}) => {
  try {
    const result = await realApiService.notifications.getAll(filters);
    // The backend returns raw list; adapt to previous structure
    return {
      success: true,
      data: result?.data || result || [],
      error: null,
    };
  } catch (error) {
    console.error(
      'Failed to fetch notifications, falling back to mock:',
      error
    );
    return { success: false, data: [], error: error.message };
  }
};

// Create a notification
export const createNotification = async (notificationData) => {
  try {
    const result = await realApiService.notifications.create(notificationData);
    return { success: true, data: result?.data || result, error: null };
  } catch (error) {
    console.error('Failed to create notification:', error);
    return { success: false, error: error.message };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const result = await realApiService.notifications.markAsRead(
      notificationId
    );
    return { success: true, data: result?.data || result, error: null };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: error.message };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    const result = await realApiService.notifications.markAllAsRead();
    return { success: true, data: result?.data || result, error: null };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  try {
    const result = await realApiService.notifications.delete(notificationId);
    return { success: true, data: result?.data || result, error: null };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false, error: error.message };
  }
};

// Get notification stats (unread counts)
export const getNotificationStats = async () => {
  try {
    const result = await realApiService.notifications.getStats();
    return { success: true, data: result?.data || result, error: null };
  } catch (error) {
    console.error('Failed to fetch notification stats:', error);
    return { success: false, error: error.message };
  }
};

// Create a welcome notification for new users (client-side convenience)
export const createWelcomeNotification = async (
  userId,
  organizationId,
  organizationName
) => {
  try {
    const payload = {
      user_id: userId,
      organization_id: organizationId,
      title: 'Welcome to Agno WorkSphere!',
      message: `Welcome to ${organizationName}! Start by exploring your dashboard and setting up your first project.`,
      type: 'welcome',
      priority: 'high',
      action_url: '/role-based-dashboard',
      notification_metadata: { isWelcome: true },
    };
    return await createNotification(payload);
  } catch (error) {
    console.error('Failed to create welcome notification:', error);
    return { success: false, error: error.message };
  }
};

// Get notification preferences (keep mock for now)
export const getNotificationPreferences = async () => {
  // If backend supports preferences endpoint, route via realApiService here
  return {
    email: true,
    push: true,
    inApp: true,
    types: {
      tasks: true,
      projects: true,
      mentions: true,
      deadlines: true,
      system: false,
    },
  };
};

// Update notification preferences (placeholder)
export const updateNotificationPreferences = async (preferences) => {
  try {
    return { success: true, data: preferences };
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return { success: false, error: error.message };
  }
};

// Check if user is a first-time user
export const checkFirstTimeUser = async () => {
  try {
    const result = await getNotifications({ limit: 1 });
    const notifications = result.data || [];
    if (notifications.length === 0) return true;
    const hasWelcome = notifications.some(
      (n) => n.type === 'welcome' || n.notification_metadata?.isWelcome
    );
    return !hasWelcome;
  } catch (error) {
    console.error('Failed to check first-time user status:', error);
    return false;
  }
};

// Generate mock notifications (dev helper)
export const generateMockNotifications = () => [
  {
    id: 'welcome_001',
    type: 'welcome',
    title: 'Welcome to Agno WorkSphere!',
    message:
      'Welcome to your new workspace! Start by exploring your dashboard and setting up your first project.',
    timestamp: new Date(),
    isRead: false,
    read: false,
    priority: 'high',
    data: {
      isWelcome: true,
      actions: [
        { label: 'Get Started', variant: 'default', action: 'tour' },
        { label: 'View Profile', variant: 'outline', action: 'profile' },
      ],
    },
  },
];

// Helper functions for specific notification types
export const notifyProjectCreated = async (projectData, creatorId) => {
  return createNotification({
    type: 'project_created',
    title: 'Project Created Successfully',
    message: `Project "${projectData.name}" has been created successfully.`,
    data: { projectId: projectData.id, projectName: projectData.name },
    userId: creatorId,
    priority: 'medium',
  });
};

export const notifyTaskAssigned = async (taskData, assigneeId, assignerId) => {
  return createNotification({
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `You have been assigned to task "${taskData.title}".`,
    data: { taskId: taskData.id, taskTitle: taskData.title, assignerId },
    userId: assigneeId,
    priority: 'high',
  });
};

export const notifyTaskCompleted = async (taskData, projectOwnerId) => {
  return createNotification({
    type: 'task_completed',
    title: 'Task Completed',
    message: `Task "${taskData.title}" has been completed.`,
    data: { taskId: taskData.id, taskTitle: taskData.title },
    userId: projectOwnerId,
    priority: 'medium',
  });
};

export const notifyTaskUpdated = async (taskData, projectOwnerId) => {
  return createNotification({
    type: 'task_updated',
    title: 'Task Updated',
    message: `Task "${taskData.title}" has been updated.`,
    data: { taskId: taskData.id, taskTitle: taskData.title },
    userId: projectOwnerId,
    priority: 'low',
  });
};

export const notifyTeamMemberAdded = async (
  memberData,
  projectId,
  projectOwnerId
) => {
  return createNotification({
    type: 'team_member_added',
    title: 'New Team Member',
    message: `${memberData.name} has been added to the project.`,
    data: { memberId: memberData.id, memberName: memberData.name, projectId },
    userId: projectOwnerId,
    priority: 'medium',
  });
};

// Real-time notification manager
class NotificationManager {
  constructor() {
    this.listeners = new Set();
    this.notifications = [];
    this.isPolling = false;
    this.pollingInterval = null;
  }

  // Start real-time polling
  startRealTime() {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollingInterval = setInterval(async () => {
      try {
        const result = await getNotifications();
        if (result.success) {
          this.notifications = result.data;
          this.notifyListeners();
        }
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    }, 30000); // Poll every 30 seconds

    console.log('Real-time notifications started');
  }

  // Stop real-time polling
  stopRealTime() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('Real-time notifications stopped');
  }

  // Add listener
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify listeners
  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.notifications);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Get unread count
  getUnreadCount() {
    return this.notifications.filter((n) => !n.read).length;
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

// In-App Notification Methods
export const createInAppNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/create', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create in-app notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendWelcomeNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/welcome', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send welcome notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendTaskAssignmentNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/task-assignment', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send task assignment notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendTaskReminderNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/task-reminder', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send task reminder notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendTaskStatusUpdateNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/task-status-update', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send task status update notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendProjectUpdateNotificationInApp = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/project-update', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send project update notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendProjectMilestoneNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/project-milestone', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send project milestone notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendTeamMemberAddedNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/team-member-added', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send team member added notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendSystemNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/system', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send system notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendRoleBasedNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/role-based', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send role-based notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendOrganizationWideNotification = async (notificationData) => {
  try {
    const result = await realApiService.post('/notifications/in-app/organization-wide', notificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send organization-wide notification:', error);
    return { success: false, error: error.message };
  }
};

export const getUserNotifications = async (params = {}) => {
  try {
    const result = await realApiService.notifications.getUserNotifications(params);
    return { success: true, data: result.notifications || [] };
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    return { success: false, error: error.message };
  }
};

export const getUnreadCount = async (organizationId = null) => {
  try {
    const result = await realApiService.notifications.getUnreadCount(organizationId);
    return { success: true, count: result.unread_count || 0 };
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return { success: false, count: 0 };
  }
};

export const markNotificationAsReadInApp = async (notificationId) => {
  try {
    const result = await realApiService.put(`/notifications/in-app/${notificationId}/read`);

    // Send real-time update via WebSocket if available
    try {
      const websocketService = (await import('./websocketService.js')).default;
      if (websocketService.isConnected) {
        websocketService.markNotificationAsRead(notificationId);
      }
    } catch (e) {
      // WebSocket not available, continue without real-time update
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const markAllNotificationsAsReadInApp = async (organizationId = null) => {
  try {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    const result = await realApiService.put(`/notifications/in-app/mark-all-read${params}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

export const deleteNotificationInApp = async (notificationId) => {
  try {
    const result = await realApiService.delete(`/notifications/in-app/${notificationId}`);

    // Send real-time update via WebSocket if available
    try {
      const websocketService = (await import('./websocketService.js')).default;
      if (websocketService.isConnected) {
        websocketService.deleteNotification(notificationId);
      }
    } catch (e) {
      // WebSocket not available, continue without real-time update
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced Notification Preferences
export const getNotificationPreferencesEnhanced = async () => {
  try {
    const result = await realApiService.get('/notifications/preferences');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return { success: false, error: error.message };
  }
};

export const updateNotificationPreferencesEnhanced = async (preferences) => {
  try {
    const result = await realApiService.put('/notifications/preferences', preferences);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return { success: false, error: error.message };
  }
};

export const resetNotificationPreferences = async () => {
  try {
    const result = await realApiService.delete('/notifications/preferences');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to reset notification preferences:', error);
    return { success: false, error: error.message };
  }
};

// Default export
const notificationService = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createWelcomeNotification,
  createNotification,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  checkFirstTimeUser,
  generateMockNotifications,
  // New notification helpers
  notifyProjectCreated,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyTaskUpdated,
  notifyTeamMemberAdded,
  // In-App notification methods
  createInAppNotification,
  sendWelcomeNotification,
  sendTaskAssignmentNotification,
  sendTaskReminderNotification,
  sendTaskStatusUpdateNotification,
  sendProjectUpdateNotificationInApp,
  sendProjectMilestoneNotification,
  sendTeamMemberAddedNotification,
  sendSystemNotification,
  sendRoleBasedNotification,
  sendOrganizationWideNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsReadInApp,
  markAllNotificationsAsReadInApp,
  deleteNotificationInApp,
  // Enhanced preferences
  getNotificationPreferencesEnhanced,
  updateNotificationPreferencesEnhanced,
  resetNotificationPreferences,
  // Real-time manager
  manager: notificationManager,
};

export default notificationService;
