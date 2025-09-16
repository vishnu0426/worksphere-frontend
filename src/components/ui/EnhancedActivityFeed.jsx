import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import { useNavigate } from 'react-router-dom';

const EnhancedActivityFeed = ({ userRole, organizationId, limit = 20 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('today');
  const navigate = useNavigate();

  useEffect(() => {
    loadActivities();
  }, [filter, timeRange, organizationId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      // Mock activities for now - in real implementation, this would call an API
      const mockActivities = generateMockActivities();
      setActivities(mockActivities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
    setLoading(false);
  };

  const generateMockActivities = () => {
    const activityTypes = [
      { type: 'project_created', icon: 'FolderPlus', color: 'text-green-600' },
      { type: 'task_assigned', icon: 'UserCheck', color: 'text-blue-600' },
      { type: 'task_completed', icon: 'CheckCircle', color: 'text-green-600' },
      { type: 'team_member_added', icon: 'UserPlus', color: 'text-purple-600' },
      { type: 'project_updated', icon: 'Edit', color: 'text-orange-600' },
      { type: 'milestone_reached', icon: 'Target', color: 'text-red-600' },
      { type: 'comment_added', icon: 'MessageCircle', color: 'text-gray-600' },
      { type: 'file_uploaded', icon: 'Upload', color: 'text-indigo-600' }
    ];

    const users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Tom Brown'];
    const projects = ['Website Redesign', 'Mobile App', 'API Integration', 'Database Migration'];
    const tasks = ['Fix login bug', 'Update documentation', 'Code review', 'Deploy to staging'];

    return Array.from({ length: limit }, (_, i) => {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const project = projects[Math.floor(Math.random() * projects.length)];
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      
      const now = new Date();
      const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);

      let description = '';
      let actionUrl = '';

      switch (activityType.type) {
        case 'project_created':
          description = `${user} created project "${project}"`;
          actionUrl = `/projects/${i}`;
          break;
        case 'task_assigned':
          description = `${user} assigned task "${task}" in ${project}`;
          actionUrl = `/tasks/${i}`;
          break;
        case 'task_completed':
          description = `${user} completed task "${task}"`;
          actionUrl = `/tasks/${i}`;
          break;
        case 'team_member_added':
          description = `${user} joined project "${project}"`;
          actionUrl = `/projects/${i}/team`;
          break;
        case 'project_updated':
          description = `${user} updated project "${project}"`;
          actionUrl = `/projects/${i}`;
          break;
        case 'milestone_reached':
          description = `Project "${project}" reached a milestone`;
          actionUrl = `/projects/${i}`;
          break;
        case 'comment_added':
          description = `${user} commented on "${task}"`;
          actionUrl = `/tasks/${i}`;
          break;
        case 'file_uploaded':
          description = `${user} uploaded a file to "${project}"`;
          actionUrl = `/projects/${i}/files`;
          break;
        default:
          description = `${user} performed an action`;
      }

      return {
        id: i,
        type: activityType.type,
        icon: activityType.icon,
        color: activityType.color,
        description,
        user,
        timestamp,
        actionUrl,
        priority: Math.random() > 0.7 ? 'high' : 'normal'
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  const handleActivityClick = (activity) => {
    if (activity.actionUrl) {
      navigate(activity.actionUrl);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Icon name="Activity" size={20} />
          Recent Activity
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-border rounded px-2 py-1 bg-surface text-text-primary"
          >
            <option value="all">All Activities</option>
            <option value="project_created">Projects</option>
            <option value="task_assigned">Tasks</option>
            <option value="team_member_added">Team</option>
            <option value="comment_added">Comments</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-border rounded px-2 py-1 bg-surface text-text-primary"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2 text-text-secondary" />
          <p className="text-text-secondary">Loading activities...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="Activity" size={48} className="mx-auto mb-4 text-text-secondary opacity-50" />
          <p className="text-text-secondary">No activities found</p>
          <p className="text-sm text-text-secondary mt-1">Activities will appear here as team members work on projects</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors ${
                activity.actionUrl ? 'cursor-pointer' : ''
              } ${activity.priority === 'high' ? 'border-l-4 border-l-orange-500' : ''}`}
              onClick={() => handleActivityClick(activity)}
            >
              <div className={`flex-shrink-0 ${activity.color}`}>
                <Icon name={activity.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-secondary">
                    {getTimeAgo(activity.timestamp)}
                  </span>
                  {activity.priority === 'high' && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      High Priority
                    </span>
                  )}
                </div>
              </div>
              {activity.actionUrl && (
                <div className="flex-shrink-0">
                  <Icon name="ChevronRight" size={16} className="text-text-secondary" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm"
            onClick={() => navigate('/activity')}
          >
            View All Activities
            <Icon name="ArrowRight" size={14} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedActivityFeed;
