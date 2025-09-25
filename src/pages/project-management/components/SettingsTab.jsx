import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import realApiService from '../../../utils/realApiService';
import teamService from '../../../utils/teamService';
import sessionService from '../../../utils/sessionService';
import useToast from '../../../hooks/useToast';

const SettingsTab = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Helper function to get integration icon
  const getIntegrationIcon = (integrationType) => {
    const iconMap = {
      slack: 'MessageSquare',
      teams: 'Users',
      github: 'GitBranch',
      google_calendar: 'Calendar',
      calendar: 'Calendar',
      jira: 'Bug',
      trello: 'Trello',
      zoom: 'Video',
      outlook: 'Mail'
    };
    return iconMap[integrationType] || 'Puzzle';
  };
  const [currentProject, setCurrentProject] = useState(null);
  const [projectSettings, setProjectSettings] = useState({
    name: "",
    description: "",
    visibility: "private",
    status: "active",
    priority: "medium",
    startDate: "",
    endDate: "",
    budget: "",
    currency: "USD",
    timezone: "America/New_York"
  });

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    taskAssignments: true,
    deadlineReminders: true,
    statusChanges: false,
    weeklyReports: true,
    slackIntegration: false,
    teamsIntegration: true
  });

  // Team members state - will be loaded from API
  const [teamMembers, setTeamMembers] = useState([]);

  // Integrations state - will be loaded from API
  const [integrations, setIntegrations] = useState([]);

  // Load current project data
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);

        // Get project ID from location state or URL
        const projectId = location.state?.projectId || location.state?.project?.id;

        if (!projectId) {
          console.log('No project ID found, using default values');
          setLoading(false);
          return;
        }

        console.log('Loading project data for:', projectId);

        // Fetch project data from API
        const projectData = await realApiService.projects.getById(projectId);

        if (projectData) {
          setCurrentProject(projectData);

          // Update form with actual project data
          setProjectSettings({
            name: projectData.name || "",
            description: projectData.description || "",
            visibility: projectData.visibility || "private",
            status: projectData.status || "active",
            priority: projectData.priority || "medium",
            startDate: projectData.start_date ? projectData.start_date.split('T')[0] : "",
            endDate: projectData.due_date ? projectData.due_date.split('T')[0] : "",
            budget: projectData.budget?.toString() || "",
            currency: projectData.currency || "USD",
            timezone: projectData.timezone || "America/New_York"
          });

          console.log('✅ Project data loaded:', projectData);
        }

        // Load team members for the current organization
        try {
          const currentOrganization = sessionService.getCurrentOrganization();
          if (currentOrganization?.id) {
            console.log('Loading team members for organization:', currentOrganization.id);

            const members = await teamService.getTeamMembers(currentOrganization.id);
            console.log('Team members loaded:', members);

            if (members && Array.isArray(members)) {
              setTeamMembers(members);
            } else {
              console.warn('No team members found, using empty array');
              setTeamMembers([]);
            }
          } else {
            console.warn('No current organization found, using empty members array');
            setTeamMembers([]);
          }
        } catch (memberError) {
          console.error('Failed to load team members:', memberError);
          // Set empty array on error to prevent UI issues
          setTeamMembers([]);
        }

        // Load integrations for the current organization
        try {
          const currentOrganization = sessionService.getCurrentOrganization();
          if (currentOrganization?.id) {
            console.log('Loading integrations for organization:', currentOrganization.id);

            try {
              // Try to load real integrations from API
              const integrationsResult = await realApiService.integrations.getAll(currentOrganization.id);

              if (integrationsResult && Array.isArray(integrationsResult)) {
                // Map backend integration format to frontend format
                const mappedIntegrations = integrationsResult.map(integration => ({
                  id: integration.id,
                  name: integration.name || integration.integration_type,
                  description: integration.description || `${integration.integration_type} integration`,
                  icon: getIntegrationIcon(integration.integration_type),
                  connected: integration.is_active || false,
                  lastSync: integration.last_sync_at || null
                }));

                setIntegrations(mappedIntegrations);
                console.log('✅ Real integrations loaded:', mappedIntegrations);
              } else {
                throw new Error('Invalid integrations response');
              }
            } catch (apiError) {
              console.warn('API integrations not available, using fallback:', apiError.message);

              // Fallback integrations if API is not available
              const fallbackIntegrations = [
                {
                  id: 'slack',
                  name: 'Slack',
                  description: 'Send notifications and updates to Slack channels',
                  icon: 'MessageSquare',
                  connected: false,
                  lastSync: null
                },
                {
                  id: 'teams',
                  name: 'Microsoft Teams',
                  description: 'Collaborate and share updates in Teams channels',
                  icon: 'Users',
                  connected: false,
                  lastSync: null
                },
                {
                  id: 'github',
                  name: 'GitHub',
                  description: 'Link commits and pull requests to tasks',
                  icon: 'GitBranch',
                  connected: false,
                  lastSync: null
                },
                {
                  id: 'calendar',
                  name: 'Google Calendar',
                  description: 'Sync project deadlines and meetings',
                  icon: 'Calendar',
                  connected: false,
                  lastSync: null
                }
              ];

              setIntegrations(fallbackIntegrations);
              console.log('Fallback integrations loaded:', fallbackIntegrations);
            }
          }
        } catch (integrationError) {
          console.error('Failed to load integrations:', integrationError);
          setIntegrations([]);
        }

      } catch (error) {
        console.error('Failed to load project data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [location.state]);

  const [workflowSettings, setWorkflowSettings] = useState({
    autoAssignTasks: false,
    requireApproval: true,
    allowGuestAccess: false,
    enableTimeTracking: true,
    mandatoryComments: false
  });

  const [saving, setSaving] = useState(false);

  const visibilityOptions = [
    { value: 'private', label: 'Private - Only team members' },
    { value: 'organization', label: 'Organization - All org members' },
    { value: 'public', label: 'Public - Anyone with link' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'critical', label: 'Critical Priority' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' }
  ];

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' }
  ];





  const roleOptions = [
    { value: 'viewer', label: 'Viewer - Can view project' },
    { value: 'member', label: 'Member - Can edit tasks' },
    { value: 'admin', label: 'Admin - Can manage project' },
    { value: 'owner', label: 'Owner - Full control' }
  ];

  const handleProjectSettingChange = (field, value) => {
    setProjectSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProject = async () => {
    try {
      setSaving(true);

      if (!currentProject?.id) {
        alert('No project selected to save');
        return;
      }

      console.log('Saving project settings:', projectSettings);

      // Prepare update data
      const updateData = {
        name: projectSettings.name,
        description: projectSettings.description,
        status: projectSettings.status,
        priority: projectSettings.priority,
        start_date: projectSettings.startDate || null,
        due_date: projectSettings.endDate || null,
        // Add other fields as needed
      };

      // Update project via API
      const result = await realApiService.projects.update(currentProject.id, updateData);

      if (result) {
        console.log('✅ Project updated successfully');
        showToast('Project settings saved successfully!', 'success');
        setCurrentProject(result);
      } else {
        throw new Error('Failed to update project');
      }

    } catch (error) {
      console.error('Failed to save project:', error);
      showToast(`Failed to save project: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (field, checked) => {
    setNotifications(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const handleWorkflowChange = (field, checked) => {
    setWorkflowSettings(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const handleArchiveProject = async () => {
    if (!window.confirm('Are you sure you want to archive this project? You can restore it later.')) {
      return;
    }

    try {
      // Archive project via API
      await realApiService.projects.update(currentProject.id, { status: 'archived' });

      showToast('Project archived successfully!', 'success');
      // Optionally redirect to dashboard
      window.location.href = '/role-based-dashboard';
    } catch (error) {
      console.error('Failed to archive project:', error);
      alert('Failed to archive project. Please try again.');
    }
  };

  const handleDeleteProject = async () => {
    const projectName = currentProject?.name || 'this project';
    const confirmMessage = `Are you sure you want to delete "${projectName}"? This action cannot be undone and will permanently delete all project data including tasks, files, and history.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation for delete
    const doubleConfirm = window.prompt(`To confirm deletion, please type the project name: "${projectName}"`);
    if (doubleConfirm !== projectName) {
      alert('Project name does not match. Deletion cancelled.');
      return;
    }

    try {
      await realApiService.projects.delete(currentProject.id);

      alert('Project deleted successfully!');
      // Redirect to dashboard
      window.location.href = '/role-based-dashboard';
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleIntegrationToggle = async (integrationId) => {
    try {
      console.log(`Toggling integration: ${integrationId}`);

      // Find the integration in state
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      // Toggle the connected status
      const newConnectedStatus = !integration.connected;

      // Update the integration in state
      setIntegrations(prev => prev.map(i =>
        i.id === integrationId
          ? { ...i, connected: newConnectedStatus, lastSync: newConnectedStatus ? new Date().toISOString() : null }
          : i
      ));

      // Make actual API call to toggle integration
      try {
        await realApiService.integrations.toggle(integrationId, newConnectedStatus);
        console.log(`✅ Integration ${integrationId} toggled successfully via API`);
      } catch (apiError) {
        console.warn('API toggle failed, using local state only:', apiError.message);
        // Continue with local state update even if API fails
      }

      console.log(`Integration ${integrationId} ${newConnectedStatus ? 'connected' : 'disconnected'}`);
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      // Revert the state change on error
      setIntegrations(prev => prev.map(i =>
        i.id === integrationId
          ? { ...i, connected: !i.connected }
          : i
      ));
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      console.log(`Changing role for member ${memberId} to ${newRole}`);

      // Update the member role in state optimistically
      setTeamMembers(prev => prev.map(member =>
        member.id === memberId || member.user_id === memberId
          ? { ...member, role: newRole }
          : member
      ));

      // TODO: Make actual API call to update member role
      // await realApiService.organizations.updateMemberRole(organizationId, memberId, newRole);

      console.log(`Member ${memberId} role updated to ${newRole}`);
    } catch (error) {
      console.error('Failed to update member role:', error);
      // Revert the state change on error
      // You would need to store the original role to revert properly
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      console.log(`Removing member: ${memberId}`);

      if (!window.confirm('Are you sure you want to remove this member from the project?')) {
        return;
      }

      // Remove the member from state optimistically
      setTeamMembers(prev => prev.filter(member =>
        member.id !== memberId && member.user_id !== memberId
      ));

      // TODO: Make actual API call to remove member
      // await realApiService.organizations.removeMember(organizationId, memberId);

      console.log(`Member ${memberId} removed successfully`);
    } catch (error) {
      console.error('Failed to remove member:', error);
      // You would need to restore the member to state on error
    }
  };

  const formatLastActive = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Active now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'text-error bg-error/10';
      case 'admin':
        return 'text-warning bg-warning/10';
      case 'member':
        return 'text-primary bg-primary/10';
      case 'viewer':
        return 'text-text-secondary bg-muted';
      default:
        return 'text-text-secondary bg-muted';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Icon name='Loader2' size={32} className='animate-spin text-primary' />
            <div className="text-lg text-muted-foreground">
              Loading project settings...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Project Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-foreground">Project Information</h3>
          <Button
            variant="outline"
            size="sm"
            iconName="Save"
            iconPosition="left"
            onClick={handleSaveProject}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Project Name"
            type="text"
            value={projectSettings.name}
            onChange={(e) => handleProjectSettingChange('name', e.target.value)}
            required
          />
          <Select
            label="Project Status"
            options={statusOptions}
            value={projectSettings.status}
            onChange={(value) => handleProjectSettingChange('status', value)}
          />
          <div className="md:col-span-2">
            <Input
              label="Description"
              type="text"
              value={projectSettings.description}
              onChange={(e) => handleProjectSettingChange('description', e.target.value)}
              description="Brief description of the project goals and objectives"
            />
          </div>
          <Select
            label="Visibility"
            options={visibilityOptions}
            value={projectSettings.visibility}
            onChange={(value) => handleProjectSettingChange('visibility', value)}
          />
          <Select
            label="Priority"
            options={priorityOptions}
            value={projectSettings.priority}
            onChange={(value) => handleProjectSettingChange('priority', value)}
          />
          <Input
            label="Start Date"
            type="date"
            value={projectSettings.startDate}
            onChange={(e) => handleProjectSettingChange('startDate', e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={projectSettings.endDate}
            onChange={(e) => handleProjectSettingChange('endDate', e.target.value)}
          />
          <Input
            label="Budget"
            type="number"
            value={projectSettings.budget}
            onChange={(e) => handleProjectSettingChange('budget', e.target.value)}
          />
          <Select
            label="Currency"
            options={currencyOptions}
            value={projectSettings.currency}
            onChange={(value) => handleProjectSettingChange('currency', value)}
          />
          <div className="md:col-span-2">
            <Select
              label="Timezone"
              options={timezoneOptions}
              value={projectSettings.timezone}
              onChange={(value) => handleProjectSettingChange('timezone', value)}
              searchable
            />
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-foreground">Team Members</h3>
          <Button variant="default" size="sm" iconName="UserPlus" iconPosition="left">
            Invite Member
          </Button>
        </div>
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-medium text-foreground">{member.name}</h4>
                  <p className="text-sm text-text-secondary">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary">
                      Joined {new Date(member.joinedDate).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-text-secondary">•</span>
                    <span className="text-xs text-text-secondary">
                      {formatLastActive(member.lastActive)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                  {member.role}
                </span>
                <Select
                  options={roleOptions}
                  value={member.role}
                  onChange={(value) => handleRoleChange(member.id, value)}
                  className="w-40"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Trash2"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={member.role === 'owner'}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-6">Notification Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Email Notifications</h4>
            <Checkbox
              label="Task assignments and updates"
              checked={notifications.taskAssignments}
              onChange={(e) => handleNotificationChange('taskAssignments', e.target.checked)}
            />
            <Checkbox
              label="Deadline reminders"
              checked={notifications.deadlineReminders}
              onChange={(e) => handleNotificationChange('deadlineReminders', e.target.checked)}
            />
            <Checkbox
              label="Status changes"
              checked={notifications.statusChanges}
              onChange={(e) => handleNotificationChange('statusChanges', e.target.checked)}
            />
            <Checkbox
              label="Weekly progress reports"
              checked={notifications.weeklyReports}
              onChange={(e) => handleNotificationChange('weeklyReports', e.target.checked)}
            />
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Integration Notifications</h4>
            <Checkbox
              label="Slack notifications"
              checked={notifications.slackIntegration}
              onChange={(e) => handleNotificationChange('slackIntegration', e.target.checked)}
            />
            <Checkbox
              label="Microsoft Teams notifications"
              checked={notifications.teamsIntegration}
              onChange={(e) => handleNotificationChange('teamsIntegration', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Workflow Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-6">Workflow Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Checkbox
              label="Auto-assign tasks to available members"
              description="Automatically distribute new tasks based on workload"
              checked={workflowSettings.autoAssignTasks}
              onChange={(e) => handleWorkflowChange('autoAssignTasks', e.target.checked)}
            />
            <Checkbox
              label="Require approval for task completion"
              description="Tasks need admin approval before marking as done"
              checked={workflowSettings.requireApproval}
              onChange={(e) => handleWorkflowChange('requireApproval', e.target.checked)}
            />
            <Checkbox
              label="Enable time tracking"
              description="Allow team members to log time spent on tasks"
              checked={workflowSettings.enableTimeTracking}
              onChange={(e) => handleWorkflowChange('enableTimeTracking', e.target.checked)}
            />
          </div>
          <div className="space-y-4">
            <Checkbox
              label="Allow guest access"
              description="External users can view project with limited permissions"
              checked={workflowSettings.allowGuestAccess}
              onChange={(e) => handleWorkflowChange('allowGuestAccess', e.target.checked)}
            />
            <Checkbox
              label="Mandatory comments on status changes"
              description="Require explanation when changing task status"
              checked={workflowSettings.mandatoryComments}
              onChange={(e) => handleWorkflowChange('mandatoryComments', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-foreground">Integrations</h3>
          <Button variant="outline" size="sm" iconName="Plus" iconPosition="left">
            Add Integration
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Icon name={integration.icon} size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{integration.name}</h4>
                  <p className="text-sm text-text-secondary">{integration.description}</p>
                  {integration.connected && integration.lastSync && (
                    <p className="text-xs text-success">
                      Last sync: {new Date(integration.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  integration.connected ? 'text-success bg-success/10' : 'text-text-secondary bg-muted'
                }`}>
                  {integration.connected ? 'Connected' : 'Not Connected'}
                </span>
                <Button
                  variant={integration.connected ? "destructive" : "default"}
                  size="sm"
                  onClick={() => handleIntegrationToggle(integration.id)}
                >
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card rounded-lg border border-error/20 p-6">
        <h3 className="text-lg font-medium text-error mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-error/20 bg-error/5">
            <div>
              <h4 className="font-medium text-foreground">Archive Project</h4>
              <p className="text-sm text-text-secondary">
                Archive this project to hide it from active projects. You can restore it later.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveProject}
            >
              Archive
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-error/20 bg-error/5">
            <div>
              <h4 className="font-medium text-foreground">Delete Project</h4>
              <p className="text-sm text-text-secondary">
                Permanently delete this project and all its data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteProject}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;