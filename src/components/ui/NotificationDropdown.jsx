import React, { useState, useEffect, useRef } from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import * as notificationService from '../../utils/notificationService';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Real-time updates via WebSocket (fallback to polling)
  useEffect(() => {
    let pollHandle;

    // Polling fallback for unread stats to keep badge fresh even when closed
    const startPolling = () => {
      pollHandle = setInterval(async () => {
        try {
          const stats = await notificationService.getNotificationStats();
          if (stats.success) {
            setUnreadCount(stats.data.unread_notifications || 0);
          }
        } catch (e) {
          // ignore
        }
      }, 20000); // every 20s
    };

    // WebSocket-based live updates if available
    let removeWsListeners = [];
    try {
      const wsMod = require('../../utils/websocketService.js');
      const websocketService = wsMod.default || wsMod;

      // Join notification room for real-time updates
      websocketService.joinNotificationRoom();

      const onNotification = (payload) => {
        console.log('Received real-time notification:', payload);
        // Prepend new notification
        setNotifications((prev) => [payload, ...prev]);
        setUnreadCount((prev) => prev + (payload.read ? 0 : 1));
      };

      const onNotificationRead = (payload) => {
        console.log('Notification marked as read:', payload);
        setNotifications((prev) =>
          prev.map(n => n.id === payload.notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      };

      const onNotificationDeleted = (payload) => {
        console.log('Notification deleted:', payload);
        setNotifications((prev) => prev.filter(n => n.id !== payload.notificationId));
        setUnreadCount((prev) => {
          const notification = notifications.find(n => n.id === payload.notificationId);
          return notification && !notification.read ? Math.max(0, prev - 1) : prev;
        });
      };

      const onUnreadCountUpdated = (payload) => {
        console.log('Unread count updated:', payload);
        setUnreadCount(payload.count);
      };

      // Register event listeners
      websocketService.on('notification', onNotification);
      websocketService.on('notificationRead', onNotificationRead);
      websocketService.on('notificationDeleted', onNotificationDeleted);
      websocketService.on('unreadCountUpdated', onUnreadCountUpdated);

      removeWsListeners = [
        () => websocketService.off('notification', onNotification),
        () => websocketService.off('notificationRead', onNotificationRead),
        () => websocketService.off('notificationDeleted', onNotificationDeleted),
        () => websocketService.off('unreadCountUpdated', onUnreadCountUpdated),
        () => websocketService.leaveNotificationRoom()
      ];
    } catch (e) {
      console.warn('WebSocket service unavailable for notifications:', e);
    }

    startPolling();

    return () => {
      if (pollHandle) clearInterval(pollHandle);
      removeWsListeners.forEach(cleanup => cleanup());
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await notificationService.getNotifications();
      if (result.success) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await notificationService.markAllNotificationsAsRead();
      if (result.success) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        // Notify WebSocket listeners about the bulk update
        try {
          const wsMod = require('../../utils/websocketService.js');
          const websocketService = wsMod.default || wsMod;
          websocketService.emit('unreadCountUpdated', { count: 0 });
        } catch (wsError) {
          console.warn('WebSocket notification failed:', wsError);
        }

        // Force refresh notification stats
        const stats = await notificationService.getNotificationStats();
        if (stats.success) {
          setUnreadCount(stats.data.unread_notifications || 0);
        }
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => {
        const notification = notifications.find((n) => n.id === notificationId);
        return notification && !notification.read
          ? Math.max(0, prev - 1)
          : prev;
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'project':
      case 'project_created':
      case 'project_update':
        return 'FolderPlus';
      case 'project_milestone':
        return 'Target';
      case 'task_assigned':
        return 'UserCheck';
      case 'task_completed':
        return 'CheckCircle';
      case 'task_updated':
      case 'task_reminder':
        return 'Clock';
      case 'team_member_added':
        return 'UserPlus';
      case 'welcome':
        return 'Heart';
      case 'system':
        return 'Settings';
      default:
        return 'Bell';
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'urgent') return 'text-red-600';
    if (priority === 'high') return 'text-red-500';
    if (priority === 'normal') return 'text-blue-500';
    if (priority === 'low') return 'text-gray-500';
    return 'text-gray-500';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return badges[priority] || badges.normal;
  };

  const handleActionButton = async (notification, action) => {
    try {
      switch (action.action) {
        case 'view_task':
          if (notification.action_url) {
            navigate(notification.action_url);
          }
          break;
        case 'view_project':
          if (notification.action_url) {
            navigate(notification.action_url);
          }
          break;
        case 'view_profile':
          navigate('/profile');
          break;
        case 'tour':
          navigate('/role-based-dashboard?tour=true');
          break;
        case 'accept_task':
          // Handle task acceptance
          console.log('Accepting task:', notification);
          break;
        case 'complete_task':
          // Handle task completion
          console.log('Completing task:', notification);
          break;
        case 'dismiss':
          await handleMarkAsRead(notification.id);
          break;
        case 'view_details':
          if (notification.action_url) {
            navigate(notification.action_url);
          }
          break;
        default:
          console.log('Unknown action:', action.action);
      }

      // Close dropdown after action
      setIsOpen(false);
    } catch (error) {
      console.error('Error handling action button:', error);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className='relative' ref={dropdownRef}>
      {/* Notification Bell Button */}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setIsOpen(!isOpen)}
        className='relative'
      >
        <Icon name='Bell' size={18} />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className='absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg z-50'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-border'>
            <h3 className='text-sm font-semibold text-text-primary'>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={handleMarkAllAsRead}
                className='text-xs'
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className='max-h-96 overflow-y-auto'>
            {loading ? (
              <div className='p-4 text-center text-text-secondary'>
                <Icon
                  name='Loader2'
                  size={20}
                  className='animate-spin mx-auto mb-2'
                />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className='p-4 text-center text-text-secondary'>
                <Icon
                  name='Bell'
                  size={24}
                  className='mx-auto mb-2 opacity-50'
                />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-border hover:bg-muted transition-colors ${
                    !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className='flex items-start space-x-3'>
                    <div
                      className={`flex-shrink-0 ${getNotificationColor(
                        notification.type,
                        notification.priority
                      )}`}
                    >
                      <Icon
                        name={getNotificationIcon(notification.type)}
                        size={18}
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between mb-2'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <p className='text-sm font-semibold text-text-primary'>
                              {notification.title}
                            </p>
                            {notification.priority && notification.priority !== 'normal' && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityBadge(notification.priority)}`}>
                                {notification.priority.toUpperCase()}
                              </span>
                            )}
                            {!notification.read && (
                              <div className='w-2 h-2 bg-primary rounded-full'></div>
                            )}
                          </div>
                          <p className='text-sm text-text-secondary mb-2'>
                            {notification.message}
                          </p>
                          <p className='text-xs text-text-secondary'>
                            {formatTimeAgo(
                              notification.createdAt || notification.created_at
                            )}
                          </p>
                        </div>
                        <div className='flex items-center space-x-1 ml-2'>
                          {!notification.read && (
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => handleMarkAsRead(notification.id)}
                              className='h-6 w-6 hover:bg-green-100 hover:text-green-600'
                              title='Mark as read'
                            >
                              <Icon name='Check' size={12} />
                            </Button>
                          )}
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() =>
                              handleDeleteNotification(notification.id)
                            }
                            className='h-6 w-6 text-destructive hover:text-destructive hover:bg-red-100'
                            title='Delete notification'
                          >
                            <Icon name='X' size={12} />
                          </Button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {notification.notification_metadata?.action_buttons && (
                        <div className='flex flex-wrap gap-2 mt-3'>
                          {notification.notification_metadata.action_buttons.map((action, index) => (
                            <Button
                              key={index}
                              variant={action.variant === 'primary' ? 'default' :
                                     action.variant === 'success' ? 'default' : 'outline'}
                              size='sm'
                              onClick={() => handleActionButton(notification, action)}
                              className={`text-xs px-3 py-1 h-7 ${
                                action.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                action.variant === 'secondary' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : ''
                              }`}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Click to navigate if action_url exists and no action buttons */}
                      {notification.action_url && !notification.notification_metadata?.action_buttons && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            navigate(notification.action_url);
                            setIsOpen(false);
                          }}
                          className='text-xs mt-2 p-0 h-auto text-primary hover:text-primary-dark'
                        >
                          View Details →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className='p-3 border-t border-border'>
              <Button
                variant='ghost'
                size='sm'
                className='w-full text-xs'
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page if it exists
                }}
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
