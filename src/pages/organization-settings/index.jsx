import React, { useState, useEffect } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import Select from '../../components/ui/Select';
import realApiService from '../../utils/realApiService';

const OrganizationSettings = () => {
  const { userProfile, currentOrganization, loading: profileLoading } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user has access to organization settings
  const userRole = userProfile?.role?.toLowerCase();
  const hasAccess = userRole === 'owner' || userRole === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    // Organization basic info
    name: '',
    description: '',
    
    // Member invitation settings
    allowAdminInvite: true,
    allowMemberInvite: false,
    requireDomainMatch: false,
    allowedDomains: '',
    
    // Notification preferences
    emailNotifications: true,
    taskNotifications: true,
    meetingNotifications: true,
    
    // Organization visibility
    visibility: 'private', // private, internal, public
    allowGuestAccess: false
  });

  // Load organization settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentOrganization?.id || !hasAccess) return;

      setIsLoading(true);
      setError(null);

      try {
        // Load organization basic info
        const orgResponse = await realApiService.organizations.getById(currentOrganization.id);
        
        // Load organization settings if available
        let settingsResponse = null;
        try {
          settingsResponse = await realApiService.get(`/api/v1/organizations/${currentOrganization.id}/settings`);
        } catch (settingsError) {
          // Settings might not exist yet, use defaults
          console.log('No existing settings found, using defaults');
        }

        setFormData({
          name: orgResponse.name || '',
          description: orgResponse.description || '',
          allowAdminInvite: settingsResponse?.allow_admin_create_projects ?? true,
          allowMemberInvite: settingsResponse?.allow_member_create_projects ?? false,
          requireDomainMatch: settingsResponse?.require_domain_match ?? false,
          allowedDomains: settingsResponse?.allowed_invitation_domains?.join(', ') || '',
          emailNotifications: settingsResponse?.enable_task_notifications ?? true,
          taskNotifications: settingsResponse?.enable_task_notifications ?? true,
          meetingNotifications: settingsResponse?.enable_meeting_notifications ?? true,
          visibility: 'private', // Default to private
          allowGuestAccess: false
        });

      } catch (error) {
        console.error('Failed to load organization settings:', error);
        setError('Failed to load organization settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [currentOrganization?.id, hasAccess]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear messages when user starts editing
    if (error) setError(null);
    if (successMessage) setSuccessMessage('');
  };

  // Handle form submission
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!currentOrganization?.id) {
      setError('No organization selected');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Update organization basic info
      await realApiService.organizations.update(currentOrganization.id, {
        name: formData.name,
        description: formData.description
      });

      // Update organization settings
      const settingsData = {
        allow_admin_create_projects: formData.allowAdminInvite,
        allow_member_create_projects: formData.allowMemberInvite,
        require_domain_match: formData.requireDomainMatch,
        allowed_invitation_domains: formData.allowedDomains 
          ? formData.allowedDomains.split(',').map(d => d.trim()).filter(d => d)
          : null,
        enable_task_notifications: formData.taskNotifications,
        enable_meeting_notifications: formData.meetingNotifications,
        enable_role_change_notifications: true
      };

      try {
        await realApiService.put(`/api/v1/organizations/${currentOrganization.id}/settings`, settingsData);
      } catch (settingsError) {
        // If settings don't exist, create them
        if (settingsError.status === 404) {
          await realApiService.post(`/api/v1/organizations/${currentOrganization.id}/settings`, settingsData);
        } else {
          throw settingsError;
        }
      }

      setSuccessMessage('Organization settings saved successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Failed to save organization settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Show access denied if user doesn't have permission
  if (!profileLoading && !hasAccess) {
    return (
      <div className='p-8 text-center'>
        <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
          <Icon name='Lock' size={32} className='text-red-600' />
        </div>
        <div className='text-lg font-semibold mb-2 text-red-600'>Access Denied</div>
        <div className='text-sm text-gray-600 mb-4'>
          You need owner or admin permissions to access organization settings.
        </div>
        <div className='text-xs text-gray-500'>
          Current role: {userRole || 'No role assigned'}
        </div>
        <Button
          variant='outline'
          onClick={() => window.history.back()}
          className='mt-4'
          iconName='ArrowLeft'
        >
          Go Back
        </Button>
      </div>
    );
  }

  // Show loading state
  if (isLoading || profileLoading) {
    return (
      <div className='p-8 text-center'>
        <div className='animate-pulse text-lg text-muted-foreground'>
          Loading organization settings...
        </div>
      </div>
    );
  }

  const visibilityOptions = [
    { value: 'private', label: 'Private - Only members can see this organization' },
    { value: 'internal', label: 'Internal - Anyone in your domain can see this organization' },
    { value: 'public', label: 'Public - Anyone can see this organization' }
  ];

  return (
    <div className='min-h-screen bg-background'>
      <RoleBasedHeader
        userRole={userRole}
        currentUser={
          userProfile
            ? {
                name: userProfile.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
                email: userProfile.email,
                avatar: userProfile.avatar || '/assets/images/avatar.jpg',
                role: userProfile.role,
              }
            : {
                name: 'Loading...',
                email: '',
                avatar: '/assets/images/avatar.jpg',
                role: userRole,
              }
        }
        currentOrganization={currentOrganization}
      />

      <div className='max-w-4xl mx-auto py-8 px-6 mt-16'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            Organization Settings
          </h1>
          <p className='text-muted-foreground'>
            Manage your organization's basic information, member permissions, and preferences.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-center'>
              <Icon name='AlertCircle' size={20} className='text-red-600 mr-2' />
              <span className='text-red-800'>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <div className='flex items-center'>
              <Icon name='CheckCircle' size={20} className='text-green-600 mr-2' />
              <span className='text-green-800'>{successMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className='space-y-8'>
          {/* Organization Information */}
          <div className='bg-card rounded-lg border p-6'>
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <Icon name='Building' size={20} className='mr-2' />
              Organization Information
            </h2>
            
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Organization Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder='Enter organization name'
                  required
                />
              </div>
              
              <div>
                <label className='block text-sm font-medium mb-2'>Description</label>
                <textarea
                  className='w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder='Describe your organization...'
                />
              </div>
            </div>
          </div>

          {/* Member Invitation Settings */}
          <div className='bg-card rounded-lg border p-6'>
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <Icon name='UserPlus' size={20} className='mr-2' />
              Member Invitation Settings
            </h2>
            
            <div className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='allowAdminInvite'
                  checked={formData.allowAdminInvite}
                  onCheckedChange={(checked) => handleInputChange('allowAdminInvite', checked)}
                />
                <label htmlFor='allowAdminInvite' className='text-sm font-medium'>
                  Allow admins to invite new members
                </label>
              </div>
              
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='allowMemberInvite'
                  checked={formData.allowMemberInvite}
                  onCheckedChange={(checked) => handleInputChange('allowMemberInvite', checked)}
                />
                <label htmlFor='allowMemberInvite' className='text-sm font-medium'>
                  Allow members to invite new members
                </label>
              </div>
              
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='requireDomainMatch'
                  checked={formData.requireDomainMatch}
                  onCheckedChange={(checked) => handleInputChange('requireDomainMatch', checked)}
                />
                <label htmlFor='requireDomainMatch' className='text-sm font-medium'>
                  Require email domain match for invitations
                </label>
              </div>
              
              {formData.requireDomainMatch && (
                <div>
                  <label className='block text-sm font-medium mb-2'>Allowed Email Domains</label>
                  <Input
                    value={formData.allowedDomains}
                    onChange={(e) => handleInputChange('allowedDomains', e.target.value)}
                    placeholder='example.com, company.org'
                    helperText='Comma-separated list of allowed email domains'
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className='bg-card rounded-lg border p-6'>
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <Icon name='Bell' size={20} className='mr-2' />
              Notification Preferences
            </h2>
            
            <div className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='taskNotifications'
                  checked={formData.taskNotifications}
                  onCheckedChange={(checked) => handleInputChange('taskNotifications', checked)}
                />
                <label htmlFor='taskNotifications' className='text-sm font-medium'>
                  Task assignments and updates
                </label>
              </div>
              
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='meetingNotifications'
                  checked={formData.meetingNotifications}
                  onCheckedChange={(checked) => handleInputChange('meetingNotifications', checked)}
                />
                <label htmlFor='meetingNotifications' className='text-sm font-medium'>
                  Meeting reminders and updates
                </label>
              </div>
            </div>
          </div>

          {/* Organization Visibility */}
          <div className='bg-card rounded-lg border p-6'>
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <Icon name='Eye' size={20} className='mr-2' />
              Organization Visibility
            </h2>
            
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Visibility Level</label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => handleInputChange('visibility', value)}
                  options={visibilityOptions}
                />
              </div>
              
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='allowGuestAccess'
                  checked={formData.allowGuestAccess}
                  onCheckedChange={(checked) => handleInputChange('allowGuestAccess', checked)}
                />
                <label htmlFor='allowGuestAccess' className='text-sm font-medium'>
                  Allow guest access to public projects
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className='flex justify-end pt-6 border-t border-border'>
            <Button
              type='submit'
              variant='default'
              loading={isSaving}
              iconName='Save'
              iconPosition='left'
              disabled={!hasAccess}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizationSettings;
