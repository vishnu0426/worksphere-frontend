import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import RoleBasedHeader from '../../../components/ui/RoleBasedHeader';
import WelcomeBanner from '../../../components/welcome/WelcomeBanner';
import KPICard from '../../role-based-dashboard/components/KPICard';
import ProjectCard from '../../role-based-dashboard/components/ProjectCard';
import ActivityFeed from '../../role-based-dashboard/components/ActivityFeed';
import QuickActions from '../../role-based-dashboard/components/QuickActions';
import TaskSummary from '../../role-based-dashboard/components/TaskSummary';
import TeamOverview from '../../role-based-dashboard/components/TeamOverview';
import NotificationPanel from '../../role-based-dashboard/components/NotificationPanel';
import sessionService from '../../../utils/sessionService';
import apiService from '../../../utils/apiService';
import teamService from '../../../utils/teamService';
import notificationService from '../../../utils/notificationService';
import { getRecentActivities } from '../../../utils/organizationService';
import CreateProjectModal from '../../../components/modals/CreateProjectModal';
import InviteMemberModal from '../../team-members/components/InviteMemberModal';
import { listenForProjectUpdates } from '../../../utils/projectEventService';
import { useUserProfile } from '../../../hooks/useUserProfile';
import useToast from '../../../hooks/useToast';

const AdminDashboard = () => {
  const location = useLocation();

  // Use centralized user profile hook
  const {
    userProfile,
    currentOrganization: hookCurrentOrganization,
    loading: profileLoading,
  } = useUserProfile();

  // Toast notifications
  const { showToast } = useToast();

  const [searchValue, setSearchValue] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [dashboardData, setDashboardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [organizationSettings, setOrganizationSettings] = useState(null);
  const [canCreateProjects, setCanCreateProjects] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Real team members data
  const [teamMembers, setTeamMembers] = useState([]);

  // Real notifications data
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Real activities data
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // FIX: Memoize getCurrentOrganizationId to prevent infinite loops
  const getCurrentOrganizationId = useCallback(() => {
    return organizations?.[0]?.id || hookCurrentOrganization?.id;
  }, [organizations, hookCurrentOrganization?.id]);

  // FIX: Memoize organizationId
  const organizationId = useMemo(() => {
    return sessionService.getOrganizationId() || getCurrentOrganizationId();
  }, [getCurrentOrganizationId]);

  // FIX: Memoize user role calculation
  const getCurrentUserRole = useCallback(() => {
    const currentOrgId = getCurrentOrganizationId();
    if (!currentOrgId || !userProfile?.organizations) return 'admin';

    const currentOrgMembership = userProfile.organizations.find(
      (org) => org.organization_id === currentOrgId
    );
    return currentOrgMembership?.role || 'admin';
  }, [getCurrentOrganizationId, userProfile?.organizations]);

  // FIX: Separate effect for welcome message (runs once)
  useEffect(() => {
    if (location.state?.message && location.state?.type === 'success') {
      setWelcomeMessage(location.state.message);
      setShowWelcome(true);
      // Clear the state to prevent showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.message, location.state?.type]);

  // FIX: Main data loading effect with proper dependencies
  useEffect(() => {
    if (profileLoading) return; // Don't load if profile is still loading

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Get current user from session service
        const sessionUser = sessionService.getCurrentUser();
        if (sessionUser) {
          setCurrentUser(sessionUser);

          // Get user's organizations via API
          try {
            const userResult = await apiService.users.getCurrentUser();
            console.log('ADMIN: User API result:', userResult);

            if (userResult?.organizations) {
              setOrganizations(userResult.organizations);
            } else {
              // Use fallback organization
              setOrganizations([
                {
                  id: sessionService.getOrganizationId() || 'fallback-org',
                  name: 'Organization',
                  domain: 'example.com',
                },
              ]);
            }
          } catch (error) {
            console.error('ADMIN: Failed to load organizations:', error);
            setOrganizations([
              {
                id: sessionService.getOrganizationId() || 'fallback-org',
                name: 'Organization',
                domain: 'example.com',
              },
            ]);
          }
        }

        setError(null);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [profileLoading]); // Only depend on profileLoading

  // FIX: Separate effect for organization-specific data loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!organizationId || loading) return;

    const loadOrganizationData = async () => {
      try {
        // Get organization settings to check admin project creation permissions
        try {
          const orgSettings = await apiService.organizations.getSettings(organizationId);
          setOrganizationSettings(orgSettings);

          // Check if admin can create projects
          const userRole = getCurrentUserRole();
          const isOwner = userRole === 'owner';
          const adminCanCreate = orgSettings?.allow_admin_create_projects === true;
          setCanCreateProjects(isOwner || adminCanCreate);

          console.log('Organization settings loaded:', {
            userRole,
            isOwner,
            adminCanCreate,
            canCreateProjects: isOwner || adminCanCreate
          });
        } catch (settingsError) {
          console.warn('Failed to load organization settings:', settingsError);
          // Default to owner-only project creation
          const userRole = getCurrentUserRole();
          const isOwner = userRole === 'owner';
          setCanCreateProjects(isOwner);
        }

        // Get projects for this organization only
        const projectsResult = await apiService.projects.getAll(organizationId);

        // Filter projects to ensure they belong to current organization
        const orgProjects = (projectsResult || []).filter(project =>
          project.organization_id === organizationId
        );

        // Remove duplicates based on project ID
        const uniqueProjects = orgProjects.reduce((acc, current) => {
          const existing = acc.find(item => item.id === current.id);
          if (!existing) {
            acc.push(current);
          }
          return acc;
        }, []);

        // Fetch team members for each project
        const projectsWithTeams = await Promise.all(
          uniqueProjects.map(async (project) => {
            try {
              const teamMembers = await apiService.projects.getTeamMembers(project.id, organizationId);
              return {
                ...project,
                team: teamMembers || []
              };
            } catch (error) {
              console.warn(`Failed to load team members for project ${project.id}:`, error);
              return {
                ...project,
                team: []
              };
            }
          })
        );

        setProjects(projectsWithTeams);

        // Get team members (including pending invitations)
        try {
          console.log('Loading team members for organization:', organizationId);

          // Get active members
          const activeMembers = await teamService.getTeamMembers(organizationId);
          console.log('Active members loaded:', activeMembers);

          // Get pending invitations
          const pendingInvitations = await teamService.getPendingInvitations(organizationId);
          console.log('Pending invitations loaded:', pendingInvitations);

          // Combine both lists
          const allMembers = [
            ...(activeMembers || []).map(member => ({
              ...member,
              status: member.status || 'active'
            })),
            ...(pendingInvitations || []).map(invite => ({
              id: invite.id,
              name: invite.email.split('@')[0],
              email: invite.email,
              role: invite.role,
              status: 'pending',
              avatar: '/assets/images/avatar.jpg',
              lastActivity: new Date(invite.created_at || Date.now()),
              joinedDate: new Date(invite.created_at || Date.now()),
              department: '',
              currentTask: '',
              tasksCompleted: 0
            }))
          ];

          console.log('Combined team members:', allMembers);
          setTeamMembers(allMembers);
        } catch (teamError) {
          console.error('Failed to load team members:', teamError);
          setTeamMembers([]);
        }

        // Get notifications
        try {
          setNotificationsLoading(true);
          const notificationsResult = await notificationService.getNotifications(organizationId);
          setNotifications(notificationsResult || []);
        } catch (notificationError) {
          console.error('Failed to load notifications:', notificationError);
          setNotifications([]);
        } finally {
          setNotificationsLoading(false);
        }

        // Get activities
        try {
          setActivitiesLoading(true);
          // Try to load real activities data
          const activitiesResult = await getRecentActivities(organizationId);
          if (activitiesResult?.success && activitiesResult?.data) {
            setActivities(activitiesResult.data);
          } else {
            throw new Error('Activities API not available');
          }
        } catch (activitiesError) {
          console.warn('Using fallback activities data:', activitiesError.message);
          // Set fallback activities data
          setActivities([
            {
              id: '1',
              type: 'project_created',
              description: 'Welcome to your admin dashboard!',
              timestamp: new Date().toISOString(),
              user: {
                name: currentUser?.displayName || currentUser?.name || 'Admin',
                avatar: '/assets/images/avatar.jpg'
              },
              project: 'Getting Started'
            }
          ]);
        } finally {
          setActivitiesLoading(false);
        }

        // Calculate dashboard stats from loaded data
        try {
          const statsResult = await apiService.users.getDashboardStats();
          if (statsResult.data) {
            setDashboardData(statsResult.data);
          }
        } catch (statsError) {
          console.error('Failed to load dashboard stats:', statsError);
          // Calculate stats from loaded data as fallback
          const calculatedStats = {
            total_projects: projectsWithTeams.length,
            total_members: teamMembers.length,
            pending_tasks: 0, // Will be calculated from cards
            total_activity: activities.length
          };
          setDashboardData(calculatedStats);
        }
      } catch (error) {
        console.error('Failed to load organization data:', error);
      }
    };

    loadOrganizationData();
  }, [organizationId, loading]); // Only when organizationId changes and not loading

  // FIX: Real-time project updates with stable dependency
  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = listenForProjectUpdates((updateData) => {
      const { action, project, organizationId: eventOrgId } = updateData;

      // Only handle updates for our organization
      if (eventOrgId !== organizationId) return;

      if (action === 'created' && project) {
        setProjects((prevProjects) => [...prevProjects, project]);
      } else if (action === 'updated' && project) {
        setProjects((prevProjects) => {
          const existingIndex = prevProjects.findIndex((p) => p.id === project.id);
          if (existingIndex >= 0) {
            const newProjects = [...prevProjects];
            newProjects[existingIndex] = project;
            return newProjects;
          }
          return prevProjects;
        });
      } else if (action === 'deleted' && project) {
        setProjects((prevProjects) => prevProjects.filter((p) => p.id !== project.id));
      } else if (action === 'refresh') {
        console.log('Project refresh requested');
      }
    });

    return unsubscribe;
  }, [organizationId]); // Only when organizationId changes



  // Calculate real-time dashboard stats from loaded data
  useEffect(() => {
    if (projects.length > 0 || teamMembers.length > 0) {
      const calculatedStats = {
        total_projects: projects.length,
        total_members: teamMembers.length,
        pending_tasks: 0, // Will be updated when we load cards
        total_activity: activities.length
      };

      // Only update if we have meaningful data or if dashboardData is null
      if (!dashboardData || projects.length > 0) {
        setDashboardData(calculatedStats);
      }
    }
  }, [projects.length, teamMembers.length, activities.length, dashboardData]);

  // FIX: Memoize KPI data calculation
  const adminKPIData = useMemo(() => {
    const realData = dashboardData || {};
    const projectCount = projects.length || realData.total_projects || 0;
    const memberCount = teamMembers.length || realData.total_members || 0;

    return [
      {
        title: 'Active Projects',
        value: projectCount.toString(),
        change: '+0',
        changeType: 'neutral',
        icon: 'FolderOpen',
        color: 'primary',
      },
      {
        title: 'Team Members',
        value: memberCount.toString(),
        change: memberCount > 0 ? `+${memberCount}` : '+0',
        changeType: memberCount > 0 ? 'positive' : 'neutral',
        icon: 'Users',
        color: 'success',
      },
      {
        title: 'Pending Tasks',
        value: (realData.pending_tasks || 0).toString(),
        change: '+0',
        changeType: 'neutral',
        icon: 'CheckSquare',
        color: 'accent',
      },
      {
        title: 'Total Activity',
        value: realData.total_activity?.toString() || '0',
        change: '+0',
        changeType: 'neutral',
        icon: 'Activity',
        color: 'warning',
      },
    ];
  }, [dashboardData, projects.length, teamMembers.length]);

  // FIX: Memoize filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(searchValue.toLowerCase());
      const matchesFilter = filterValue === 'all' || project.status === filterValue;
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchValue, filterValue]);

  // FIX: Stable event handlers with useCallback
  const handleCreateProject = useCallback(async (projectData) => {
    try {
      if (!organizationId) {
        throw new Error('No organization found');
      }

      const currentUserRole = getCurrentUserRole();
      console.log('Creating project with:', {
        organizationId,
        userRole: currentUserRole,
        projectData,
      });

      const result = await apiService.projects.create(organizationId, projectData);
      console.log('Project creation result:', result);

      if (result) {
        const newProject = {
          id: result.id,
          name: result.name || projectData.name,
          description: result.description || projectData.description,
          status: result.status || 'active',
          priority: result.priority || 'medium',
          created_at: result.created_at || new Date().toISOString(),
          updated_at: result.updated_at || new Date().toISOString(),
          organization_id: organizationId,
          created_by: result.created_by,
        };

        setProjects((prevProjects) => [...(prevProjects || []), newProject]);

        // Refresh from server
        try {
          const projectsResult = await apiService.projects.getAll(organizationId);
          if (projectsResult && Array.isArray(projectsResult)) {
            setProjects(projectsResult);
          }
        } catch (refreshError) {
          console.warn('Failed to refresh projects list:', refreshError);
        }

        setShowCreateProject(false);
        console.log('Project created successfully:', newProject.name);

        // Show success toast with team member notification info
        let toastMessage = `Project "${newProject.name}" created successfully!`;
        if (projectData.teamMembers && projectData.teamMembers.length > 0) {
          toastMessage += ` Team members have been notified.`;
        }
        if (projectData.projectManager) {
          toastMessage += ` Project manager has been assigned.`;
        }
        showToast(toastMessage, 'success', 6000);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      
      if (error.message.includes('Permission denied') || error.message.includes('create_project')) {
        throw new Error('Project creation has been restricted by your organization owner. Please contact your organization owner to enable admin project creation or to create new projects.');
      }
      
      throw error;
    }
  }, [organizationId, getCurrentUserRole, showToast]);

  const handleOpenCreateProject = useCallback(() => {
    setShowCreateProject(true);
  }, []);

  const handleCloseCreateProject = useCallback(() => {
    setShowCreateProject(false);
  }, []);

  const handleManageUsers = useCallback(() => {
    window.location.href = '/team-members';
  }, []);

  const handleInviteMembers = useCallback(() => {
    setShowInviteMember(true);
  }, []);

  const handleCloseInviteMember = useCallback(() => {
    setShowInviteMember(false);
  }, []);

  const handleAdminInviteSubmit = useCallback(async (inviteData) => {
    if (!organizationId) {
      console.error('No organization selected');
      return;
    }

    try {
      console.log('Admin inviting members:', inviteData);

      for (const email of inviteData.emails) {
        await teamService.inviteTeamMember(organizationId, {
          email,
          role: inviteData.role,
          message: inviteData.welcomeMessage,
        });
      }

      console.log('Invitations sent successfully');

      // Refresh dashboard stats
      const statsResult = await apiService.users.getDashboardStats();
      if (statsResult.data) {
        setDashboardData(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to invite members:', error);
    }
  }, [organizationId]);

  // Show error state
  if (error) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center'>
        <div className='text-center max-w-md mx-auto p-6'>
          <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg className='w-8 h-8 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z' />
            </svg>
          </div>
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>Dashboard Error</h2>
          <p className='text-gray-600 mb-6'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200'
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50'>
      {/* Enhanced Welcome Banner for New Users */}
      <div className='px-6 pt-6'>
        <WelcomeBanner />
      </div>

      {/* Legacy Welcome Message (fallback) */}
      {showWelcome && welcomeMessage && (
        <div className='bg-green-50 border-l-4 border-green-400 p-4 mb-6 mx-6'>
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg className='h-5 w-5 text-green-400' viewBox='0 0 20 20' fill='currentColor'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
              </svg>
            </div>
            <div className='ml-3'>
              <p className='text-sm text-green-700'>{welcomeMessage}</p>
            </div>
            <div className='ml-auto pl-3'>
              <button onClick={() => setShowWelcome(false)} className='text-green-400 hover:text-green-600'>
                <span className='sr-only'>Dismiss</span>
                <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                  <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <RoleBasedHeader
        userRole='admin'
        currentUser={currentUser}
        currentOrganization={organizations[0]}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
      />

      {/* Dashboard Stats Bar */}
      <div className='bg-white shadow-sm border-b border-slate-200'>
        <div className='max-w-7xl mx-auto px-6 py-4'>
          <div className='flex items-center justify-between text-sm text-slate-600'>
            <span>Projects: {projects.length || dashboardData?.total_projects || 0}</span>
            <span>•</span>
            <span>Members: {teamMembers.length || dashboardData?.total_members || 0}</span>
            <span>•</span>
            <span>Tasks: {dashboardData?.pending_tasks || 0}</span>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <main id='main-content' className='max-w-7xl mx-auto px-6 py-8'>
        {/* KPI Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          {adminKPIData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
          {/* Left Column - Projects */}
          <div className='lg:col-span-2 space-y-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-2xl font-semibold text-slate-800 tracking-tight'>
                    Project Management
                  </h2>
                  <p className='text-slate-600 mt-1'>
                    Manage and oversee all organization projects
                  </p>
                </div>
                <div className='flex gap-3'>
                  <button
                    onClick={canCreateProjects ? handleOpenCreateProject : () => {}}
                    disabled={!canCreateProjects}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm ${
                      canCreateProjects
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={!canCreateProjects ? 'Project creation is restricted. Contact your organization owner to enable admin project creation.' : 'Create new project'}
                  >
                    <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                    </svg>
                    New Project
                  </button>
                </div>
              </div>

              {/* Projects Grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} userRole='admin' />
                  ))
                ) : (
                  <div className='col-span-2 text-center py-12 bg-white rounded-xl border border-slate-200'>
                    <div className='w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center'>
                      <svg className='w-8 h-8 text-slate-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
                      </svg>
                    </div>
                    <h3 className='text-lg font-medium text-slate-900 mb-2'>No projects yet</h3>
                    <p className='text-slate-500 mb-6'>
                      {canCreateProjects
                        ? 'Create your first project to get started with project management.'
                        : 'Contact your organization owner to enable project creation or to create new projects.'}
                    </p>
                    {canCreateProjects && (
                      <button
                        onClick={handleOpenCreateProject}
                        className='inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200'
                      >
                        <svg className='w-4 h-4 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                        </svg>
                        Create Project
                      </button>
                    )}
                  </div>
                )}
              </div>
          </div>

          {/* Right Column - Quick Actions and Notifications */}
          <div className='space-y-8'>
            <QuickActions
              userRole='admin'
              onCreateProject={canCreateProjects ? handleOpenCreateProject : () => {}}
              onManageUsers={handleManageUsers}
              onInviteMembers={handleInviteMembers}
              canCreateProjects={canCreateProjects}
            />
            <ActivityFeed activities={activities} userRole='admin' loading={activitiesLoading} />
            <NotificationPanel notifications={notifications} loading={notificationsLoading} />
          </div>
        </div>

        {/* Bottom Section - Tasks and Team */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <TaskSummary tasks={[]} userRole='admin' />
          <TeamOverview teamMembers={teamMembers} userRole='admin' onInviteMembers={handleInviteMembers} />
        </div>
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={handleCloseCreateProject}
        onCreateProject={handleCreateProject}
        organizationId={organizationId}
        organizationName={organizations[0]?.name || 'Organization'}
      />

      {/* Admin Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteMember}
        onClose={handleCloseInviteMember}
        onInvite={handleAdminInviteSubmit}
      />
    </div>
  );
};

export default AdminDashboard;