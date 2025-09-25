import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import sessionService from '../utils/sessionService.js';
import apiService from '../utils/realApiService.js';
import { getUserDisplayName, formatUserRole } from '../utils/avatarUtils.js';

/**
 * Custom hook for managing user profile data consistently across the application
 * This ensures all components use the same user data and stay in sync
 */
export const useUserProfile = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [availableOrganizations, setAvailableOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize user data to ensure consistent format
  const normalizeUserData = (userData) => {
    if (!userData) return null;

    // Handle different field name formats from API
    const firstName = userData.firstName || userData.first_name || '';
    const lastName = userData.lastName || userData.last_name || '';
    const email = userData.email || '';

    // Create a user object for avatar and display name generation
    const userForUtils = {
      ...userData,
      email,
      firstName,
      lastName,
      displayName: userData.displayName || userData.display_name,
      name: userData.name
    };

    // Use utility functions for consistent formatting
    const displayName = getUserDisplayName(userForUtils);

    console.log('🔍 USER PROFILE: Normalizing user data:', {
      input: userData,
      firstName,
      lastName,
      email,
      displayName,
      userForUtils
    });

    return {
      id: userData.id,
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      role: userData.role, // No default fallback
      formattedRole: formatUserRole(userData.role), // Add formatted version for display
      jobTitle: userData.jobTitle || userData.job_title || '',
      bio: userData.bio || userData.description || '',
      emailVerified: userData.emailVerified || userData.email_verified || false,
      twoFactorEnabled:
        userData.twoFactorEnabled || userData.two_factor_enabled || false,
      lastLoginAt: userData.lastLoginAt || userData.last_login_at,
      createdAt: userData.createdAt || userData.created_at,
    };
  };

  // Normalize organization data
  const normalizeOrganizationData = (orgData) => {
    if (!orgData) return null;

    return {
      id: orgData.id,
      name: orgData.name || 'Organization',
      domain: orgData.domain || '',
      logo: orgData.logo || '/assets/images/org-logo.png',
      role: orgData.role, // No default fallback
      slug: orgData.slug || '',
      member_count: orgData.member_count || 0,
      joined_at: orgData.joined_at,
    };
  };

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setUserProfile(null);
      setCurrentOrganization(null);
      setAvailableOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current user from session service
      const currentUser = sessionService.getCurrentUser();
      console.log('🔍 USER PROFILE: Raw user from session:', currentUser);

      if (currentUser) {
        const normalizedUser = normalizeUserData(currentUser);
        console.log('🔍 USER PROFILE: Normalized user data:', normalizedUser);
        setUserProfile(normalizedUser);

        // Get user data and organizations from API
        try {
          const result = await apiService.users.getCurrentUser();
          console.log('🔍 USER PROFILE: API result:', result);
          console.log('🔍 USER PROFILE: Current user from session:', currentUser);

          // Update user profile with database role and ensure proper field mapping
          if (result && result.role !== undefined) {
            const updatedUser = {
              ...normalizedUser,
              role: result.role, // Use database role, can be null
              // Ensure API data fields are properly mapped
              firstName: result.firstName || result.first_name || normalizedUser.firstName,
              lastName: result.lastName || result.last_name || normalizedUser.lastName,
              first_name: result.first_name || result.firstName || normalizedUser.first_name,
              last_name: result.last_name || result.lastName || normalizedUser.last_name,
            };

            // Recalculate display name with updated data
            const recalculatedUser = normalizeUserData(updatedUser);
            console.log('🔍 USER PROFILE: Updated user with API data:', {
              original: normalizedUser,
              apiResult: result,
              updated: recalculatedUser
            });
            setUserProfile(recalculatedUser);
          }

          if (
            result &&
            result.organizations &&
            result.organizations.length > 0
          ) {
            const normalizedOrgs = result.organizations.map(
              normalizeOrganizationData
            );
            setAvailableOrganizations(normalizedOrgs);

            // Use current_organization_id from backend if available
            let currentOrg = null;
            if (result.current_organization_id) {
              currentOrg = normalizedOrgs.find(
                (org) => org.id === result.current_organization_id
              );
            }

            // Fallback to saved org or first org
            if (!currentOrg) {
              const savedOrgId = sessionService.getOrganizationId();
              currentOrg = savedOrgId
                ? normalizedOrgs.find((org) => org.id === savedOrgId) ||
                  normalizedOrgs[0]
                : normalizedOrgs[0];
            }

            setCurrentOrganization(currentOrg);

            // Save current organization ID and user role to both sessionStorage and localStorage
            if (currentOrg) {
              sessionStorage.setItem('currentOrganizationId', currentOrg.id);
              sessionStorage.setItem('organizationId', currentOrg.id);
              sessionStorage.setItem('userRole', currentOrg.role);

              // Also save to localStorage for analytics API
              localStorage.setItem('currentOrganizationId', currentOrg.id);
              localStorage.setItem('organizationId', currentOrg.id);
              localStorage.setItem('userRole', currentOrg.role);

              console.log('🔍 ROLE DEBUG: Set role to', currentOrg.role, 'for org', currentOrg.id);
            }
          } else {
            // Create fallback organization
            const orgId = sessionService.getOrganizationId() || 'fallback-org';
            const fallbackOrg = {
              id: orgId,
              name: 'Organization',
              domain: '',
              logo: '/assets/images/org-logo.png',
              role: result?.role || normalizedUser.role, // Use database role, no default fallback
            };
            setCurrentOrganization(fallbackOrg);
            setAvailableOrganizations([fallbackOrg]);
          }
        } catch (apiError) {
          console.error('Failed to load organizations from API:', apiError);
          // Create fallback organization
          const orgId = sessionService.getOrganizationId() || 'fallback-org';
          const fallbackOrg = {
            id: orgId,
            name: 'Organization',
            domain: '',
            logo: '/assets/images/org-logo.png',
            role: normalizedUser.role, // Use actual role, no default fallback
          };
          setCurrentOrganization(fallbackOrg);
          setAvailableOrganizations([fallbackOrg]);
        }
      } else {
        // Use auth context user as fallback
        if (authUser) {
          const normalizedUser = normalizeUserData(authUser);
          setUserProfile(normalizedUser);
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError(err.message);

      // Use auth context user as fallback
      if (authUser) {
        const normalizedUser = normalizeUserData(authUser);
        setUserProfile(normalizedUser);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authUser]);

  // Switch organization
  const switchOrganization = (organizationId) => {
    const org = availableOrganizations.find((o) => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', org.id);
    }
  };

  // Update user profile
  const updateUserProfile = (updates) => {
    if (userProfile) {
      const updatedProfile = { ...userProfile, ...updates };
      const normalizedProfile = normalizeUserData(updatedProfile);
      setUserProfile(normalizedProfile);
    }
  };

  // Load data when authentication state changes
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  return {
    userProfile,
    currentOrganization,
    availableOrganizations,
    loading,
    error,
    switchOrganization,
    updateUserProfile,
    refreshProfile: loadUserProfile,
  };
};
