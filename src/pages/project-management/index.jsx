import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import OwnerInviteMemberModal from '../../components/modals/InviteMemberModal';
import AdminInviteMemberModal from '../team-members/components/InviteMemberModal';

// Lazy load the meeting scheduler modal
const MeetingScheduler = lazy(() => import('../../components/modals/components/MeetingScheduler'));

const tabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    description: 'Project summary and key metrics',
    component: lazy(() => import('./components/ProjectOverview')),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: 'CheckSquare',
    description: 'Task management and tracking',
    component: lazy(() => import('./components/TasksTab')),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    description: 'Project configuration and permissions',
    component: lazy(() => import('./components/SettingsTab')),
  },
];

const ProjectManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [project, setProject] = useState(null);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [canCreateProjects, setCanCreateProjects] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  // Get projectId and tab from URL (React Router v6+)
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const tabFromUrl = urlParams.get('tab');
  console.log('ProjectManagement: projectId from URL:', projectId);

  useEffect(() => {
    let didCancel = false;
    setIsLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      if (!didCancel) {
        setError('Loading timed out. Please try again.');
        setIsLoading(false);
      }
    }, 10000);
    (async () => {
      try {
        // Load user data from multiple sources for accuracy
        console.log('🔍 Loading user data for project management...');

        // Try to get user from API first (most accurate)
        let userData = null;
        try {
          const apiService = (await import('../../utils/apiService')).default;
          const apiUserData = await apiService.users.getCurrentUser();
          console.log('✅ User data from API:', apiUserData);
          userData = apiUserData;
        } catch (apiError) {
          console.warn('⚠️ Failed to load user from API, falling back to auth service:', apiError);

          // Fallback to auth service
          const authService = (await import('../../utils/authService')).default;
          userData = await authService.getCurrentUser();
          console.log('✅ User data from auth service:', userData);
        }

        if (userData) {
          // Ensure we have proper user data structure
          const normalizedUser = {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName || userData.first_name || 'User',
            lastName: userData.lastName || userData.last_name || '',
            role: userData.role || 'member',
            displayName: userData.displayName || `${userData.firstName || userData.first_name || 'User'} ${userData.lastName || userData.last_name || ''}`.trim(),
            jobTitle: userData.jobTitle || userData.job_title || '',
            avatar: userData.avatar || userData.avatar_url || null
          };

          console.log('✅ Normalized user data:', normalizedUser);
          setUser(normalizedUser);
          setUserRole(normalizedUser.role);

          // Load organization data
          const sessionService = (await import('../../utils/sessionService')).default;
          try {
            const orgData = sessionService.getCurrentOrganization();
            if (orgData) {
              setCurrentOrganization(orgData);
              console.log('Organization loaded:', orgData);

              // Check organization settings for admin project creation permissions
              if (userData.role === 'admin' && orgData.id) {
                try {
                  const apiService = (await import('../../utils/apiService')).default;
                  const orgSettings = await apiService.organizations.getSettings(orgData.id);
                  const isOwner = userData.role === 'owner';
                  const adminCanCreate = orgSettings?.allow_admin_create_projects === true;
                  setCanCreateProjects(isOwner || adminCanCreate);
                } catch (error) {
                  console.error('Error loading organization settings:', error);
                  // Default to false for admins if settings can't be loaded
                  setCanCreateProjects(false);
                }
              } else {
                // Owners and other roles can create projects by default
                setCanCreateProjects(userData.role === 'owner');
              }
            } else {
              console.warn('No organization data available');
              // Default to false if no organization data
              setCanCreateProjects(userData.role === 'owner');
            }
          } catch (orgError) {
            console.error('Error loading organization:', orgError);
            // Continue without organization data - it's not critical for project loading
            setCanCreateProjects(userData.role === 'owner');
          }
        }

        // Handle missing or invalid project ID by finding an available project
        let actualProjectId = projectId;
        let projectData = null;

        console.log('🔍 Project Management - User Role:', userData.role);
        console.log('🔍 Project Management - Organization:', currentOrganization);
        console.log('🔍 Project Management - Project ID:', projectId);

        const apiService = (await import('../../utils/apiService')).default;

        if (!projectId) {
          console.log('⚠️ No project ID provided, finding available projects...');
        } else {
          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(projectId)) {
            console.log('⚠️ Invalid project ID format, finding available projects...');
            actualProjectId = null;
          } else {
            // Try to fetch the specific project
            console.log('Fetching project with ID:', projectId);
            try {
              const result = await apiService.projects.getById(projectId);
              console.log('Project API result:', result);

              if (result && (result.data || result.name)) {
                projectData = result.data || result;
                console.log('✅ Project loaded successfully:', projectData);
              } else {
                console.log('⚠️ Project not found, finding available projects...');
                actualProjectId = null;
              }
            } catch (projectError) {
              console.log('⚠️ Failed to fetch project, finding available projects...', projectError);
              actualProjectId = null;
            }
          }
        }

        // If we don't have a valid project, find the first available one
        if (!projectData && currentOrganization?.id) {
          console.log('🔍 Finding available projects for organization:', currentOrganization.id);
          console.log('🔍 User role for project access:', userData.role);
          try {
            const projects = await apiService.projects.getAll(currentOrganization.id);
            console.log('✅ Available projects for member:', projects);
            console.log('✅ Projects count:', projects?.length || 0);

            if (projects && projects.length > 0) {
              projectData = projects[0];
              actualProjectId = projectData.id;
              console.log('✅ Using first available project:', projectData);

              // Update URL to reflect the correct project ID
              const newUrl = new URL(window.location);
              newUrl.searchParams.set('id', actualProjectId);
              window.history.replaceState({}, '', newUrl);
              console.log('✅ Updated URL to correct project ID:', actualProjectId);
            } else {
              console.log('❌ No projects found for organization');
              setError(
                'No projects found. Please create a project first or contact your administrator.'
              );
              setIsLoading(false);
              return;
            }
          } catch (orgProjectsError) {
            console.error('❌ Failed to fetch organization projects:', orgProjectsError);
            setError(
              'Failed to load projects. Please check your connection and try again.'
            );
            setIsLoading(false);
            return;
          }
        }

        if (projectData) {
          setProject(projectData);

          // Set active tab from URL if provided
          if (tabFromUrl && ['overview', 'tasks', 'settings', 'analytics', 'team'].includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
          }
        } else {
          setError('Project not found or missing data.');
        }
      } catch (e) {
        console.error('Error loading project:', e);
        if (!didCancel) {
          if (e.message && e.message.includes('403')) {
            setError('Access denied. You do not have permission to view this project.');
          } else if (e.message && e.message.includes('404')) {
            setError('Project not found. It may have been deleted or moved.');
          } else if (e.message && e.message.includes('401')) {
            setError('Authentication required. Please log in again.');
          } else {
            setError(`Failed to load project: ${e.message || 'Unknown error'}`);
          }
        }
      } finally {
        if (!didCancel) setIsLoading(false);
        clearTimeout(timeout);
      }
    })();
    return () => {
      didCancel = true;
      clearTimeout(timeout);
    };
  }, [projectId, currentOrganization?.id, tabFromUrl]);

  // Handle tab changes from URL
  useEffect(() => {
    if (tabFromUrl && ['overview', 'tasks', 'settings', 'analytics', 'team'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleScheduleMeeting = () => {
    setShowMeetingScheduler(true);
  };

  const handleInviteTeam = () => {
    setShowInviteModal(true);
  };

  // Invite handlers
  const handleOwnerInvite = async (inviteData) => {
    if (!currentOrganization) {
      console.error('No organization found');
      return;
    }

    try {
      console.log('Owner inviting member:', inviteData);
      const teamService = (await import('../../utils/teamService')).default;

      await teamService.inviteTeamMember(currentOrganization.id, {
        email: inviteData.email,
        role: inviteData.role,
        organization_id: currentOrganization.id,
        project_id: project?.id,
      });

      setShowInviteModal(false);
      // Show success message or refresh team data
      console.log('Invitation sent successfully');
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const handleAdminInvite = async (inviteData) => {
    if (!currentOrganization) {
      console.error('No organization found');
      return;
    }

    try {
      console.log('Admin inviting members:', inviteData);
      const teamService = (await import('../../utils/teamService')).default;

      // Send invitations through API
      for (const email of inviteData.emails) {
        await teamService.inviteTeamMember(currentOrganization.id, {
          email,
          role: inviteData.role,
          message: inviteData.welcomeMessage,
          project_id: project?.id,
        });
      }

      setShowInviteModal(false);
      // Show success message or refresh team data
      console.log('Invitations sent successfully');
    } catch (error) {
      console.error('Failed to send invitations:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      console.log('Generating project report...');

      // Create a comprehensive project report
      const reportData = {
        project: {
          id: project?.id,
          name: project?.name,
          description: project?.description,
          status: project?.status,
          created_at: project?.created_at,
          updated_at: project?.updated_at
        },
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: user?.email || 'Unknown User',
          reportType: 'Project Summary Report',
          version: '1.0'
        },
        summary: {
          totalTasks: project?.task_count || 0,
          completedTasks: project?.completed_tasks || 0,
          teamMembers: project?.team?.length || 0,
          progress: project?.progress || 0
        },
        teamMembers: project?.team || [],
        milestones: project?.milestones || [],
        recentActivity: project?.recent_activity || []
      };

      // Generate HTML report
      const htmlReport = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Project Report - ${project?.name || 'Unknown Project'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .metric-label { font-size: 14px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f1f5f9; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Project Report: ${project?.name || 'Unknown Project'}</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Generated by:</strong> ${user?.email || 'Unknown User'}</p>
          </div>

          <div class="section">
            <h2>Project Overview</h2>
            <p><strong>Description:</strong> ${project?.description || 'No description available'}</p>
            <p><strong>Status:</strong> ${project?.status || 'Unknown'}</p>
            <p><strong>Created:</strong> ${project?.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}</p>
          </div>

          <div class="section">
            <h2>Key Metrics</h2>
            <div class="metric">
              <div class="metric-value">${reportData.summary.totalTasks}</div>
              <div class="metric-label">Total Tasks</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reportData.summary.completedTasks}</div>
              <div class="metric-label">Completed Tasks</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reportData.summary.teamMembers}</div>
              <div class="metric-label">Team Members</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reportData.summary.progress}%</div>
              <div class="metric-label">Progress</div>
            </div>
          </div>

          <div class="section">
            <h2>Team Members</h2>
            ${reportData.teamMembers.length > 0 ? `
              <table>
                <thead>
                  <tr><th>Name</th><th>Role</th><th>Status</th></tr>
                </thead>
                <tbody>
                  ${reportData.teamMembers.map(member => `
                    <tr>
                      <td>${member.name || 'Unknown'}</td>
                      <td>${member.role || 'Unknown'}</td>
                      <td>${member.status || 'Unknown'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>No team members data available.</p>'}
          </div>

          <div class="section">
            <h2>Report Data (JSON)</h2>
            <pre style="background: #f8fafc; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${JSON.stringify(reportData, null, 2)}</pre>
          </div>
        </body>
        </html>
      `;

      // Create and download HTML report
      const htmlBlob = new Blob([htmlReport], { type: 'text/html' });
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'project'}_report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Project report generated successfully');
      alert('Project report generated and downloaded successfully!');
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate project report. Please try again.');
    }
  };

  const handleExportData = async () => {
    try {
      console.log('Exporting project data...');
      // TODO: Implement actual export functionality
      const projectData = {
        project: project,
        exportDate: new Date().toISOString(),
        exportType: 'project_data'
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'project'}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Project data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export project data. Please try again.');
    }
  };

  const handleNewProject = () => {
    console.log('Navigating to new project creation...');
    // Navigate to project creation page
    navigate('/ai-project-creation');
  };

  const handleBackupProject = async () => {
    try {
      console.log('Creating project backup...');

      if (!project?.id) {
        alert('No project selected for backup.');
        return;
      }

      // Try to get comprehensive project data from API
      let backupData;
      try {
        const apiService = (await import('../../utils/apiService')).default;

        // Get full project data including tasks, boards, and team members
        const [projectData, projectBoards, projectCards] = await Promise.all([
          apiService.projects.getById(project.id),
          apiService.boards.getByProject(project.id).catch(() => []),
          apiService.cards.getByProject(project.id).catch(() => [])
        ]);

        backupData = {
          project: projectData,
          boards: projectBoards,
          cards: projectCards,
          backupDate: new Date().toISOString(),
          backupType: 'full_backup',
          version: '2.0',
          metadata: {
            exportedBy: 'Agno WorkSphere',
            projectId: project.id,
            projectName: project.name
          }
        };

        console.log('✅ Comprehensive backup data prepared:', backupData);
      } catch (apiError) {
        console.warn('API backup failed, using basic project data:', apiError.message);

        // Fallback to basic project data
        backupData = {
          project: project,
          backupDate: new Date().toISOString(),
          backupType: 'basic_backup',
          version: '1.0',
          metadata: {
            exportedBy: 'Agno WorkSphere',
            projectId: project.id,
            projectName: project.name,
            note: 'Basic backup - API data not available'
          }
        };
      }

      // Create and download backup file
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'project'}_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Project backup created successfully');
      alert('Project backup created and downloaded successfully!');
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('Failed to create project backup. Please try again.');
    }
  };

  const handleArchiveProject = async () => {
    try {
      if (!project?.id) {
        alert('No project selected for archiving.');
        return;
      }

      if (!window.confirm(`Are you sure you want to archive "${project.name}"? You can restore it later from the archived projects section.`)) {
        return;
      }

      console.log('Archiving project:', project.id);

      const apiService = (await import('../../utils/apiService')).default;
      await apiService.projects.update(project.id, {
        status: 'archived',
        archived_at: new Date().toISOString()
      });

      console.log('✅ Project archived successfully');
      alert('Project archived successfully! You can find it in the archived projects section.');

      // Redirect to dashboard
      navigate('/role-based-dashboard');
    } catch (error) {
      console.error('Failed to archive project:', error);
      alert('Failed to archive project. Please try again.');
    }
  };

  const handleDuplicateProject = async () => {
    try {
      if (!project?.id) {
        alert('No project selected for duplication.');
        return;
      }

      const newProjectName = prompt(`Enter a name for the duplicated project:`, `${project.name} (Copy)`);
      if (!newProjectName) {
        return;
      }

      console.log('Duplicating project:', project.id);

      const apiService = (await import('../../utils/apiService')).default;

      // Get full project data
      const [projectData, projectBoards, projectCards] = await Promise.all([
        apiService.projects.getById(project.id),
        apiService.boards.getByProject(project.id).catch(() => []),
        apiService.cards.getByProject(project.id).catch(() => [])
      ]);

      // Create new project with duplicated data
      const duplicatedProject = {
        ...projectData,
        name: newProjectName,
        status: 'active',
        created_at: new Date().toISOString()
      };

      // Remove ID to create new project
      delete duplicatedProject.id;

      const newProject = await apiService.projects.create(duplicatedProject);

      console.log('✅ Project duplicated successfully:', newProject);
      alert(`Project "${newProjectName}" created successfully!`);

      // Navigate to the new project
      if (newProject?.id) {
        navigate(`/project-management/${newProject.id}`);
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      alert('Failed to duplicate project. Please try again.');
    }
  };

  if (isLoading)
    return <div className='p-8 text-center'>Loading project management...</div>;
  if (error) {
    return (
      <div className='p-8 text-center text-red-600'>
        {error}
        <div className='mt-4 text-xs text-gray-500'>
          Project ID: <span className='font-mono'>{projectId || '(none)'}</span>
        </div>
      </div>
    );
  }

  const ActiveTab = tabs.find((t) => t.id === activeTab);
  const ActiveComponent = ActiveTab?.component;

  return (
    <div className='min-h-screen bg-background'>
      <RoleBasedHeader currentUser={user} userRole={userRole} />
      <main className='pt-16'>
        <div className='max-w-7xl mx-auto py-8 px-4'>
        {/* Page Header */}
        <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8'>
          <div className='flex-1'>
            <h1 className='text-3xl font-bold text-slate-900 mb-2'>
              {project?.name || 'Project Management'}
            </h1>
            <p className='text-slate-600 text-base leading-relaxed'>
              {project?.description ||
                'Project management and team coordination'}
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button
              variant='outline'
              iconName='Download'
              iconPosition='left'
              className='whitespace-nowrap'
              onClick={handleExportData}
            >
              Export Data
            </Button>
            <Button
              variant='outline'
              iconName='BarChart3'
              iconPosition='left'
              className='whitespace-nowrap'
              onClick={handleGenerateReport}
            >
              Generate Report
            </Button>
            {canCreateProjects && (
              <Button
                variant='default'
                iconName='Plus'
                iconPosition='left'
                className='whitespace-nowrap'
                onClick={handleNewProject}
              >
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='bg-white rounded-lg border border-slate-200 mb-6 shadow-sm'>
          {/* Desktop Tab Navigation */}
          <div className='hidden md:flex border-b border-slate-200'>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                <div className='text-left'>
                  <div className='font-medium text-sm'>{tab.label}</div>
                  <div className='text-xs text-slate-500'>
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {/* Mobile Tab Navigation */}
          <div className='md:hidden border-b border-border p-4'>
            <div className='relative'>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className='w-full appearance-none bg-background border border-border rounded-lg px-4 py-3 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label} - {tab.description}
                  </option>
                ))}
              </select>
              <Icon
                name='ChevronDown'
                size={20}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary pointer-events-none'
              />
            </div>
          </div>
          {/* Tab Content */}
          <div className='p-6'>
            {/* Active Tab Header (Mobile) */}
            <div className='flex items-center gap-3 mb-6 md:hidden'>
              <Icon name={ActiveTab.icon} size={24} className='text-primary' />
              <div>
                <h2 className='text-xl font-semibold text-foreground'>
                  {ActiveTab.label}
                </h2>
                <p className='text-sm text-text-secondary'>
                  {ActiveTab.description}
                </p>
              </div>
            </div>
            {/* Render Active Tab Content */}
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Icon name='Loader2' size={32} className='animate-spin text-primary' />
                <div className="text-lg text-muted-foreground">
                  Loading tab...
                </div>
              </div>
            }>
              {ActiveComponent && <ActiveComponent project={project} onSwitchTab={setActiveTab} />}
            </Suspense>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className='bg-card rounded-lg border border-border p-6'>
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <Icon name='Zap' size={20} className='text-primary' />
              <div>
                <h3 className='font-medium text-foreground'>Quick Actions</h3>
                <p className='text-sm text-text-secondary'>
                  Frequently used project management tools
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                size='sm'
                iconName='UserPlus'
                iconPosition='left'
                onClick={handleInviteTeam}
              >
                Invite Team
              </Button>
              <Button
                variant='outline'
                size='sm'
                iconName='Calendar'
                iconPosition='left'
                onClick={() => handleScheduleMeeting()}
              >
                Schedule Meeting
              </Button>
              <Button
                variant='outline'
                size='sm'
                iconName='FileText'
                iconPosition='left'
                onClick={handleGenerateReport}
              >
                Create Template
              </Button>
              <Button
                variant='outline'
                size='sm'
                iconName='Archive'
                iconPosition='left'
                onClick={handleBackupProject}
              >
                Backup Project
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Scheduler Modal */}
      {showMeetingScheduler && (
        <Suspense fallback={<div>Loading meeting scheduler...</div>}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Schedule Meeting</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMeetingScheduler(false)}
                  iconName="X"
                />
              </div>
              <div className="p-4">
                <MeetingScheduler
                  projectData={project}
                  organizationMembers={project?.team || []}
                  onClose={() => setShowMeetingScheduler(false)}
                />
              </div>
            </div>
          </div>
        </Suspense>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && userRole === 'owner' && (
        <OwnerInviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleOwnerInvite}
          organizationName={currentOrganization?.name || 'Organization'}
        />
      )}

      {showInviteModal && userRole === 'admin' && (
        <AdminInviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleAdminInvite}
          organizationName={currentOrganization?.name || 'Organization'}
        />
      )}
      </main>
    </div>
  );
};

export default ProjectManagement;
