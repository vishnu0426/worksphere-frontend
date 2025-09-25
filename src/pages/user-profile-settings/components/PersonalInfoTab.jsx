import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const PersonalInfoTab = ({ userData, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: userData.fullName || '',
    email: userData.email || '',
    jobTitle: userData.jobTitle || '',
    bio: userData.bio || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Update form data when userData changes
  useEffect(() => {
    setFormData({
      fullName: userData.fullName || '',
      email: userData.email || '',
      jobTitle: userData.jobTitle || '',
      bio: userData.bio || ''
    });
  }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };



  const handleSave = async () => {
    try {
      setSaving(true);

      // Parse full name into first and last name
      const nameParts = formData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Prepare update data for backend
      const updateData = {
        first_name: firstName || null,
        last_name: lastName || null,
        job_title: formData.jobTitle || null,
        bio: formData.bio || null,
        // Note: Avatar upload would need separate endpoint in real implementation
        ...(formData.avatar && formData.avatar !== userData.avatar && { profile_picture: formData.avatar })
      };

      // Call the parent save function with the formatted data
      await onSave(updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      // Error handling is done in the parent component with toast notifications
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: userData.fullName || '',
      email: userData.email || '',
      jobTitle: userData.jobTitle || '',
      bio: userData.bio || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Full Name"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleInputChange}
          disabled={!isEditing}
          required
          className="col-span-1"
        />

        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={!isEditing}
          description="This email is used for login and notifications"
          required
          className="col-span-1"
        />

        <Input
          label="Job Title"
          name="jobTitle"
          type="text"
          value={formData.jobTitle}
          onChange={handleInputChange}
          disabled={!isEditing}
          placeholder="e.g., Senior Developer, Project Manager"
          className="col-span-1 md:col-span-2"
        />
      </div>

      {/* Bio Section */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Bio
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          disabled={!isEditing}
          placeholder="Tell your team a bit about yourself, your role, and what you're working on..."
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.bio.length}/500 characters
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Last updated: July 28, 2025
        </div>
        
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                iconName={saving ? "Loader" : "Save"}
                iconPosition="left"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              onClick={() => setIsEditing(true)}
              iconName="Edit"
              iconPosition="left"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoTab;