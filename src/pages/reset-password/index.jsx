import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetResponse, setResetResponse] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const validateForm = () => {
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.newPassword)) {
      setError('Password must contain uppercase, lowercase, number, and special character');
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
    setError('');

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://192.168.9.119:8000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token: token,
          new_password: formData.newPassword
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || result.message || 'Failed to reset password');
      }

      // Store the reset response for role-based redirection
      setResetResponse(result);

      // If we have user and organization info, set up authentication state
      if (result.user && result.organization) {
        console.log('🔐 PASSWORD RESET: Setting up user session with role:', result.organization.role);

        // Create user data with organization context
        const userData = {
          ...result.user,
          organizationId: result.organization.id,
          organizationName: result.organization.name,
          organizationRole: result.organization.role,
          role: result.organization.role,
          requires_password_reset: false
        };

        // Set user in auth context
        setUser(userData);

        // Store session information in sessionStorage
        const sessionData = {
          user: userData,
          organization: result.organization,
          tokens: {
            access_token: 'temp-token', // Will be set properly on next login
            refresh_token: 'temp-refresh'
          }
        };

        sessionStorage.setItem('agno_session', JSON.stringify(sessionData));
        sessionStorage.setItem('userRole', result.organization.role);
        sessionStorage.setItem('organizationId', result.organization.id);

        console.log('✅ PASSWORD RESET: User session established, preparing role-based redirect...');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength) => {
    switch (strength) {
      case 0:
      case 1: return { text: 'Very Weak', color: 'text-red-600' };
      case 2: return { text: 'Weak', color: 'text-orange-600' };
      case 3: return { text: 'Fair', color: 'text-yellow-600' };
      case 4: return { text: 'Good', color: 'text-blue-600' };
      case 5: return { text: 'Strong', color: 'text-green-600' };
      default: return { text: '', color: '' };
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Success Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="CheckCircle" size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h1>
              <p className="text-gray-600">
                Your password has been successfully updated. You can now log in with your new password.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {resetResponse?.redirect_url && resetResponse?.organization ? (
                <Button
                  onClick={() => {
                    console.log('🚀 PASSWORD RESET: Redirecting to role-based dashboard:', resetResponse.redirect_url);
                    navigate(resetResponse.redirect_url, {
                      state: {
                        message: `Welcome back! Your password has been reset successfully.`,
                        type: 'success',
                        organizationName: resetResponse.organization.name,
                        userRole: resetResponse.organization.role
                      }
                    });
                  }}
                  className="w-full"
                >
                  <Icon name="ArrowRight" size={16} className="mr-2" />
                  Go to {resetResponse.organization.role.charAt(0).toUpperCase() + resetResponse.organization.role.slice(1)} Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  <Icon name="LogIn" size={16} className="mr-2" />
                  Go to Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Key" size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-gray-600">
              Enter your new password below to complete the reset process.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Icon name="AlertCircle" size={16} className="text-red-600 mr-2 flex-shrink-0" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            <div>
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter your new password"
                  required
                  disabled={loading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={getPasswordStrengthText(getPasswordStrength(formData.newPassword)).color}>
                      {getPasswordStrengthText(getPasswordStrength(formData.newPassword)).text}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        getPasswordStrength(formData.newPassword) <= 1 ? 'bg-red-500' :
                        getPasswordStrength(formData.newPassword) === 2 ? 'bg-orange-500' :
                        getPasswordStrength(formData.newPassword) === 3 ? 'bg-yellow-500' :
                        getPasswordStrength(formData.newPassword) === 4 ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${(getPasswordStrength(formData.newPassword) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  <Icon name={showConfirmPassword ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center text-sm">
                  {formData.newPassword === formData.confirmPassword ? (
                    <>
                      <Icon name="Check" size={14} className="text-green-600 mr-1" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <Icon name="X" size={14} className="text-red-600 mr-1" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !token}
              className="w-full"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resetting Password...
                </>
              ) : (
                <>
                  <Icon name="Key" size={16} className="mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
