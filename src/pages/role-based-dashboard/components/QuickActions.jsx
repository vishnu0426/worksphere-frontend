import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuickActions = ({
  userRole,
  onCreateProject,
  onInviteMembers,
  onManageUsers,
  onCreateOrganization,
  onCreateAIProject,
}) => {
  const navigate = useNavigate();
  const getActionsForRole = () => {
    const role = userRole?.toLowerCase();
    switch (role) {
      case 'owner':
        return [
          {
            label: 'Create AI Project',
            icon: 'Sparkles',
            variant: 'default',
            action: 'create_ai_project',
            featured: true,
          },
          {
            label: 'Create Organization',
            icon: 'Building2',
            variant: 'outline',
            action: 'create_organization',
          },
          {
            label: 'Create Project',
            icon: 'FolderPlus',
            variant: 'outline',
            action: 'create_project',
          },
          {
            label: 'Manage Users',
            icon: 'Users',
            variant: 'outline',
            action: 'manage_users',
          },
          {
            label: 'View Analytics',
            icon: 'BarChart3',
            variant: 'outline',
            action: 'view_analytics',
          },
          {
            label: 'Organization Settings',
            icon: 'Settings',
            variant: 'outline',
            action: 'org_settings',
          },
          {
            label: 'Invite Members',
            icon: 'UserPlus',
            variant: 'outline',
            action: 'invite_members',
          },
          {
            label: 'Export Data',
            icon: 'Download',
            variant: 'ghost',
            action: 'export_data',
          },
        ];

      case 'admin':
        return [
          {
            label: 'Manage Team',
            icon: 'Users',
            variant: 'default',
            action: 'manage_team',
          },
          {
            label: 'View Reports',
            icon: 'FileText',
            variant: 'outline',
            action: 'view_reports',
          },
          {
            label: 'Project Settings',
            icon: 'Settings',
            variant: 'outline',
            action: 'project_settings',
          },
          {
            label: 'Invite Members',
            icon: 'UserPlus',
            variant: 'outline',
            action: 'invite_members',
          },
          {
            label: 'Bulk Actions',
            icon: 'List',
            variant: 'ghost',
            action: 'bulk_actions',
          },
        ];

      case 'member':
        return [
          {
            label: 'Create Task',
            icon: 'Plus',
            variant: 'default',
            action: 'create_task',
          },
          {
            label: 'My Tasks',
            icon: 'CheckSquare',
            variant: 'outline',
            action: 'my_tasks',
          },
          {
            label: 'Join Project',
            icon: 'UserPlus',
            variant: 'outline',
            action: 'join_project',
          },
          {
            label: 'Time Tracking',
            icon: 'Clock',
            variant: 'outline',
            action: 'time_tracking',
          },
          {
            label: 'Upload Files',
            icon: 'Upload',
            variant: 'outline',
            action: 'upload_files',
          },
          {
            label: 'Calendar View',
            icon: 'Calendar',
            variant: 'ghost',
            action: 'calendar_view',
          },
        ];

      case 'viewer':
        return [
          {
            label: 'View Projects',
            icon: 'Eye',
            variant: 'default',
            action: 'view_projects',
          },
          {
            label: 'Download Reports',
            icon: 'Download',
            variant: 'outline',
            action: 'download_reports',
          },
          {
            label: 'Export Data',
            icon: 'FileText',
            variant: 'outline',
            action: 'export_data',
          },
          {
            label: 'Print Dashboard',
            icon: 'Printer',
            variant: 'outline',
            action: 'print_dashboard',
          },
          {
            label: 'Share Link',
            icon: 'Share',
            variant: 'ghost',
            action: 'share_link',
          },
          {
            label: 'Subscribe Updates',
            icon: 'Bell',
            variant: 'ghost',
            action: 'subscribe_updates',
          },
        ];

      default:
        return [];
    }
  };

  const handleAction = (actionType) => {
    console.log(`Executing action: ${actionType} for role: ${userRole}`);

    switch (actionType) {
      case 'create_ai_project':
        if (onCreateAIProject) {
          onCreateAIProject();
        }
        break;
      case 'create_organization':
        if (onCreateOrganization) {
          onCreateOrganization();
        }
        break;
      case 'create_project':
        if (onCreateProject) {
          onCreateProject();
        }
        break;
      case 'manage_users':
      case 'manage_team':
        if (onManageUsers) {
          onManageUsers();
        } else {
          navigate('/team-members');
        }
        break;
      case 'invite_members':
        if (onInviteMembers) {
          onInviteMembers();
        }
        break;
      case 'org_settings':
        navigate('/organization-settings');
        break;
      case 'view_analytics':
      case 'view_reports':
        navigate('/project-overview-analytics');
        break;
      case 'my_tasks':
        navigate('/kanban-board');
        break;
      case 'view_projects':
        navigate('/project-management');
        break;
      case 'project_settings':
        navigate('/project-management');
        break;
      case 'export_data':
        handleExportData();
        break;
      case 'download_reports':
        handleDownloadReports();
        break;
      case 'print_dashboard':
        handlePrintDashboard();
        break;
      case 'share_link':
        handleShareLink();
        break;
      case 'create_task':
        handleCreateTask();
        break;
      case 'time_tracking':
        handleTimeTracking();
        break;
      case 'upload_files':
        handleUploadFiles();
        break;
      default:
        console.log(`Action ${actionType} not implemented yet`);
    }
  };

  // Handler functions for additional actions
  const handleExportData = () => {
    // TODO: Implement actual export functionality
    console.log('Exporting data...');
    alert('Data export functionality will be implemented soon!');
  };

  const handleDownloadReports = () => {
    // TODO: Implement report download
    console.log('Downloading reports...');
    alert('Report download functionality will be implemented soon!');
  };

  const handlePrintDashboard = () => {
    window.print();
  };

  const handleShareLink = () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'Agno WorkSphere Dashboard',
        url: currentUrl
      });
    } else {
      navigator.clipboard.writeText(currentUrl).then(() => {
        alert('Dashboard link copied to clipboard!');
      });
    }
  };

  const handleCreateTask = () => {
    navigate('/kanban-board');
  };

  const handleTimeTracking = () => {
    // TODO: Implement time tracking functionality
    console.log('Opening time tracking...');
    alert('Time tracking functionality will be implemented soon!');
  };

  const handleUploadFiles = () => {
    // TODO: Implement file upload functionality
    console.log('Opening file upload...');
    alert('File upload functionality will be implemented soon!');
  };

  const actions = getActionsForRole();

  return (
    <div className='bg-white rounded-lg border border-border p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-lg font-semibold text-text-primary'>
          Quick Actions
        </h3>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 bg-primary rounded-full'></div>
          <span className='text-xs text-text-secondary font-medium'>
            {userRole}
          </span>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr'>
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant}
            onClick={() => handleAction(action.action)}
            iconName={action.icon}
            iconPosition='left'
            className={`justify-start h-auto py-4 px-4 text-left overflow-hidden min-h-[4rem] w-full ${
              action.featured
                ? 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white border-0 shadow-lg'
                : ''
            }`}
          >
            <div className='flex flex-col items-start w-full space-y-1'>
              <span className='font-medium text-sm leading-tight break-words'>
                {action.label}
              </span>
              {action.featured && (
                <span className='text-xs opacity-90'>✨ AI-Powered</span>
              )}
            </div>
          </Button>
        ))}
      </div>

      {/* Role-specific tips */}
      <div className='mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg'>
        <div className='flex items-start gap-3'>
          <Icon name='Lightbulb' size={16} className='text-blue-600 mt-0.5 flex-shrink-0' />
          <div className='flex-1'>
            <h4 className='text-sm font-medium text-slate-800 mb-2'>
              {userRole} Tips
            </h4>
            <p className='text-xs text-slate-600 leading-relaxed'>
              {userRole?.toLowerCase() === 'owner' &&
                'You have full access to all features including creating projects and organizations. Consider setting up automated reports and user permissions.'}
              {userRole?.toLowerCase() === 'admin' &&
                'You can manage team members and view reports. Only owners can create new projects and organizations.'}
              {userRole?.toLowerCase() === 'member' &&
                'Focus on your assigned tasks and collaborate with team members. Contact your admin or owner to create new projects.'}
              {userRole?.toLowerCase() === 'viewer' &&
                'You have read-only access. Export data and reports to share insights with stakeholders.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
