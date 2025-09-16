import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import ProjectSignoffStatus from '../../../components/project/ProjectSignoffStatus';
import ProjectSignoffModal from '../../../components/modals/ProjectSignoffModal';
import AddMilestoneModal from '../../../components/modals/AddMilestoneModal';
// import { useProject } from '../../../contexts/ProjectContext'; // Unused for now

const ProjectOverview = ({ project, userRole, onSwitchTab }) => {
  const navigate = useNavigate();
  // const [projectTasks, setProjectTasks] = useState([]); // Unused for now
  const [teamMembers, setTeamMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [showSignoffModal, setShowSignoffModal] = useState(false);
  const [signoffMode, setSignoffMode] = useState('request');
  const [signoffData, setSignoffData] = useState(null);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);

  // Handle navigation to kanban board
  const handleGoToBoard = () => {
    if (!project) return;

    console.log('Navigating to kanban board for:', project);
    // Store current project in localStorage for kanban board page
    localStorage.setItem('currentProjectId', project.id);
    localStorage.setItem('currentProject', JSON.stringify(project));

    navigate('/kanban-board', {
      state: {
        projectId: project.id,
        project: project,
      },
    });
  };

  // Handle sign-off request
  const handleRequestSignoff = () => {
    setSignoffMode('request');
    setSignoffData(null);
    setShowSignoffModal(true);
  };

  // Handle sign-off approval
  const handleApproveSignoff = (signoffStatusData) => {
    setSignoffMode('approve');
    setSignoffData(signoffStatusData);
    setShowSignoffModal(true);
  };

  // Handle settings navigation
  const handleGoToSettings = () => {
    console.log('Navigating to project settings...');
    if (onSwitchTab) {
      onSwitchTab('settings');
    } else {
      alert('Settings functionality: This would switch to the Settings tab or open project settings.');
    }
  };

  // Handle add task - redirect to tasks tab
  const handleAddTask = () => {
    console.log('Switching to tasks tab...');
    if (onSwitchTab) {
      onSwitchTab('tasks');
    } else {
      alert('Add Task functionality: This would switch to the Tasks tab.');
    }
  };

  // Handle add milestone
  const handleAddMilestone = () => {
    console.log('Opening add milestone modal...');
    setShowAddMilestoneModal(true);
  };

  // Handle save milestone
  const handleSaveMilestone = async (milestoneData) => {
    try {
      console.log('Saving milestone:', milestoneData);

      // Add the new milestone to the existing milestones
      setMilestones(prev => [...prev, milestoneData]);

      // TODO: Save to backend API
      // const apiService = (await import('../../../utils/apiService')).default;
      // await apiService.milestones.create(milestoneData);

      console.log('Milestone created successfully');
    } catch (error) {
      console.error('Error saving milestone:', error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  // Handle invite members
  const handleInviteMembers = () => {
    console.log('Opening invite members modal...');
    // TODO: Implement invite members modal
    alert('Invite Members functionality: This would open a modal to invite team members.');
  };

  // Handle sign-off success
  const handleSignoffSuccess = (result) => {
    console.log('Sign-off operation successful:', result);
    setShowSignoffModal(false);
    setSignoffData(null);
    // Optionally refresh project data or show success message
  };

  // Define generateMilestonesFromTasks with useCallback to prevent re-renders
  const generateMilestonesFromTasks = useCallback((tasks) => {
    if (!tasks || tasks.length === 0) {
      // Default milestones if no tasks
      setMilestones([
        {
          id: 1,
          title: 'Project Initiation',
          status: 'completed',
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          progress: 100,
        },
        {
          id: 2,
          title: 'Planning & Design',
          status: 'completed',
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          progress: 100,
        },
        {
          id: 3,
          title: 'Development Phase',
          status: 'in-progress',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          progress: project?.progress || 65,
        },
        {
          id: 4,
          title: 'Testing & QA',
          status: 'pending',
          dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          progress: 0,
        },
        {
          id: 5,
          title: 'Deployment',
          status: 'pending',
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          progress: 0,
        },
      ]);
      return;
    }

    // Generate milestones based on task groups
    const taskGroups = {};
    tasks.forEach((task) => {
      const category = task.title.split(' ')[0]; // Use first word as category
      if (!taskGroups[category]) {
        taskGroups[category] = [];
      }
      taskGroups[category].push(task);
    });

    const generatedMilestones = Object.entries(taskGroups).map(
      ([category, categoryTasks], index) => {
        const completedTasks = categoryTasks.filter(
          (task) => task.status === 'completed'
        ).length;
        const progress =
          categoryTasks.length > 0
            ? Math.round((completedTasks / categoryTasks.length) * 100)
            : 0;

        let status = 'pending';
        if (progress === 100) status = 'completed';
        else if (progress > 0) status = 'in-progress';

        return {
          id: index + 1,
          title: `${category} Phase`,
          status,
          dueDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          progress,
        };
      }
    );

    setMilestones(generatedMilestones);
  }, [project]);

  const loadProjectData = useCallback(() => {
    // Parse tasks from project data
    if (project?.tasks) {
      try {
        const tasks =
          typeof project.tasks === 'string'
            ? JSON.parse(project.tasks)
            : project.tasks;
        // setProjectTasks(tasks || []); // Commented out since projectTasks is unused

        // Generate milestones from tasks
        generateMilestonesFromTasks(tasks || []);
      } catch (error) {
        console.error('Error parsing project tasks:', error);
        // setProjectTasks([]); // Commented out since projectTasks is unused
      }
    }

    // Load team members from project data
    if (project?.team_members) {
      try {
        const members = typeof project.team_members === 'string'
          ? JSON.parse(project.team_members)
          : project.team_members;
        setTeamMembers(members || []);
      } catch (error) {
        console.error('Error parsing team members:', error);
        setTeamMembers([]);
      }
    } else {
      setTeamMembers([]);
    }
  }, [project, generateMilestonesFromTasks]);

  // Load project-specific data when project changes
  useEffect(() => {
    if (project) {
      loadProjectData();
    }
  }, [project, loadProjectData]);

  // Listen for project updates
  useEffect(() => {
    const handleProjectUpdate = (event) => {
      const { project: updatedProject } = event.detail;
      if (updatedProject && updatedProject.id === project?.id) {
        // Reload project data when project is updated
        loadProjectData();
      }
    };

    window.addEventListener('projectUpdated', handleProjectUpdate);
    return () =>
      window.removeEventListener('projectUpdated', handleProjectUpdate);
  }, [project, loadProjectData]);

  // Use actual project data with fallbacks for missing properties
  const projectData = {
    name: project?.name || 'Untitled Project',
    description: project?.description || 'No description available',
    status: project?.status || 'Active',
    progress: project?.progress || 0,
    startDate:
      project?.start_date ||
      project?.startDate ||
      new Date().toISOString().split('T')[0],
    endDate:
      project?.end_date ||
      project?.endDate ||
      new Date().toISOString().split('T')[0],
    budget: project?.budget
      ? {
          allocated: project.budget.allocated || project.budget || 0,
          spent: project.budget.spent || 0,
          remaining:
            project.budget.remaining ||
            (project.budget.allocated || project.budget || 0) -
              (project.budget.spent || 0),
        }
      : {
          allocated: 0,
          spent: 0,
          remaining: 0,
        },
    health: project?.health || 'Good',
    priority: project?.priority || 'Medium',
    created_by: project?.created_by,
    created_at: project?.created_at,
    team_members: project?.team_members || [],
    project_manager: project?.project_manager,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10';
      case 'in-progress':
        return 'text-warning bg-warning/10';
      case 'pending':
        return 'text-text-secondary bg-muted';
      default:
        return 'text-text-secondary bg-muted';
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'Good':
        return 'text-success';
      case 'At Risk':
        return 'text-warning';
      case 'Critical':
        return 'text-error';
      default:
        return 'text-text-secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className='space-y-6'>
      {/* Project Header */}
      <div className='bg-card rounded-lg border border-border p-6'>
        <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-2'>
              <h2 className='text-2xl font-semibold text-foreground'>
                {projectData.name}
              </h2>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(
                  projectData.health
                )}`}
              >
                {projectData.health}
              </span>
            </div>
            <p className='text-text-secondary mb-4'>
              {projectData.description}
            </p>
            <div className='flex flex-wrap items-center gap-4 text-sm'>
              <div className='flex items-center gap-2'>
                <Icon
                  name='Calendar'
                  size={16}
                  className='text-text-secondary'
                />
                <span className='text-text-secondary'>
                  {new Date(projectData.startDate).toLocaleDateString()} -{' '}
                  {new Date(projectData.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Icon name='Flag' size={16} className='text-error' />
                <span className='text-foreground font-medium'>
                  {projectData.priority} Priority
                </span>
              </div>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              iconName='Kanban'
              iconPosition='left'
              onClick={handleGoToBoard}
            >
              Board
            </Button>
            <Button
              variant='outline'
              iconName='Settings'
              iconPosition='left'
              onClick={handleGoToSettings}
            >
              Settings
            </Button>
            <Button
              variant='default'
              iconName='Plus'
              iconPosition='left'
              onClick={handleAddTask}
            >
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Progress and Budget Cards */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${
          userRole === 'owner' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        } gap-6`}
      >
        {/* Progress Card */}
        <div className='bg-card rounded-lg border border-border p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-medium text-foreground'>Progress</h3>
            <Icon name='TrendingUp' size={20} className='text-primary' />
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-2xl font-bold text-foreground'>
                {projectData.progress}%
              </span>
              <span className='text-sm text-success'>+5% this week</span>
            </div>
            <div className='w-full bg-muted rounded-full h-2'>
              <div
                className='bg-primary h-2 rounded-full transition-all duration-300'
                style={{ width: `${projectData.progress}%` }}
              />
            </div>
            <p className='text-sm text-text-secondary'>
              On track for completion
            </p>
          </div>
        </div>

        {/* Budget Card - Only visible to owners */}
        {userRole === 'owner' && (
          <div className='bg-card rounded-lg border border-border p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-medium text-foreground'>Budget</h3>
              <Icon name='DollarSign' size={20} className='text-primary' />
            </div>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-text-secondary'>Allocated</span>
                <span className='font-medium text-foreground'>
                  {formatCurrency(projectData.budget.allocated)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-text-secondary'>Spent</span>
                <span className='font-medium text-foreground'>
                  {formatCurrency(projectData.budget.spent)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-text-secondary'>Remaining</span>
                <span className='font-medium text-success'>
                  {formatCurrency(projectData.budget.remaining)}
                </span>
              </div>
              <div className='w-full bg-muted rounded-full h-2'>
                <div
                  className='bg-warning h-2 rounded-full transition-all duration-300'
                  style={{
                    width: `${
                      (projectData.budget.spent /
                        projectData.budget.allocated) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Team Stats Card */}
        <div className='bg-card rounded-lg border border-border p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-medium text-foreground'>Team</h3>
            <Icon name='Users' size={20} className='text-primary' />
          </div>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-text-secondary'>Total Members</span>
              <span className='font-medium text-foreground'>
                {teamMembers.length}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-text-secondary'>Active</span>
              <span className='font-medium text-success'>
                {
                  teamMembers.filter((member) => member.status === 'active')
                    .length
                }
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-text-secondary'>
                Tasks Completed
              </span>
              <span className='font-medium text-foreground'>
                {teamMembers.reduce(
                  (sum, member) => sum + member.tasksCompleted,
                  0
                )}
              </span>
            </div>
            <Button
              variant='outline'
              size='sm'
              fullWidth
              iconName='UserPlus'
              iconPosition='left'
              onClick={handleInviteMembers}
            >
              Invite Members
            </Button>
          </div>
        </div>
      </div>

      {/* Project Sign-off Status */}
      <div className='bg-card rounded-lg border border-border p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-medium text-foreground'>
            Project Sign-off Status
          </h3>
          <Icon name='CheckCircle' size={20} className='text-primary' />
        </div>
        <ProjectSignoffStatus
          projectId={project?.id}
          userRole={userRole}
          onRequestSignoff={handleRequestSignoff}
          onApproveSignoff={handleApproveSignoff}
        />
      </div>

      {/* Milestones */}
      <div className='bg-card rounded-lg border border-border p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-medium text-foreground'>
            Project Milestones
          </h3>
          <Button
            variant='outline'
            size='sm'
            iconName='Plus'
            iconPosition='left'
            onClick={handleAddMilestone}
          >
            Add Milestone
          </Button>
        </div>
        <div className='space-y-4'>
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className='flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors'
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  milestone.status === 'completed'
                    ? 'bg-success'
                    : milestone.status === 'in-progress'
                    ? 'bg-warning'
                    : 'bg-muted'
                }`}
              />
              <div className='flex-1'>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='font-medium text-foreground'>
                    {milestone.title}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      milestone.status
                    )}`}
                  >
                    {milestone.status.replace('-', ' ')}
                  </span>
                </div>
                <div className='flex items-center gap-4'>
                  <span className='text-sm text-text-secondary'>
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </span>
                  <div className='flex items-center gap-2'>
                    <div className='w-20 bg-muted rounded-full h-1.5'>
                      <div
                        className='bg-primary h-1.5 rounded-full transition-all duration-300'
                        style={{ width: `${milestone.progress}%` }}
                      />
                    </div>
                    <span className='text-sm text-text-secondary'>
                      {milestone.progress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members */}
      <div className='bg-card rounded-lg border border-border p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-medium text-foreground'>Team Members</h3>
          <Button
            variant='outline'
            size='sm'
            iconName='Settings'
            iconPosition='left'
          >
            Manage Roles
          </Button>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className='flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors'
            >
              <div className='relative'>
                <img
                  src={member.avatar}
                  alt={member.name}
                  className='w-12 h-12 rounded-full object-cover'
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                    member.status === 'active'
                      ? 'bg-success'
                      : 'bg-text-secondary'
                  }`}
                />
              </div>
              <div className='flex-1'>
                <h4 className='font-medium text-foreground'>{member.name}</h4>
                <p className='text-sm text-text-secondary'>{member.role}</p>
                <div className='flex items-center gap-4 mt-1'>
                  <span className='text-xs text-text-secondary'>
                    {member.tasksCompleted}/{member.tasksAssigned} tasks
                  </span>
                  <div className='w-16 bg-muted rounded-full h-1'>
                    <div
                      className='bg-primary h-1 rounded-full transition-all duration-300'
                      style={{
                        width: `${
                          (member.tasksCompleted / member.tasksAssigned) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <Button variant='ghost' size='sm' iconName='MoreHorizontal' />
            </div>
          ))}
        </div>
      </div>

      {/* Project Sign-off Modal */}
      <ProjectSignoffModal
        isOpen={showSignoffModal}
        onClose={() => {
          setShowSignoffModal(false);
          setSignoffData(null);
        }}
        projectId={project?.id}
        projectName={project?.name}
        mode={signoffMode}
        signoffData={signoffData}
        onSuccess={handleSignoffSuccess}
      />

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        isOpen={showAddMilestoneModal}
        onClose={() => setShowAddMilestoneModal(false)}
        onSave={handleSaveMilestone}
        projectId={project?.id}
      />
    </div>
  );
};

export default ProjectOverview;
