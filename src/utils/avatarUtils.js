/**
 * User utility functions for managing user display information
 */

/**
 * Get user display name with fallbacks
 * @param {Object} user - User object
 * @returns {string} Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'User';
  
  if (user.displayName) return user.displayName;
  if (user.name) return user.name;
  
  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  if (fullName) return fullName;
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
};

/**
 * Format user role for display
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
export const formatUserRole = (role) => {
  if (!role) return 'Member';
  
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};
