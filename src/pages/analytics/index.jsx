import React, { useState, useEffect } from 'react';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import apiService from '../../utils/apiService';
import sessionService from '../../utils/sessionService';
import { useUserProfile } from '../../hooks/useUserProfile';

const Analytics = () => {
  const { userProfile, currentOrganization: profileOrg } = useUserProfile();
  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    userActivity: {
      dailyActiveUsers: [],
    },
    organizationPerformance: {
      performanceMetrics: [],
    },
    projectStats: {},
    usageAnalytics: {
      mostUsedFeatures: [],
      deviceBreakdown: [],
    },
  });

  // Time period filter
  const [timePeriod, setTimePeriod] = useState('30d');
  const timePeriods = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
  ];

  useEffect(() => {
    // derive user and role from unified profile
    if (userProfile) {
      setCurrentUser(userProfile);
      // Use organization role if available, otherwise use user role
      const role = (profileOrg && profileOrg.role) || userProfile.role || 'member';
      setUserRole(role.toLowerCase());
      console.log('✅ ANALYTICS: User role set to:', role);
    }
  }, [userProfile, profileOrg]);

  useEffect(() => {
    loadAnalyticsData();
  }, [timePeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Load real analytics data
      const [userActivity, orgPerformance, projectStats] = await Promise.all([
        loadUserActivityData(),
        loadOrgPerformanceData(),
        loadProjectStatsData(),
      ]);

      // For usage analytics, try API first, then fallback to basic data
      let usageData = { totalSessions: 0, averageSessionDuration: 0, pageViews: 0, bounceRate: 0, mostUsedFeatures: [] };
      try {
        const usageResult = await apiService.getUsageAnalytics(timePeriod);
        if (usageResult && usageResult.data) {
          usageData = usageResult.data;
        }
      } catch (error) {
        console.warn('Usage analytics not available:', error);
      }

      setAnalyticsData({
        userActivity,
        organizationPerformance: orgPerformance,
        projectStats,
        usageAnalytics: usageData,
      });

      console.log('✅ Analytics data loaded successfully:', {
        userActivity,
        organizationPerformance: orgPerformance,
        projectStats,
        usageAnalytics: usageData
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      // Set empty data on error
      setAnalyticsData({
        userActivity: { totalUsers: 0, activeUsers: 0, newUsers: 0, userGrowth: 0, dailyActiveUsers: [], topUsers: [] },
        organizationPerformance: { totalProjects: 0, completedProjects: 0, activeProjects: 0, completionRate: 0, averageProjectDuration: 0, teamProductivity: 0, performanceMetrics: [] },
        projectStats: { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, taskCompletionRate: 0, averageTaskDuration: 0, projectsByStatus: [] },
        usageAnalytics: { totalSessions: 0, averageSessionDuration: 0, pageViews: 0, bounceRate: 0, mostUsedFeatures: [] },
      });
    } finally {
      setLoading(false);
    }
  };

  // Load real user activity data
  const loadUserActivityData = async () => {
    try {
      const apiService = (await import('../../utils/apiService')).default;

      // Try to get real analytics data
      const analyticsResult = await apiService.analytics.getUserAnalytics();

      if (analyticsResult && analyticsResult.data) {
        return analyticsResult.data;
      } else {
        // Calculate from available data
        const teamService = (await import('../../utils/teamService')).default;
        const currentOrganization = sessionService.getCurrentOrganization();

        if (currentOrganization) {
          const members = await teamService.getTeamMembers(currentOrganization.id);

          return {
            totalUsers: members.length,
            activeUsers: members.filter(m => m.status === 'active').length,
            newUsers: members.filter(m => {
              const joinDate = new Date(m.created_at || m.joinedDate);
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return joinDate > weekAgo;
            }).length,
            userGrowth: 0, // Would need historical data
            dailyActiveUsers: [], // Would need activity tracking
            topUsers: members.slice(0, 3).map(member => ({
              name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email?.split('@')[0] || 'User',
              email: member.email,
              activity: Math.floor(Math.random() * 100) // Placeholder until real activity tracking
            }))
          };
        }
      }

      // Fallback empty data
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        userGrowth: 0,
        dailyActiveUsers: [],
        topUsers: []
      };
    } catch (error) {
      console.error('Failed to load user activity data:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        userGrowth: 0,
        dailyActiveUsers: [],
        topUsers: []
      };
    }
  };

  const loadOrgPerformanceData = async () => {
    try {
      const apiService = (await import('../../utils/apiService')).default;
      const currentOrganization = sessionService.getCurrentOrganization();

      if (!currentOrganization) {
        return { totalProjects: 0, completedProjects: 0, activeProjects: 0, completionRate: 0, averageProjectDuration: 0, teamProductivity: 0, performanceMetrics: [] };
      }

      // Get real projects data
      const projectsResult = await apiService.projects.getAll({ organization_id: currentOrganization.id });
      const projects = projectsResult.data || [];

      const totalProjects = projects.length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
      const completionRate = totalProjects > 0 ? (completedProjects / totalProjects * 100).toFixed(1) : 0;

      // Calculate performance metrics from real data
      const performanceMetrics = [
        { metric: 'Project Completion Rate', value: parseFloat(completionRate), trend: 'neutral' },
        { metric: 'Active Projects', value: activeProjects, trend: 'neutral' },
        { metric: 'Total Projects', value: totalProjects, trend: 'neutral' },
      ];

      return {
        totalProjects,
        completedProjects,
        activeProjects,
        completionRate: parseFloat(completionRate),
        averageProjectDuration: 0, // Would need historical data
        teamProductivity: 0, // Would need productivity metrics
        performanceMetrics
      };
    } catch (error) {
      console.error('Failed to load organization performance data:', error);
      return { totalProjects: 0, completedProjects: 0, activeProjects: 0, completionRate: 0, averageProjectDuration: 0, teamProductivity: 0, performanceMetrics: [] };
    }
  };

  const loadProjectStatsData = async () => {
    try {
      const apiService = (await import('../../utils/apiService')).default;
      const currentOrganization = sessionService.getCurrentOrganization();

      if (!currentOrganization) {
        return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, taskCompletionRate: 0, averageTaskDuration: 0, projectsByStatus: [] };
      }

      // Get projects and their tasks
      const projectsResult = await apiService.projects.getAll({ organization_id: currentOrganization.id });
      const projects = projectsResult.data || [];

      let allTasks = [];
      for (const project of projects) {
        try {
          const cardsResult = await apiService.cards.getByProject(project.id);
          if (cardsResult.data) {
            allTasks = allTasks.concat(cardsResult.data);
          }
        } catch (error) {
          console.warn(`Failed to load tasks for project ${project.id}:`, error);
        }
      }

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(task => task.status === 'completed' || task.column?.name?.toLowerCase().includes('done')).length;
      const inProgressTasks = allTasks.filter(task => task.status === 'in_progress' || task.column?.name?.toLowerCase().includes('progress')).length;
      const overdueTasks = allTasks.filter(task => {
        if (!task.due_date) return false;
        return new Date(task.due_date) < new Date() && task.status !== 'completed';
      }).length;

      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

      // Project status breakdown
      const projectsByStatus = [
        { status: 'Completed', count: projects.filter(p => p.status === 'completed').length, percentage: 0 },
        { status: 'In Progress', count: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length, percentage: 0 },
        { status: 'Planning', count: projects.filter(p => p.status === 'planning' || p.status === 'draft').length, percentage: 0 },
      ];

      // Calculate percentages
      const totalProjects = projects.length;
      projectsByStatus.forEach(item => {
        item.percentage = totalProjects > 0 ? (item.count / totalProjects * 100).toFixed(1) : 0;
      });

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        taskCompletionRate: parseFloat(taskCompletionRate),
        averageTaskDuration: 0, // Would need historical data
        projectsByStatus
      };
    } catch (error) {
      console.error('Failed to load project stats data:', error);
      return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, taskCompletionRate: 0, averageTaskDuration: 0, projectsByStatus: [] };
    }
  };

  const generateMockUsageAnalytics = () => ({
    totalSessions: 342,
    averageSessionDuration: 28,
    pageViews: 1456,
    bounceRate: 23,
    mostUsedFeatures: [
      { feature: 'Kanban Board', usage: 89 },
      { feature: 'Team Chat', usage: 76 },
      { feature: 'File Sharing', usage: 65 },
      { feature: 'Time Tracking', usage: 54 },
    ],
    deviceBreakdown: [
      { device: 'Desktop', percentage: 68 },
      { device: 'Mobile', percentage: 24 },
      { device: 'Tablet', percentage: 8 },
    ],
  });

  // Check if user has access to analytics
  if (userRole !== 'owner' && userRole !== 'admin') {
    return (
      <div className='min-h-screen bg-background'>
        <RoleBasedHeader
          userRole={userRole.toLowerCase()}
          currentUser={currentUser}
          currentOrganization={profileOrg}
        />
        <main className='pt-16'>
          <div className='max-w-7xl mx-auto p-6'>
            <div className='flex items-center justify-center h-64'>
              <div className='text-center'>
                <Icon
                  name='Lock'
                  size={32}
                  className='mx-auto mb-4 text-text-secondary'
                />
                <h3 className='text-lg font-medium text-text-primary mb-2'>
                  Access Restricted
                </h3>
                <p className='text-text-secondary mb-4'>
                  Analytics are only available to Owner and Admin users.
                </p>
                <Button onClick={() => window.history.back()}>Go Back</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <RoleBasedHeader
        userRole={userRole.toLowerCase()}
        currentUser={
          currentUser
            ? {
                name: `${currentUser.firstName} ${currentUser.lastName}`,
                email: currentUser.email,
                role: userRole,
              }
            : {
                name: 'Loading...',
                email: '',
                role: userRole,
              }
        }
        currentOrganization={profileOrg}
      />

      <main className='pt-16'>
        <div className='max-w-7xl mx-auto p-6'>
          <Breadcrumb />

          {/* Page Header */}
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h1 className='text-3xl font-bold text-text-primary'>
                Analytics Dashboard
              </h1>
              <p className='text-text-secondary mt-2'>
                Comprehensive insights into your organization's performance and
                usage
              </p>
            </div>

            {/* Time Period Filter */}
            <div className='flex items-center space-x-4'>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className='px-4 py-2 border border-border rounded-lg bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary'
              >
                {timePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>

              <Button variant='outline' iconName='Download'>
                Export Report
              </Button>
            </div>
          </div>

          {loading ? (
            <div className='flex items-center justify-center h-64'>
              <div className='text-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                <p className='text-text-secondary'>Loading analytics data...</p>
              </div>
            </div>
          ) : (
            <div className='space-y-8'>
              {/* Key Metrics Overview */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                <div className='bg-card rounded-lg border border-border p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-text-secondary'>
                        Total Users
                      </p>
                      <p className='text-2xl font-bold text-text-primary'>
                        {analyticsData.userActivity.totalUsers}
                      </p>
                    </div>
                    <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center'>
                      <Icon name='Users' size={24} className='text-primary' />
                    </div>
                  </div>
                  <div className='mt-4 flex items-center'>
                    <Icon
                      name='TrendingUp'
                      size={16}
                      className='text-success mr-1'
                    />
                    <span className='text-sm text-success'>
                      +{analyticsData.userActivity.userGrowth}%
                    </span>
                    <span className='text-sm text-text-secondary ml-2'>
                      vs last period
                    </span>
                  </div>
                </div>

                <div className='bg-card rounded-lg border border-border p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-text-secondary'>
                        Active Projects
                      </p>
                      <p className='text-2xl font-bold text-text-primary'>
                        {analyticsData.organizationPerformance.activeProjects}
                      </p>
                    </div>
                    <div className='w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center'>
                      <Icon
                        name='FolderOpen'
                        size={24}
                        className='text-accent'
                      />
                    </div>
                  </div>
                  <div className='mt-4 flex items-center'>
                    <Icon
                      name='TrendingUp'
                      size={16}
                      className='text-success mr-1'
                    />
                    <span className='text-sm text-success'>+2</span>
                    <span className='text-sm text-text-secondary ml-2'>
                      new this month
                    </span>
                  </div>
                </div>

                <div className='bg-card rounded-lg border border-border p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-text-secondary'>
                        Completion Rate
                      </p>
                      <p className='text-2xl font-bold text-text-primary'>
                        {analyticsData.projectStats.taskCompletionRate}%
                      </p>
                    </div>
                    <div className='w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center'>
                      <Icon
                        name='CheckCircle'
                        size={24}
                        className='text-success'
                      />
                    </div>
                  </div>
                  <div className='mt-4 flex items-center'>
                    <Icon
                      name='TrendingUp'
                      size={16}
                      className='text-success mr-1'
                    />
                    <span className='text-sm text-success'>+5.2%</span>
                    <span className='text-sm text-text-secondary ml-2'>
                      improvement
                    </span>
                  </div>
                </div>

                <div className='bg-card rounded-lg border border-border p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-text-secondary'>
                        Team Productivity
                      </p>
                      <p className='text-2xl font-bold text-text-primary'>
                        {analyticsData.organizationPerformance.teamProductivity}
                        %
                      </p>
                    </div>
                    <div className='w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center'>
                      <Icon name='Zap' size={24} className='text-warning' />
                    </div>
                  </div>
                  <div className='mt-4 flex items-center'>
                    <Icon
                      name='TrendingUp'
                      size={16}
                      className='text-success mr-1'
                    />
                    <span className='text-sm text-success'>+3.1%</span>
                    <span className='text-sm text-text-secondary ml-2'>
                      this week
                    </span>
                  </div>
                </div>
              </div>

              {/* Charts and Detailed Analytics */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                {/* User Activity Chart */}
                <div className='bg-card rounded-lg border border-border p-6'>
                  <div className='flex items-center justify-between mb-6'>
                    <h3 className='text-lg font-semibold text-text-primary'>
                      User Activity Trends
                    </h3>
                    <Icon
                      name='BarChart3'
                      size={20}
                      className='text-text-secondary'
                    />
                  </div>

                  <div className='space-y-4'>
                    {(analyticsData.userActivity.dailyActiveUsers || []).map(
                      (day, index) => (
                        <div
                          key={index}
                          className='flex items-center justify-between'
                        >
                          <span className='text-sm text-text-secondary'>
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                          <div className='flex items-center space-x-2'>
                            <div className='w-32 bg-muted rounded-full h-2'>
                              <div
                                className='bg-primary h-2 rounded-full'
                                style={{ width: `${(day.users / 24) * 100}%` }}
                              ></div>
                            </div>
                            <span className='text-sm font-medium text-text-primary w-8'>
                              {day.users}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className='bg-card rounded-lg border border-border p-6'>
                  <div className='flex items-center justify-between mb-6'>
                    <h3 className='text-lg font-semibold text-text-primary'>
                      Performance Metrics
                    </h3>
                    <Icon
                      name='Target'
                      size={20}
                      className='text-text-secondary'
                    />
                  </div>

                  <div className='space-y-4'>
                    {(
                      analyticsData.organizationPerformance
                        .performanceMetrics || []
                    ).map((metric, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between'
                      >
                        <span className='text-sm text-text-secondary'>
                          {metric.metric}
                        </span>
                        <div className='flex items-center space-x-2'>
                          <div className='w-24 bg-muted rounded-full h-2'>
                            <div
                              className='bg-primary h-2 rounded-full'
                              style={{ width: `${metric.value}%` }}
                            ></div>
                          </div>
                          <span className='text-sm font-medium text-text-primary w-8'>
                            {metric.value}%
                          </span>
                          <Icon
                            name={
                              metric.trend === 'up'
                                ? 'TrendingUp'
                                : 'TrendingDown'
                            }
                            size={16}
                            className={
                              metric.trend === 'up'
                                ? 'text-success'
                                : 'text-destructive'
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
