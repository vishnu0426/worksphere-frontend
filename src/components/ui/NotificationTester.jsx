import React, { useState } from 'react';
import Button from './Button';
import Icon from '../AppIcon';
import * as notificationService from '../../utils/notificationService';

const NotificationTester = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (message, success = true) => {
    setResults(prev => [...prev, { message, success, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testNotification = async (type, data) => {
    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'welcome':
          result = await notificationService.sendWelcomeNotification(data);
          break;
        case 'task_assignment':
          result = await notificationService.sendTaskAssignmentNotification(data);
          break;
        case 'task_reminder':
          result = await notificationService.sendTaskReminderNotification(data);
          break;
        case 'task_status_update':
          result = await notificationService.sendTaskStatusUpdateNotification(data);
          break;
        case 'project_update':
          result = await notificationService.sendProjectUpdateNotificationInApp(data);
          break;
        case 'project_milestone':
          result = await notificationService.sendProjectMilestoneNotification(data);
          break;
        case 'team_member_added':
          result = await notificationService.sendTeamMemberAddedNotification(data);
          break;
        case 'system':
          result = await notificationService.sendSystemNotification(data);
          break;
        case 'role_based':
          result = await notificationService.sendRoleBasedNotification(data);
          break;
        case 'organization_wide':
          result = await notificationService.sendOrganizationWideNotification(data);
          break;
        default:
          result = await notificationService.createInAppNotification(data);
      }
      
      if (result.success) {
        addResult(`✅ ${type} notification sent successfully`, true);
      } else {
        addResult(`❌ Failed to send ${type} notification: ${result.error}`, false);
      }
    } catch (error) {
      addResult(`❌ Error sending ${type} notification: ${error.message}`, false);
    }
    setLoading(false);
  };

  const testWelcomeNotification = () => {
    testNotification('welcome', {
      user_name: 'John Doe',
      organization_name: 'Test Organization',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testTaskAssignmentNotification = () => {
    testNotification('task_assignment', {
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      task_title: 'Complete project documentation',
      task_id: '123e4567-e89b-12d3-a456-426614174002',
      project_name: 'Test Project',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testTaskReminderNotification = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    testNotification('task_reminder', {
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      task_title: 'Review code changes',
      task_id: '123e4567-e89b-12d3-a456-426614174003',
      due_date: tomorrow.toISOString(),
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testTaskStatusUpdateNotification = () => {
    testNotification('task_status_update', {
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      task_title: 'Fix login bug',
      task_id: '123e4567-e89b-12d3-a456-426614174004',
      old_status: 'In Progress',
      new_status: 'Complete',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testProjectUpdateNotification = () => {
    testNotification('project_update', {
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      project_name: 'Test Project',
      project_id: '123e4567-e89b-12d3-a456-426614174005',
      update_message: 'Added new features and bug fixes',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testProjectMilestoneNotification = () => {
    testNotification('project_milestone', {
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      project_name: 'Test Project',
      project_id: '123e4567-e89b-12d3-a456-426614174005',
      milestone_name: 'Phase 1 Complete',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testTeamMemberAddedNotification = () => {
    testNotification('team_member_added', {
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      project_name: 'Test Project',
      project_id: '123e4567-e89b-12d3-a456-426614174005',
      new_member_name: 'Jane Smith',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testSystemNotification = () => {
    testNotification('system', {
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2-4 AM EST',
      priority: 'high',
      organization_id: '123e4567-e89b-12d3-a456-426614174000'
    });
  };

  const testRoleBasedNotification = () => {
    testNotification('role_based', {
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      target_roles: ['admin', 'owner'],
      title: 'Admin Notice',
      message: 'New admin features are now available',
      category: 'system',
      priority: 'normal'
    });
  };

  const testOrganizationWideNotification = () => {
    testNotification('organization_wide', {
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Company Update',
      message: 'We are excited to announce new features coming next month!',
      category: 'announcement',
      priority: 'normal'
    });
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 bg-surface border border-border rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Icon name="Bell" size={20} />
          In-App Notification Tester
        </h2>
        <Button variant="outline" size="sm" onClick={clearResults}>
          Clear Results
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Button
          onClick={testWelcomeNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Heart" size={16} />
          Welcome
        </Button>

        <Button
          onClick={testTaskAssignmentNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="UserCheck" size={16} />
          Task Assignment
        </Button>

        <Button
          onClick={testTaskReminderNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Clock" size={16} />
          Task Reminder
        </Button>

        <Button
          onClick={testTaskStatusUpdateNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Edit" size={16} />
          Task Status Update
        </Button>

        <Button
          onClick={testProjectUpdateNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="FolderPlus" size={16} />
          Project Update
        </Button>

        <Button
          onClick={testProjectMilestoneNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Target" size={16} />
          Project Milestone
        </Button>

        <Button
          onClick={testTeamMemberAddedNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="UserPlus" size={16} />
          Team Member Added
        </Button>

        <Button
          onClick={testSystemNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Settings" size={16} />
          System Notification
        </Button>

        <Button
          onClick={testRoleBasedNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Users" size={16} />
          Role-Based
        </Button>

        <Button
          onClick={testOrganizationWideNotification}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Icon name="Building" size={16} />
          Organization-Wide
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="text-sm font-medium text-text-primary mb-3">Test Results:</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`text-sm p-2 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                <span className="text-xs text-gray-500">[{result.timestamp}]</span> {result.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Icon name="Loader2" size={20} className="animate-spin mr-2" />
          <span className="text-text-secondary">Sending notification...</span>
        </div>
      )}
    </div>
  );
};

export default NotificationTester;
