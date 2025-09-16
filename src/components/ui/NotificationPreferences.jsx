import React, { useState, useEffect } from 'react';
import Button from './Button';
import Icon from '../AppIcon';
import * as notificationService from '../../utils/notificationService';

const NotificationPreferences = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    push_enabled: true,
    in_app_enabled: true,
    categories: {
      welcome: true,
      task_assigned: true,
      task_reminder: true,
      task_updated: true,
      project_update: true,
      project_milestone: true,
      team_member_added: true,
      system: true
    },
    priorities: {
      urgent: true,
      high: true,
      normal: true,
      low: false
    },
    quiet_hours: {
      enabled: false,
      start_time: '22:00',
      end_time: '08:00'
    },
    digest_frequency: 'immediate' // immediate, hourly, daily, weekly
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const result = await notificationService.getNotificationPreferencesEnhanced();
      if (result.success && result.data) {
        setPreferences(prev => ({ ...prev, ...result.data }));
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
    setLoading(false);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const result = await notificationService.updateNotificationPreferencesEnhanced(preferences);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
    setSaving(false);
  };

  const handleCategoryChange = (category, enabled) => {
    setPreferences(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: enabled
      }
    }));
  };

  const handlePriorityChange = (priority, enabled) => {
    setPreferences(prev => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [priority]: enabled
      }
    }));
  };

  const handleQuietHoursChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Icon name="Settings" size={20} />
            Notification Preferences
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-text-secondary">Loading preferences...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Delivery Methods */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Delivery Methods</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.in_app_enabled}
                    onChange={(e) => setPreferences(prev => ({ ...prev, in_app_enabled: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <div>
                    <span className="text-text-primary font-medium">In-App Notifications</span>
                    <p className="text-sm text-text-secondary">Show notifications in the notification bell</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={(e) => setPreferences(prev => ({ ...prev, email_enabled: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <div>
                    <span className="text-text-primary font-medium">Email Notifications</span>
                    <p className="text-sm text-text-secondary">Receive notifications via email</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.push_enabled}
                    onChange={(e) => setPreferences(prev => ({ ...prev, push_enabled: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <div>
                    <span className="text-text-primary font-medium">Browser Push Notifications</span>
                    <p className="text-sm text-text-secondary">Show desktop notifications</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Notification Categories */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Notification Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(preferences.categories).map(([category, enabled]) => (
                  <label key={category} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-text-primary capitalize">
                      {category.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Levels */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Priority Levels</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(preferences.priorities).map(([priority, enabled]) => (
                  <label key={priority} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => handlePriorityChange(priority, e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className={`capitalize font-medium ${
                      priority === 'urgent' ? 'text-red-600' :
                      priority === 'high' ? 'text-orange-600' :
                      priority === 'normal' ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {priority}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Quiet Hours</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.quiet_hours.enabled}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-text-primary">Enable quiet hours</span>
                </label>
                
                {preferences.quiet_hours.enabled && (
                  <div className="flex items-center gap-4 ml-6">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">From</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours.start_time}
                        onChange={(e) => handleQuietHoursChange('start_time', e.target.value)}
                        className="border border-border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">To</label>
                      <input
                        type="time"
                        value={preferences.quiet_hours.end_time}
                        onChange={(e) => handleQuietHoursChange('end_time', e.target.value)}
                        className="border border-border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Digest Frequency */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Digest Frequency</h3>
              <select
                value={preferences.digest_frequency}
                onChange={(e) => setPreferences(prev => ({ ...prev, digest_frequency: e.target.value }))}
                className="border border-border rounded px-3 py-2 bg-surface text-text-primary"
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p className="text-sm text-text-secondary mt-1">
                How often to receive notification summaries
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={savePreferences} disabled={saving || loading}>
            {saving ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
