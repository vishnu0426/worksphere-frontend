import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import MentionTextarea from '../../../components/ui/MentionTextarea';
import authService from '../../../utils/authService';
import realApiService from '../../../utils/realApiService';

const ActivityTimeline = ({ card, onAddComment, canComment }) => {
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load current user and activities on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Get current user
        const user = authService.getCurrentUser();
        setCurrentUser(user);

        // Load card activities including comments
        if (card?.id) {
          const cardActivities = await realApiService.cards.getCardActivities(card.id);
          setActivities(cardActivities || []);
        }
      } catch (error) {
        console.error('Error loading activity data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [card?.id]);

  const handleAddComment = async () => {
    if (newComment.trim() && !submitting && card?.id) {
      try {
        setSubmitting(true);

        const commentData = {
          content: newComment.trim(),
          mentions: extractMentions(newComment)
        };

        // Add comment via API
        const addedComment = await realApiService.cards.addCommentToCard(card.id, commentData);

        // Update local activities state
        setActivities(prev => [...prev, addedComment]);

        // Call parent callback if provided
        if (onAddComment) {
          onAddComment(addedComment);
        }

        setNewComment('');
        setIsCommenting(false);
      } catch (error) {
        console.error('Error adding comment:', error);
        // You might want to show an error message to the user here
      } finally {
        setSubmitting(false);
      }
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+(?:\.\w+)*)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return timestamp.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderActivityContent = (activity) => {
    if (activity.type === 'comment') {
      // Process mentions in comments
      let content = activity.content;
      if (activity.mentions && activity.mentions.length > 0) {
        activity.mentions.forEach(mention => {
          content = content.replace(
            new RegExp(`@${mention}`, 'g'),
            `<span class="text-primary font-medium">@${mention}</span>`
          );
        });
      }
      
      return (
        <div 
          className="text-text-primary"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    
    return (
      <div className="text-text-secondary">
        <span className="font-medium text-text-primary">{activity.user.name}</span>
        {' '}
        {activity.content}
      </div>
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddComment();
    } else if (e.key === 'Escape') {
      setIsCommenting(false);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Icon name="MessageSquare" size={20} className="text-text-secondary" />
        <h3 className="text-lg font-semibold text-text-primary">Activity</h3>
      </div>

      {/* Add Comment Section */}
      {canComment && currentUser && (
        <div className="flex space-x-3">
          <Image
            src={currentUser.avatar || '/assets/images/avatar.jpg'}
            alt={currentUser.name || 'User'}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            {isCommenting ? (
              <div className="space-y-3">
                <MentionTextarea
                  value={newComment}
                  onChange={setNewComment}
                  onKeyDown={handleKeyPress}
                  placeholder="Write a comment... Use @username to mention someone"
                  cardId={card?.id}
                  className="min-h-[80px] focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  disabled={submitting}
                />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-text-secondary">
                    Press Ctrl+Enter to post, Escape to cancel
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={submitting || !newComment.trim()}
                    >
                      {submitting ? 'Posting...' : 'Comment'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCommenting(false);
                        setNewComment('');
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCommenting(true)}
                className="w-full p-3 text-left text-text-secondary bg-muted rounded-md hover:bg-muted/80 transition-micro"
              >
                Write a comment...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-text-secondary">Loading activity...</p>
          </div>
        ) : (
          <>
            {activities.map((activity) => (
              <div key={activity.id} className="flex space-x-3">
                <Image
                  src={activity.user?.avatar || '/assets/images/avatar.jpg'}
                  alt={activity.user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-text-primary text-sm">
                      {activity.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatTimestamp(new Date(activity.timestamp || activity.created_at))}
                    </span>
                  </div>
                  <div className="text-sm">
                    {renderActivityContent(activity)}
                  </div>
                </div>
              </div>
            ))}

            {activities.length === 0 && !loading && (
              <div className="text-center py-8 text-text-secondary">
                <Icon name="MessageSquare" size={48} className="mx-auto mb-3 opacity-50" />
                <p>No activity yet</p>
                <p className="text-sm">Comments and updates will appear here</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;