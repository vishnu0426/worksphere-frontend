import React, { useState, useEffect } from 'react';
import Button from './Button';
import Icon from '../AppIcon';
import * as notificationService from '../../utils/notificationService';

const NotificationPerformanceMonitor = ({ isOpen, onClose }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStatistics();
    }
  }, [isOpen]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Mock statistics for now - in real implementation, this would call the API
      const mockStats = {
        success: true,
        statistics: {
          total_notifications: 1247,
          unread_notifications: 23,
          read_percentage: 98.2,
          priority_breakdown: {
            urgent: 5,
            high: 45,
            normal: 1150,
            low: 47
          },
          category_breakdown: {
            welcome: 12,
            task_assigned: 456,
            task_reminder: 234,
            task_updated: 189,
            project_update: 234,
            project_milestone: 67,
            team_member_added: 34,
            system: 21
          }
        }
      };
      
      setStatistics(mockStats.statistics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load notification statistics:', error);
    }
    setLoading(false);
  };

  const handleCleanupExpired = async () => {
    setCleanupLoading(true);
    try {
      // Mock cleanup for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Cleanup completed');
      await loadStatistics(); // Refresh stats after cleanup
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
    }
    setCleanupLoading(false);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'welcome': return 'UserPlus';
      case 'task_assigned': return 'UserCheck';
      case 'task_reminder': return 'Clock';
      case 'task_updated': return 'Edit';
      case 'project_update': return 'FolderOpen';
      case 'project_milestone': return 'Target';
      case 'team_member_added': return 'Users';
      case 'system': return 'Settings';
      default: return 'Bell';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Icon name="BarChart3" size={20} />
            Notification Performance Monitor
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadStatistics} disabled={loading}>
              <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-text-secondary">Loading statistics...</p>
          </div>
        ) : statistics ? (
          <div className="p-6 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Total Notifications</p>
                    <p className="text-2xl font-bold text-text-primary">
                      {formatNumber(statistics.total_notifications)}
                    </p>
                  </div>
                  <Icon name="Bell" size={24} className="text-blue-600" />
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Unread</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatNumber(statistics.unread_notifications)}
                    </p>
                  </div>
                  <Icon name="BellRing" size={24} className="text-orange-600" />
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Read Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {statistics.read_percentage.toFixed(1)}%
                    </p>
                  </div>
                  <Icon name="CheckCircle" size={24} className="text-green-600" />
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Last Updated</p>
                    <p className="text-sm font-medium text-text-primary">
                      {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                  <Icon name="Clock" size={24} className="text-gray-600" />
                </div>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Icon name="AlertTriangle" size={18} />
                Priority Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(statistics.priority_breakdown).map(([priority, count]) => (
                  <div key={priority} className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(priority)}`}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </div>
                    <p className="text-2xl font-bold text-text-primary mt-2">
                      {formatNumber(count)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {((count / statistics.total_notifications) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Icon name="Tag" size={18} />
                Category Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(statistics.category_breakdown).map(([category, count]) => (
                  <div key={category} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                    <Icon name={getCategoryIcon(category)} size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-text-primary capitalize">
                        {category.replace('_', ' ')}
                      </p>
                      <p className="text-lg font-bold text-text-primary">
                        {formatNumber(count)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Actions */}
            <div className="bg-muted rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Icon name="Zap" size={18} />
                Performance Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleCleanupExpired}
                  disabled={cleanupLoading}
                  className="flex items-center gap-2"
                >
                  {cleanupLoading ? (
                    <Icon name="Loader2" size={16} className="animate-spin" />
                  ) : (
                    <Icon name="Trash2" size={16} />
                  )}
                  Cleanup Expired
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => console.log('Optimize database')}
                  className="flex items-center gap-2"
                >
                  <Icon name="Database" size={16} />
                  Optimize Database
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => console.log('Export statistics')}
                  className="flex items-center gap-2"
                >
                  <Icon name="Download" size={16} />
                  Export Statistics
                </Button>
              </div>
            </div>

            {/* Performance Recommendations */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <Icon name="Lightbulb" size={16} />
                Performance Recommendations
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Consider implementing notification batching for high-volume periods</li>
                <li>• Set up automated cleanup for notifications older than 30 days</li>
                <li>• Monitor unread notification rates to optimize delivery timing</li>
                <li>• Use database indexing on frequently queried notification fields</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-text-secondary opacity-50" />
            <p className="text-text-secondary">Failed to load notification statistics</p>
            <Button variant="outline" onClick={loadStatistics} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPerformanceMonitor;
