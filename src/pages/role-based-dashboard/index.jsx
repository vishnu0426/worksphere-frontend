import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import KPICard from './components/KPICard';
import ProjectCard from './components/ProjectCard';
import ActivityFeed from './components/ActivityFeed';
import QuickActions from './components/QuickActions';
import TaskSummary from './components/TaskSummary';
import TeamOverview from './components/TeamOverview';
import NotificationPanel from './components/NotificationPanel';
import NotificationTester from '../../components/ui/NotificationTester';
import authService from '../../utils/authService';
import apiService from '../../utils/apiService';
import realApiService from '../../utils/realApiService';
import teamService from '../../utils/teamService';
import notificationService from '../../utils/notificationService';
import CreateProjectModal from '../../components/modals/CreateProjectModal';
import CreateOrganizationModal from '../../components/modals/CreateOrganizationModal';
import OwnerInviteMemberModal from '../../components/modals/InviteMemberModal';
import EnhancedProjectCreationWizard from '../../components/project/EnhancedProjectCreationWizard';
import AdminInviteMemberModal from '../team-members/components/InviteMemberModal';
import { listenForProjectUpdates } from '../../utils/projectEventService';
import { useUserProfile } from '../../hooks/useUserProfile';

const RoleBasedDashboard = () => {
  const location = useLocation();

  // Use centralized user profile hook
  const {
    userProfile,
    currentOrganization: hookCurrentOrganization,
    availableOrganizations,
    loading: profileLoading,
  } = useUserProfile();

  // Initialize userRole as null to ensure proper loading state
  const [userRole, setUserRole] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [dashboardData, setDashboardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showCreateAIProject, setShowCreateAIProject] = useState(false);
  const [showNotificationTester, setShowNotificationTester] = useState(false);

  // Real team members data
  const [teamMembers, setTeamMembers] = useState([]);

  // Real notifications data
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Helper to get current organization ID
  const getCurrentOrganizationId = () => {
    return organizations?.[0]?.id || hookCurrentOrganization?.id;
  };

  // Load dashboard data from backend
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors

        console.log('Starting dashboard data load...');

        // Check for welcome message from navigation state
        if (location.state?.message && location.state?.type === 'success') {
          setWelcomeMessage(location.state.message);
          setShowWelcome(true);
          // Clear the state to prevent showing on refresh
          window.history.replaceState({}, document.title);
        }

        // Get current user and role with enhanced error handling
        console.log('Fetching current user...');
        const userResult = await authService.getCurrentUser();
        console.log('User result:', userResult);

        if (!userResult || !userResult.data || !userResult.data.user) {
          console.error('Invalid user result structure:', userResult);
          throw new Error('Failed to retrieve user information. Please log in again.');
        }

        const userData = userResult.data.user;
        const organizationsData = userResult.data.organizations || [];

        console.log('User data:', userData);
        console.log('Organizations data:', organizationsData);

        // Validate required user fields
        if (!userData.role) {
          console.error('User role is missing:', userData);
          throw new Error('User role information is missing. Please contact support.');
        }

        if (!userData.email) {
          console.error('User email is missing:', userData);
          throw new Error('User email information is missing. Please contact support.');
        }

        // Set user data
        setCurrentUser(userData);
        
        // Normalize role to lowercase for consistency
        const normalizedRole = userData.role.toLowerCase();
        console.log('Setting user role to:', normalizedRole);
        setUserRole(normalizedRole);
        
        setOrganizations(organizationsData);

        // Validate organization data for members
        if (organizationsData.length === 0 && normalizedRole !== 'owner') {
          console.warn('No organizations found for non-owner user');
          // For members, this might be expected if they haven't been added to an org yet
          if (normalizedRole === 'member') {
            setWelcomeMessage('Welcome! You haven\'t been added to any organizations yet. Please contact your administrator.');
            setShowWelcome(true);
          }
        }

        // Get dashboard stats with error handling
        try {
          console.log('Fetching dashboard stats...');
          const statsResult = await authService.getDashboardStats();
          console.log('Dashboard stats result:', statsResult);
          
          if (statsResult && statsResult.data) {
            setDashboardData(statsResult.data);
          } else {
            console.warn('No dashboard stats available');
            // Set default dashboard data
            setDashboardData({
              total_organizations: organizationsData.length,
              total_projects: 0,
              total_members: 1,
              recent_activity: []
            });
          }
        } catch (statsError) {
          console.error('Failed to load dashboard stats:', statsError);
          // Set default dashboard data
          setDashboardData({
            total_organizations: organizationsData.length,
            total_projects: 0,
            total_members: 1,
            recent_activity: []
          });
        }

        // Get projects, team members, and notifications if organization exists
        const organizationId = organizationsData?.[0]?.id;
        console.log('Organization ID for data loading:', organizationId);

        if (organizationId) {
          // Load projects with error handling
          try {
            console.log('Fetching projects for organization:', organizationId);
            const projectsResult = await apiService.projects.getAll(organizationId);
            console.log('Projects result:', projectsResult);
            setProjects(Array.isArray(projectsResult) ? projectsResult : []);
          } catch (projectsError) {
            console.error('Failed to load projects:', projectsError);
            setProjects([]);
          }

          // Load team members with error handling
          try {
            console.log('Fetching team members for organization:', organizationId);
            const teamMembersResult = await teamService.getTeamMembers(organizationId);
            console.log('Team members result:', teamMembersResult);
            setTeamMembers(Array.isArray(teamMembersResult) ? teamMembersResult : []);
          } catch (teamError) {
            console.error('Failed to load team members:', teamError);
            setTeamMembers([]);
          }

          // Load notifications with enhanced error handling
          try {
            setNotificationsLoading(true);
            console.log('Fetching notifications...');
            
            const notificationsResult = await notificationService.getNotifications({ limit: 10 });
            console.log('Notifications result:', notificationsResult);

            // Handle different response structures
            let notificationsArray = [];
            if (notificationsResult && notificationsResult.data && Array.isArray(notificationsResult.data)) {
              notificationsArray = notificationsResult.data;
            } else if (Array.isArray(notificationsResult)) {
              notificationsArray = notificationsResult;
            }

            setNotifications(notificationsArray);

            // Check for first-time user and create welcome notification
            try {
              const isFirstTime = await notificationService.checkFirstTimeUser();
              console.log('Is first time user:', isFirstTime);
              
              if (isFirstTime && organizationsData?.[0]?.name) {
                console.log('Creating welcome notification for first-time user');
                await notificationService.createWelcomeNotification(
                  userData.id,
                  organizationsData[0].name
                );

                // Reload notifications
                const updatedNotifications = await notificationService.getNotifications({ limit: 10 });
                let updatedNotificationsArray = [];
                if (updatedNotifications && updatedNotifications.data && Array.isArray(updatedNotifications.data)) {
                  updatedNotificationsArray = updatedNotifications.data;
                } else if (Array.isArray(updatedNotifications)) {
                  updatedNotificationsArray = updatedNotifications;
                }
                setNotifications(updatedNotificationsArray);
              }
            } catch (firstTimeError) {
              console.error('Failed to handle first-time user:', firstTimeError);
            }
          } catch (notificationError) {
            console.error('Failed to load notifications:', notificationError);
            setNotifications([]);
          } finally {
            setNotificationsLoading(false);
          }
        } else {
          console.log('No organization ID available, skipping organization-specific data loading');
          setNotificationsLoading(false);
        }

        console.log('Dashboard data loading completed successfully');
        
      } catch (err) {
        console.error('Critical error in loadDashboardData:', err);
        
        // Set specific error messages based on error type
        let errorMessage = 'Failed to load dashboard data. ';
        
        if (err.message) {
          errorMessage += err.message;
        } else if (err.response && err.response.data && err.response.data.message) {
          errorMessage += err.response.data.message;
        } else if (err.response && err.response.status === 401) {
          errorMessage += 'Your session has expired. Please log in again.';
        } else if (err.response && err.response.status === 403) {
          errorMessage += 'You don\'t have permission to access this resource.';
        } else {
          errorMessage += 'Please refresh the page or contact support.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [location.state]);

  // Listen for global project updates
  useEffect(() => {
    if (!userRole) return; // Don't set up listeners until role is loaded

    const cleanup = listenForProjectUpdates(async (updateData) => {
      const { action, project, organizationId } = updateData;

      // Refresh projects list when projects are created, updated, or deleted
      if (
        action === 'created' ||
        action === 'updated' ||
        action === 'deleted' ||
        action === 'refresh'
      ) {
        try {
          const currentOrgId = getCurrentOrganizationId();
          if (
            currentOrgId &&
            (organizationId === currentOrgId || !organizationId)
          ) {
            console.log('Refreshing projects due to update:', action, project);
            const projectsResult = await apiService.projects.getAll(currentOrgId);
            setProjects(Array.isArray(projectsResult) ? projectsResult : []);
          }
        } catch (error) {
          console.error('Failed to refresh projects:', error);
        }
      }
    });

    return cleanup;
  }, [userRole]); // Depend on userRole instead of empty array

  // Project creation handler
  const handleCreateProject = async (projectData) => {
    try {
      const organizationId = getCurrentOrganizationId();
      if (!organizationId) {
        throw new Error('No organization found');
      }

      console.log('Creating project with data:', projectData);
      console.log('Organization ID:', organizationId);

      // Create via API
      const newProject = await apiService.projects.create(organizationId, projectData);
      console.log('Project creation response:', newProject);

      // Refresh projects list
      console.log('Refreshing projects list...');
      const projectsResult = await apiService.projects.getAll(organizationId);
      console.log('Updated projects list:', projectsResult);
      setProjects(Array.isArray(projectsResult) ? projectsResult : []);

      // Notify header to refresh projects
      window.dispatchEvent(
        new CustomEvent('projectsUpdated', {
          detail: { organizationId, projects: projectsResult },
        })
      );

      // Send notification for project creation
      try {
        const notificationService = (await import('../../utils/notificationService')).default;
        const currentUser = await authService.getCurrentUser();
        if (currentUser.data?.user) {
          await notificationService.notifyProjectCreated(
            newProject.data || newProject,
            currentUser.data.user.id
          );
        }
      } catch (notificationError) {
        console.error('Failed to send project creation notification:', notificationError);
      }

      // Refresh dashboard stats
      const statsResult = await authService.getDashboardStats();
      if (statsResult.data) {
        setDashboardData(statsResult.data);
      }

      console.log('Project created successfully:', newProject);
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  // Quick action handlers
  const handleOpenCreateProject = () => {
    setShowCreateProject(true);
  };

  const handleCloseCreateProject = () => {
    setShowCreateProject(false);
  };

  // AI Project creation handlers
  const handleOpenCreateAIProject = () => {
    setShowCreateAIProject(true);
  };

  const handleCloseCreateAIProject = () => {
    setShowCreateAIProject(false);
  };

  const handleCreateAIProject = async (projectData) => {
    try {
      console.log('Creating AI project with data:', projectData);

      // Extract the configuration data and flatten it for the API
      const configuration = projectData.configuration || {};
      const organizationId = getCurrentOrganizationId();
      
      const apiProjectData = {
        name: configuration.name || projectData.name,
        project_type: configuration.project_type || 'general',
        team_size: configuration.team_size || 5,
        team_experience: configuration.team_experience || 'intermediate',
        organization_id: organizationId,
      };

      console.log('Sending API project data:', apiProjectData);

      // Validate required fields
      if (!apiProjectData.name) {
        throw new Error('Project name is required');
      }
      if (!apiProjectData.organization_id) {
        throw new Error('Organization ID is required');
      }

      // Create via real AI API endpoint
      const result = await apiService.ai.createAIProject(
        apiProjectData.organization_id,
        {
          name: apiProjectData.name,
          configuration: {
            project_type: apiProjectData.project_type,
            team_size: apiProjectData.team_size,
            team_experience: apiProjectData.team_experience,
          },
        }
      );

      console.log('AI Project creation response:', result);

      // Refresh projects list
      if (organizationId) {
        const projectsResult = await apiService.projects.getAll(organizationId);
        setProjects(Array.isArray(projectsResult) ? projectsResult : []);

        // Notify header to refresh projects
        window.dispatchEvent(
          new CustomEvent('projectsUpdated', {
            detail: { organizationId, projects: projectsResult },
          })
        );
      }

      // Refresh dashboard stats
      const statsResult = await authService.getDashboardStats();
      if (statsResult.data) {
        setDashboardData(statsResult.data);
      }

      console.log('AI Project created successfully:', result.data);

      // Show success message
      setWelcomeMessage(
        `🎉 AI Project "${projectData.name}" created successfully with ${result.data?.tasks_created || 0} tasks!`
      );
      setShowWelcome(true);
    } catch (error) {
      console.error('Failed to create AI project:', error);
      throw error;
    }
  };

  // Organization creation handlers
  const handleCreateOrganization = async (organizationData, logoFile) => {
    try {
      const result = await apiService.organizations.create(organizationData, logoFile);

      if (result.error) {
        throw new Error(result.error);
      }

      // Show success message
      setWelcomeMessage(
        result.message || `Organization "${organizationData.name}" created successfully!`
      );
      setShowWelcome(true);

      console.log('Organization created successfully:', result.data);
      return result.data;
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  };

  const handleOpenCreateOrganization = () => {
    setShowCreateOrganization(true);
  };

  const handleCloseCreateOrganization = () => {
    setShowCreateOrganization(false);
  };

  const handleManageUsers = () => {
    window.location.href = '/team-members';
  };

  const handleInviteMembers = () => {
    setShowInviteMember(true);
  };

  const handleCloseInviteMember = () => {
    setShowInviteMember(false);
  };

  const handleSendInvitation = async (inviteData) => {
    try {
      const organizationId = getCurrentOrganizationId();
      if (!organizationId) {
        throw new Error('No organization found');
      }

      // Call the backend API to send invitation using realApiService
      const result = await realApiService.organizations.inviteMember(organizationId, {
        email: inviteData.email,
        role: inviteData.role,
        invitation_message: inviteData.message || ''
      });

      console.log('Invitation sent successfully:', result);

      // Refresh dashboard stats to show updated member count
      const statsResult = await authService.getDashboardStats();
      if (statsResult.data) {
        setDashboardData(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      throw error;
    }
  };

  // Handler for Admin (bulk invite)
  const handleAdminInviteSubmit = async (inviteData) => {
    const organizationId = getCurrentOrganizationId();
    if (!organizationId) {
      console.error('No organization selected');
      return;
    }

    try {
      console.log('Admin inviting members:', inviteData);

      // Send invitations through API
      for (const email of inviteData.emails) {
        await teamService.inviteTeamMember(organizationId, {
          email,
          role: inviteData.role,
          message: inviteData.welcomeMessage,
        });
      }

      console.log('Invitations sent successfully');

      // Refresh dashboard stats to show updated member count
      const statsResult = await authService.getDashboardStats();
      if (statsResult.data) {
        setDashboardData(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to invite members:', error);
    }
  };

  // Show loading state - wait for userRole to be set
  if (loading || userRole === null) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-slate-600'>Loading dashboard...</p>
          {currentUser && (
            <p className='text-slate-500 text-sm mt-2'>
              Welcome, {currentUser.firstName || currentUser.email?.split('@')[0] || 'User'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center'>
        <div className='text-center max-w-md mx-auto px-4'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg className='w-8 h-8 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
          </div>
          <p className='text-red-600 text-lg mb-2 font-semibold'>Failed to load dashboard</p>
          <p className='text-slate-600 text-sm mb-4'>{error}</p>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              Try Again
            </button>
            <button
              onClick={() => {
                // Clear auth and redirect to login
                authService.logout();
                window.location.href = '/login';
              }}
              className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter projects based on search, filter values, and role-based access
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchValue.toLowerCase());
    const matchesFilter =
      filterValue === 'all' ||
      (project.status || 'active').toLowerCase() === filterValue.toLowerCase();

    // Role-based project access control
    const hasProjectAccess = () => {
      if (!currentUser?.role) return true;

      const userRoleNormalized = userRole.toLowerCase();

      // Viewers should only see projects they are specifically invited to
      if (userRoleNormalized === 'viewer') {
        return project.organization_id === currentUser.organization_id;
      }

      return true;
    };

    return matchesSearch && matchesFilter && hasProjectAccess();
  });

  // Role-based KPI data with real data integration
  const getKPIData = () => {
    const realData = dashboardData || {};

    switch (userRole?.toLowerCase()) {
      case 'owner':
        return [
          {
            title: 'Organizations',
            value: realData.total_organizations?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Building',
            color: 'success',
          },
          {
            title: 'Active Projects',
            value: realData.total_projects?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'FolderOpen',
            color: 'primary',
          },
          {
            title: 'Team Members',
            value: realData.total_members?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Users',
            color: 'accent',
          },
          {
            title: 'Recent Activity',
            value: realData.recent_activity?.length?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Activity',
            color: 'warning',
          },
        ];
      case 'admin':
        return [
          {
            title: 'Active Projects',
            value: realData.total_projects?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'FolderOpen',
            color: 'primary',
          },
          {
            title: 'Team Members',
            value: realData.total_members?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Users',
            color: 'success',
          },
          {
            title: 'Organizations',
            value: realData.total_organizations?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Building',
            color: 'accent',
          },
          {
            title: 'Recent Activity',
            value: realData.recent_activity?.length?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Activity',
            color: 'warning',
          },
        ];
      case 'member':
        return [
          {
            title: 'My Projects',
            value: realData.total_projects?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'FolderOpen',
            color: 'primary',
          },
          {
            title: 'Organizations',
            value: realData.total_organizations?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Building',
            color: 'success',
          },
          {
            title: 'Team Members',
            value: realData.total_members?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Users',
            color: 'accent',
          },
          {
            title: 'Recent Activity',
            value: realData.recent_activity?.length?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Activity',
            color: 'warning',
          },
        ];
      case 'viewer':
        return [
          {
            title: 'Projects Viewed',
            value: realData.total_projects?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Eye',
            color: 'primary',
          },
          {
            title: 'Organizations',
            value: realData.total_organizations?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Building',
            color: 'accent',
          },
          {
            title: 'Team Members',
            value: realData.total_members?.toString() || '1',
            change: '+0',
            changeType: 'neutral',
            icon: 'Users',
            color: 'success',
          },
          {
            title: 'Activity Items',
            value: realData.recent_activity?.length?.toString() || '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'BarChart3',
            color: 'warning',
          },
        ];
      default:
        return [
          {
            title: 'Projects',
            value: '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'FolderOpen',
            color: 'primary',
          },
          {
            title: 'Organizations',
            value: '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Building',
            color: 'success',
          },
          {
            title: 'Members',
            value: '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Users',
            color: 'accent',
          },
          {
            title: 'Activity',
            value: '0',
            change: '+0',
            changeType: 'neutral',
            icon: 'Activity',
            color: 'warning',
          },
        ];
    }
  };

  // Get current organization data - use hook data if available, otherwise fallback to local state
  const currentOrganization =
    hookCurrentOrganization ||
    (organizations.length > 0
      ? {
          name:
            organizations[0].organization?.name ||
            organizations[0].name ||
            'Loading...',
          domain:
            organizations[0].organization?.domain ||
            organizations[0].domain ||
            currentUser?.email?.split('@')[1] ||
            'company.com',
          logo:
            organizations[0].organization?.logo_url ||
            organizations[0].logo ||
            '/assets/images/org-logo.png',
        }
      : {
          name: 'No Organization',
          domain: currentUser?.email?.split('@')[1] || 'company.com',
          logo: '/assets/images/org-logo.png',
        });

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20'>
      {/* Role-Based Header */}
      <RoleBasedHeader
        userRole={userRole?.toLowerCase()}
        currentUser={
          currentUser
            ? {
                name:
                  `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
                  currentUser.email?.split('@')[0] ||
                  'User',
                email: currentUser.email,
                avatar: currentUser.avatar || '/assets/images/avatar.jpg',
                role: userRole,
              }
            : {
                name: 'Loading...',
                email: '',
                avatar: '/assets/images/avatar.jpg',
                role: userRole,
              }
        }
        currentOrganization={currentOrganization}
      />

      {/* Welcome Message for New Users */}
      {showWelcome && welcomeMessage && (
        <div className='bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-6 mt-16 mx-4 rounded-lg shadow-sm'>
          <div className='max-w-7xl mx-auto flex items-start'>
            <div className='flex-shrink-0'>
              <svg
                className='h-6 w-6 text-green-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <div className='ml-3 flex-1'>
              <h3 className='text-lg font-medium text-green-800'>
                Welcome to Agno WorkSphere!
              </h3>
              <div className='mt-2 text-sm text-green-700'>
                <p>{welcomeMessage}</p>
              </div>
              <div className='mt-4'>
                <button
                  onClick={() => setShowWelcome(false)}
                  className='bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-md text-sm font-medium transition-colors'
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Info Bar */}
      <div
        className={`glass-effect border-b border-white/20 p-4 ${
          showWelcome ? 'mt-4' : 'mt-16'
        }`}
      >
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-3'>
              <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
              <span className='text-sm font-medium text-slate-700'>
                {currentUser
                  ? `Welcome, ${currentUser.firstName || currentUser.email?.split('@')[0] || 'User'}!`
                  : 'Loading...'}
              </span>
            </div>
            <div className='flex items-center gap-2 text-sm text-slate-600'>
              <span className='px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium capitalize'>
                {userRole}
              </span>
              {currentOrganization && (
                <span className='text-slate-500'>
                  • {currentOrganization.name}
                </span>
              )}
            </div>
          </div>
          <div className='flex items-center gap-3 text-sm text-slate-600'>
            <span>
              Organizations: {dashboardData?.total_organizations || 0}
            </span>
            <span>•</span>
            <span>Projects: {dashboardData?.total_projects || 0}</span>
            <span>•</span>
            <span>Members: {dashboardData?.total_members || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className='max-w-7xl mx-auto px-6 py-8'>
        {/* Enhanced KPI Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12'>
          {getKPIData().map((kpi, index) => (
            <div
              key={index}
              className='animate-fade-in'
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <KPICard
                title={kpi.title}
                value={kpi.value}
                change={kpi.change}
                changeType={kpi.changeType}
                icon={kpi.icon}
                color={kpi.color}
              />
            </div>
          ))}
        </div>

        {/* Main Content Grid with improved spacing */}
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10'>
          {/* Left Column - Projects and Quick Actions */}
          <div className='xl:col-span-2 space-y-8'>
            {/* Projects Section with enhanced header */}
            <div className='space-y-6'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                <div>
                  <h2 className='text-2xl font-semibold text-slate-900 tracking-tight'>
                    {userRole === 'viewer'
                      ? 'Available Projects'
                      : 'My Projects'}
                  </h2>
                  <p className='text-slate-600 mt-1 text-sm'>
                    Manage and track your active projects
                  </p>
                </div>
                <Link
                  to='/project-overview-analytics'
                  className='flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200'
                >
                  View Analytics
                  <svg
                    className='w-4 h-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5l7 7-7 7'
                    />
                  </svg>
                </Link>
              </div>

              <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
                {filteredProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className='animate-fade-in'
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <ProjectCard project={project} userRole={userRole} />
                  </div>
                ))}
              </div>

              {filteredProjects.length === 0 && (
                <div className='text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20'>
                  <div className='w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <svg
                      className='w-8 h-8 text-slate-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                      />
                    </svg>
                  </div>
                  <p className='text-slate-600 text-lg'>
                    {userRole === 'member' 
                      ? 'You haven\'t been assigned to any projects yet'
                      : 'No projects match your current filters'
                    }
                  </p>
                  <p className='text-slate-500 text-sm mt-1'>
                    {userRole === 'member'
                      ? 'Contact your team lead or admin to get added to projects'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <QuickActions
              userRole={userRole}
              onCreateProject={handleOpenCreateProject}
              onCreateOrganization={handleOpenCreateOrganization}
              onManageUsers={handleManageUsers}
              onInviteMembers={handleInviteMembers}
              onCreateAIProject={handleOpenCreateAIProject}
            />
          </div>

          {/* Right Column - Activity Feed and Notifications */}
          <div className='space-y-8'>
            <ActivityFeed activities={[]} userRole={userRole} />
            <NotificationPanel
              notifications={notifications}
              userRole={userRole}
              loading={notificationsLoading}
            />
          </div>
        </div>

        {/* Bottom Section - Tasks and Team with improved layout */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <TaskSummary tasks={[]} userRole={userRole} />
          <TeamOverview
            teamMembers={teamMembers}
            userRole={userRole}
            onInviteMembers={handleInviteMembers}
          />
        </div>

        {/* Development Tools Section - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className='mt-8'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-slate-900'>Development Tools</h3>
              <button
                onClick={() => setShowNotificationTester(!showNotificationTester)}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                {showNotificationTester ? 'Hide' : 'Show'} Notification Tester
              </button>
            </div>
            {showNotificationTester && <NotificationTester />}
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={handleCloseCreateProject}
        onCreateProject={handleCreateProject}
        organizationId={getCurrentOrganizationId()}
        organizationName={currentOrganization?.name || 'Organization'}
      />

      {/* Create AI Project Modal - Owner Only */}
      {userRole?.toLowerCase() === 'owner' && (
        <EnhancedProjectCreationWizard
          isOpen={showCreateAIProject}
          onClose={handleCloseCreateAIProject}
          onCreateProject={handleCreateAIProject}
          organizationId={getCurrentOrganizationId()}
          organizationName={currentOrganization?.name || 'Organization'}
        />
      )}

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={showCreateOrganization}
        onClose={handleCloseCreateOrganization}
        onCreateOrganization={handleCreateOrganization}
      />

      {/* Role-based Invite Member Modal */}
      {userRole?.toLowerCase() === 'owner' ? (
        <OwnerInviteMemberModal
          isOpen={showInviteMember}
          onClose={handleCloseInviteMember}
          onInviteMember={handleSendInvitation}
          organizationId={getCurrentOrganizationId()}
          organizationName={currentOrganization?.name || 'Organization'}
        />
      ) : userRole?.toLowerCase() === 'admin' ? (
        <AdminInviteMemberModal
          isOpen={showInviteMember}
          onClose={handleCloseInviteMember}
          onInvite={handleAdminInviteSubmit}
        />
      ) : null}
    </div>
  );
};

export default RoleBasedDashboard;