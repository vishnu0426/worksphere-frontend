import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import realApiService from '../../utils/realApiService';
import sessionService from '../../utils/sessionService';
import { useAuth } from '../../contexts/AuthContext';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    temporaryPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginOption, setShowLoginOption] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please check your email for the correct link.');
      return;
    }

    // You could fetch invitation details here if needed
    // For now, we'll just validate the token exists
  }, [token]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (showLoginOption) setShowLoginOption(false);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    // Last name is optional, but if provided, it should not be empty
    if (formData.lastName.trim() && formData.lastName.trim().length < 2) {
      setError('Last name must be at least 2 characters long');
      return false;
    }
    if (!formData.temporaryPassword) {
      setError('Temporary password is required');
      return false;
    }
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await realApiService.organizations.acceptInvitation({
        token,
        email: formData.email.trim(),
        temporary_password: formData.temporaryPassword,
        new_password: formData.newPassword,
        first_name: formData.firstName,
        last_name: formData.lastName.trim() || "", // Use empty string instead of null for compatibility
      });

      if (response.success) {
        console.log('✅ INVITATION: Invitation accepted successfully, setting up session...');

        // Set up session with the tokens from invitation acceptance
        if (response.tokens && response.user && response.organization) {
          try {
            // Store session data using sessionService
            sessionService.sessionToken = response.tokens.access_token;
            sessionService.refreshToken = response.tokens.refresh_token;
            sessionService.user = response.user;

            // Set up comprehensive organization context
            sessionService.currentSession = {
              user: response.user,
              organization: response.organization,
              organizations: [response.organization],
              expiresAt: new Date(Date.now() + response.tokens.expires_in * 1000),
              rolePermissions: response.role_permissions || {},
              isNewUser: response.onboarding?.is_new_user || false
            };

            // Store session in sessionStorage
            sessionService.storeSession();

            // Update auth context with comprehensive user data
            const userData = {
              ...response.user,
              organizationId: response.organization.id,
              organizationName: response.organization.name,
              organizationRole: response.organization.role,
              rolePermissions: response.role_permissions,
              requires_password_reset: false,
              isNewUser: response.onboarding?.is_new_user || false
            };
            setUser(userData);

            console.log('✅ INVITATION: Session established, preparing welcome flow...');

            // Determine redirect URL based on role - NO fallback
            const roleBasedRedirect = response.redirect_url;

            if (!roleBasedRedirect) {
              console.error('❌ INVITATION: No redirect URL provided for user role:', response.organization?.role);
              setError('Unable to determine dashboard for your role. Please contact your organization administrator.');
              return;
            }

            // Create comprehensive welcome state for the dashboard
            const welcomeState = {
              // Welcome message data
              showWelcome: response.onboarding?.show_welcome || true,
              welcomeMessage: response.message,
              userInfo: {
                name: `${response.user.first_name} ${response.user.last_name}`.trim() || response.user.email,
                email: response.user.email,
                role: response.organization.role,
                roleTitle: response.role_permissions?.title || response.organization.role
              },
              organizationInfo: {
                name: response.organization.name,
                description: response.organization.description,
                id: response.organization.id
              },
              rolePermissions: response.role_permissions || {},
              nextSteps: response.onboarding?.next_steps || [],
              isNewUser: true,
              type: 'invitation_success'
            };

            console.log('✅ INVITATION: Redirecting to role-based dashboard:', roleBasedRedirect);

            // Navigate to role-based dashboard with welcome data
            navigate(roleBasedRedirect, {
              state: welcomeState,
              replace: true // Replace current history entry
            });

          } catch (sessionError) {
            console.error('❌ INVITATION: Session setup failed:', sessionError);
            // Fallback to login with success message
            navigate('/login', {
              state: {
                message: 'Invitation accepted successfully! Please log in with your new credentials.',
                type: 'success',
                email: response.user?.email
              }
            });
          }
        } else {
          // Fallback to login if tokens are missing
          console.warn('⚠️ INVITATION: Missing required response data, redirecting to login');
          navigate('/login', {
            state: {
              message: 'Invitation accepted successfully! Please log in with your new credentials.',
              type: 'success',
              email: formData.email
            }
          });
        }
      } else {
        setError(response.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);

      // Enhanced error handling based on status code and message content
      const errorMessage = error.message || '';
      const statusCode = error.status;

      if (statusCode === 401 || errorMessage.includes('Invalid temporary password')) {
        setError('Invalid temporary password. Please check your invitation email for the correct temporary password.');
      } else if (statusCode === 410 || errorMessage.includes('expired')) {
        setError('This invitation has expired. Please request a new invitation.');
      } else if (statusCode === 409 || errorMessage.includes('already been used')) {
        setError('This invitation has already been used. If you already have an account, please try logging in instead. Otherwise, please request a new invitation.');
        setShowLoginOption(true);
      } else if (statusCode === 422 || errorMessage.includes('Validation error')) {
        setError('Please check your input and try again. Make sure all required fields are filled correctly.');
      } else {
        setError(errorMessage || 'Failed to accept invitation. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6">
          <div className="text-center">
            <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invitation</h1>
            <p className="text-muted-foreground mb-6">
              This invitation link is invalid or has expired. Please check your email for the correct link.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <Icon name="UserPlus" size={48} className="text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Accept Invitation</h1>
          <p className="text-muted-foreground">
            Complete your profile to join the organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email address"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter your first name"
              required
            />
            <Input
              label="Last Name (Optional)"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Enter your last name (optional)"
            />
          </div>

          <Input
            label="Temporary Password"
            type="password"
            value={formData.temporaryPassword}
            onChange={(e) => handleInputChange('temporaryPassword', e.target.value)}
            placeholder="Enter the temporary password from your email"
            required
          />

          <Input
            label="New Password"
            type="password"
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            placeholder="Create a new password (min 8 characters)"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm your new password"
            required
          />

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive">
                <Icon name="AlertCircle" size={16} />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Accepting Invitation...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>

          {showLoginOption && (
            <Button
              type="button"
              variant="outline"
              className="w-full mt-3"
              onClick={() => navigate('/login')}
            >
              <Icon name="LogIn" size={16} className="mr-2" />
              Go to Login Page
            </Button>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
