import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import realApiService from '../../../utils/realApiService';
import sessionService from '../../../utils/sessionService';

const MemberActivityModal = ({ isOpen, onClose, member }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && member) {
      loadMemberActivity();
    }
  }, [isOpen, member]);

  const loadMemberActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentOrganization = sessionService.getCurrentOrganization();
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await realApiService.teams.getMemberActivity(
        currentOrganization.id,
        member.user_id || member.id
      );

      setActivities(response.data || response || []);
    } catch (error) {
      console.error('Failed to load member activity:', error);
      setError('Failed to load activity data');
      // Fallback to empty array instead of mock data
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  const getActivityIcon = (type) => {
    const iconMap = {
      'card_created': 'Plus',
      'card_moved': 'ArrowRight',
      'card_updated': 'Edit',
      'comment_added': 'MessageCircle',
      'board_created': 'Layout',
      'member_invited': 'UserPlus',
      'task_assigned': 'User',
      'login': 'LogIn',
      'project_created': 'FolderPlus',
      'meeting_scheduled': 'Calendar'
    };
    return iconMap[type] || 'Activity';
  };

  const getActivityColor = (type) => {
    const colorMap = {
      'card_created': 'bg-green-100 text-green-600',
      'card_moved': 'bg-blue-100 text-blue-600',
      'card_updated': 'bg-yellow-100 text-yellow-600',
      'comment_added': 'bg-purple-100 text-purple-600',
      'board_created': 'bg-indigo-100 text-indigo-600',
      'member_invited': 'bg-pink-100 text-pink-600',
      'task_assigned': 'bg-orange-100 text-orange-600',
      'login': 'bg-gray-100 text-gray-600',
      'project_created': 'bg-emerald-100 text-emerald-600',
      'meeting_scheduled': 'bg-cyan-100 text-cyan-600'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-600';
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-card border border-border rounded-lg shadow-focused w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Member Activity</h2>
            <p className="text-sm text-text-secondary mt-1">
              Recent activity for {member.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6">
          {/* Member Info */}
          <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-primary-foreground">
                {member.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <div className="font-semibold text-text-primary text-lg">{member.name}</div>
              <div className="text-text-secondary">{member.email}</div>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="text-text-secondary">
                  Role: <span className="font-medium capitalize">{member.role}</span>
                </span>
                <span className="text-text-secondary">
                  Status: <span className="font-medium capitalize">{member.status}</span>
                </span>
                <span className="text-text-secondary">
                  Last seen: {formatTimestamp(member.lastActivity)}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-text-primary">Recent Activity</h3>
              {loading && (
                <Icon name="Loader2" size={16} className="animate-spin text-text-secondary" />
              )}
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMemberActivity}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 bg-muted/20 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type || activity.type)}`}>
                      <Icon name={getActivityIcon(activity.activity_type || activity.type)} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium">{activity.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-text-secondary">
                        {activity.project_name && (
                          <span className="flex items-center space-x-1">
                            <Icon name="Layout" size={14} />
                            <span>{activity.project_name}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Icon name="Clock" size={14} />
                          <span>{formatTimestamp(new Date(activity.created_at || activity.timestamp))}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : !loading && !error ? (
                <div className="text-center py-8 text-text-secondary">
                  <Icon name="Activity" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No recent activity found for this member.</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Activity Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary">24</div>
              <div className="text-sm text-text-secondary">Cards Created</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-success">18</div>
              <div className="text-sm text-text-secondary">Cards Completed</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-accent">42</div>
              <div className="text-sm text-text-secondary">Comments Added</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberActivityModal;