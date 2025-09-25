import React, { useState, useEffect } from 'react';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useUserProfile } from '../../hooks/useUserProfile';
import realApiService from '../../utils/realApiService';

const NotificationsPage = () => {
  const { userProfile, profileLoading } = useUserProfile();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  // Load notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await realApiService.notifications.getAll();
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Fallback to mock data for development
      setNotifications([
        {
          id: '1',
          title: 'Welcome to WorkSphere!',
          message: 'Get started by exploring your dashboard and creating your first project.',
          type: 'welcome',
          priority: 'normal',
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          action_url: '/role-based-dashboard'
        },
        {
          id: '2',
          title: 'Task Assignment',
          message: 'You have been assigned to "Website Redesign" task.',
          type: 'task_assignment',
          priority: 'high',
          read: false,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          action_url: '/kanban-board'
        },
        {
          id: '3',
          title: 'Project Update',
          message: 'Mobile App Development project has been updated.',
          type: 'project_update',
          priority: 'normal',
          read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          action_url: '/project-management'
        },
        {
          id: '4',
          title: 'Team Member Added',
          message: 'John Doe has joined your organization.',
          type: 'team_member_added',
          priority: 'low',
          read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
          action_url: '/team-members'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await realApiService.notifications.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Optimistic update for development
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await realApiService.notifications.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Optimistic update for development
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await realApiService.notifications.delete(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Optimistic update for development
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      welcome: 'Heart',
      task_assignment: 'UserCheck',
      task_reminder: 'Clock',
      task_status_update: 'Edit',
      project_update: 'FolderOpen',
      project_milestone: 'Target',
      team_member_added: 'UserPlus',
      system: 'Settings',
      organization_wide: 'Building'
    };
    return iconMap[type] || 'Bell';
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return 'text-red-600 bg-red-100';
    if (priority === 'low') return 'text-gray-600 bg-gray-100';
    
    const colorMap = {
      welcome: 'text-purple-600 bg-purple-100',
      task_assignment: 'text-blue-600 bg-blue-100',
      task_reminder: 'text-yellow-600 bg-yellow-100',
      task_status_update: 'text-green-600 bg-green-100',
      project_update: 'text-indigo-600 bg-indigo-100',
      project_milestone: 'text-orange-600 bg-orange-100',
      team_member_added: 'text-teal-600 bg-teal-100',
      system: 'text-gray-600 bg-gray-100',
      organization_wide: 'text-pink-600 bg-pink-100'
    };
    return colorMap[type] || 'text-blue-600 bg-blue-100';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(notif => !notif.read).length;

  const breadcrumbItems = [
    { label: 'Dashboard', path: '/role-based-dashboard' },
    { label: 'Notifications', path: '/notifications' }
  ];

  if (profileLoading || loading) {
    return (
      <div className='min-h-screen bg-background'>
        <RoleBasedHeader />
        <div className='container mx-auto px-4 py-8'>
          <div className='flex flex-col items-center justify-center space-y-4 py-16'>
            <Icon name='Loader2' size={32} className='animate-spin text-primary' />
            <div className='text-lg text-muted-foreground'>Loading notifications...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <RoleBasedHeader />
      
      <div className='container mx-auto px-4 py-8'>
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center'>
                <Icon name='Bell' size={24} className='text-white' />
              </div>
              <div>
                <h1 className='text-3xl font-bold text-foreground'>Notifications</h1>
                <p className='text-muted-foreground'>
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline">
                <Icon name="CheckCheck" size={16} className="mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className='mb-6'>
          <div className='flex space-x-1 bg-muted p-1 rounded-lg w-fit'>
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'read', label: 'Read', count: notifications.length - unreadCount }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className='space-y-4'>
          {filteredNotifications.length === 0 ? (
            <div className='text-center py-16'>
              <div className='w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4'>
                <Icon name='Bell' size={24} className='text-muted-foreground' />
              </div>
              <h3 className='text-lg font-medium text-foreground mb-2'>No notifications</h3>
              <p className='text-muted-foreground'>
                {filter === 'unread' ? "You're all caught up!" : 'No notifications to show.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`bg-card border rounded-lg p-4 transition-colors hover:bg-muted/50 ${
                  !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                }`}
              >
                <div className='flex items-start gap-4'>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type, notification.priority)}`}>
                    <Icon name={getNotificationIcon(notification.type)} size={16} />
                  </div>
                  
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex-1'>
                        <h4 className='font-medium text-foreground mb-1'>{notification.title}</h4>
                        <p className='text-sm text-muted-foreground mb-2'>{notification.message}</p>
                        <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                          <span>{formatTimeAgo(notification.created_at)}</span>
                          {notification.priority === 'high' && (
                            <span className='bg-red-100 text-red-700 px-2 py-1 rounded-full'>High Priority</span>
                          )}
                        </div>
                      </div>
                      
                      <div className='flex items-center gap-2'>
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Icon name="Check" size={14} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
