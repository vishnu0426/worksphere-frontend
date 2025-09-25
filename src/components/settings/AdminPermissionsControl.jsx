import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';
import realApiService from '../../utils/realApiService';
import { useAuth } from '../../contexts/AuthContext';
import sessionService from '../../utils/sessionService';

const AdminPermissionsControl = ({ organizationId, userRole, onPermissionsChange }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Only owners can access this component
  const isOwner = userRole?.toLowerCase() === 'owner';

  useEffect(() => {
    if (isOwner && organizationId) {
      loadOrganizationSettings();
    }
  }, [organizationId, isOwner]);

  const loadOrganizationSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading organization settings for:', organizationId);
      
      const settingsData = await realApiService.organizationSettings.get(organizationId);
      
      if (settingsData) {
        setSettings(settingsData);
        console.log('✅ Organization settings loaded:', settingsData);
      } else {
        // Default settings if none exist
        setSettings({
          allow_admin_create_projects: true,
          allow_member_create_projects: false,
          allow_admin_schedule_meetings: true,
          allow_member_schedule_meetings: false
        });
      }
    } catch (error) {
      console.error('Failed to load organization settings:', error);
      setError('Failed to load organization settings');
      
      // Fallback to default settings
      setSettings({
        allow_admin_create_projects: true,
        allow_member_create_projects: false,
        allow_admin_schedule_meetings: true,
        allow_member_schedule_meetings: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (permissionKey, value) => {
    if (!isOwner) {
      alert('Only organization owners can modify these permissions.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updatedSettings = {
        ...settings,
        [permissionKey]: value
      };

      console.log('Updating permission:', permissionKey, '=', value);
      
      await realApiService.organizationSettings.update(organizationId, updatedSettings);
      
      setSettings(updatedSettings);
      console.log('✅ Permission updated successfully');
      
      // Notify parent component
      if (onPermissionsChange) {
        onPermissionsChange(updatedSettings);
      }

      // Show success message
      const permissionName = permissionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      alert(`${permissionName} permission updated successfully!`);
      
    } catch (error) {
      console.error('Failed to update permission:', error);
      setError('Failed to update permission. Please try again.');
      alert('Failed to update permission. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!isOwner) {
      alert('Only organization owners can reset permissions.');
      return;
    }

    if (!window.confirm('Are you sure you want to reset all permissions to default values?')) {
      return;
    }

    const defaultSettings = {
      allow_admin_create_projects: true,
      allow_member_create_projects: false,
      allow_admin_schedule_meetings: true,
      allow_member_schedule_meetings: false
    };

    try {
      setSaving(true);
      await realApiService.organizationSettings.update(organizationId, defaultSettings);
      setSettings(defaultSettings);
      
      if (onPermissionsChange) {
        onPermissionsChange(defaultSettings);
      }
      
      alert('Permissions reset to default values successfully!');
    } catch (error) {
      console.error('Failed to reset permissions:', error);
      alert('Failed to reset permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Icon name="Lock" size={16} className="text-yellow-600" />
          <span className="text-yellow-800 font-medium">Owner Access Required</span>
        </div>
        <p className="text-yellow-700 text-sm mt-1">
          Only organization owners can manage admin permissions.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Icon name="Loader2" size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Admin Permissions Control</h3>
          <p className="text-sm text-gray-600 mt-1">
            Control what actions administrators can perform in your organization
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDefaults}
          disabled={saving}
          iconName="RotateCcw"
          iconPosition="left"
        >
          Reset to Defaults
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Icon name="AlertCircle" size={16} className="text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Project Creation Permissions */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Project Creation</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Admins to Create Projects
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Administrators can create new projects within the organization
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.allow_admin_create_projects || false}
                  onChange={(e) => handlePermissionChange('allow_admin_create_projects', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Members to Create Projects
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Regular members can create new projects (not recommended for most organizations)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.allow_member_create_projects || false}
                  onChange={(e) => handlePermissionChange('allow_member_create_projects', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Meeting Permissions */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Meeting Management</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Admins to Schedule Meetings
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Administrators can schedule and manage organization meetings
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.allow_admin_schedule_meetings || false}
                  onChange={(e) => handlePermissionChange('allow_admin_schedule_meetings', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Members to Schedule Meetings
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Regular members can schedule meetings within their projects
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings?.allow_member_schedule_meetings || false}
                  onChange={(e) => handlePermissionChange('allow_member_schedule_meetings', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {saving && (
        <div className="mt-6 flex items-center justify-center py-4">
          <Icon name="Loader2" size={16} className="animate-spin text-blue-600 mr-2" />
          <span className="text-blue-600 text-sm">Saving permissions...</span>
        </div>
      )}
    </div>
  );
};

export default AdminPermissionsControl;
