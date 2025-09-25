/**
 * Role-based permission system for task assignments and other features
 */

// Role hierarchy and permissions
const ROLE_HIERARCHY = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3
};

const ROLE_PERMISSIONS = {
  viewer: {
    canAssignTasksToSelf: true,
    canAssignTasksToOthers: false,
    canCreateTasks: false,
    canEditOwnTasks: false,
    canEditOtherTasks: false,
    canDeleteTasks: false,
    canManageProjects: false,
    canInviteMembers: false,
    canManageMembers: false,
    assignmentScope: 'self'
  },
  member: {
    canAssignTasksToSelf: true,
    canAssignTasksToOthers: false,
    canCreateTasks: true,
    canEditOwnTasks: true,
    canEditOtherTasks: false,
    canDeleteTasks: false,
    canManageProjects: false,
    canInviteMembers: false,
    canManageMembers: false,
    assignmentScope: 'self'
  },
  admin: {
    canAssignTasksToSelf: true,
    canAssignTasksToOthers: true,
    canCreateTasks: true,
    canEditOwnTasks: true,
    canEditOtherTasks: true,
    canDeleteTasks: true,
    canManageProjects: true,
    canInviteMembers: true,
    canManageMembers: true,
    assignmentScope: 'project'
  },
  owner: {
    canAssignTasksToSelf: true,
    canAssignTasksToOthers: true,
    canCreateTasks: true,
    canEditOwnTasks: true,
    canEditOtherTasks: true,
    canDeleteTasks: true,
    canManageProjects: true,
    canInviteMembers: true,
    canManageMembers: true,
    assignmentScope: 'organization'
  }
};

/**
 * Get permissions for a specific role
 * @param {string} role - User role (viewer, member, admin, owner)
 * @returns {object} Role permissions object
 */
export const getRolePermissions = (role) => {
  const normalizedRole = role?.toLowerCase() || 'member';
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.member;
};

/**
 * Check if user can assign tasks to other members
 * @param {string} userRole - Current user's role
 * @param {string} currentUserId - Current user's ID
 * @param {string} targetUserId - Target user's ID for assignment
 * @param {object} projectContext - Project context (optional)
 * @returns {boolean} Whether assignment is allowed
 */
export const canAssignTaskToUser = (userRole, currentUserId, targetUserId, projectContext = null) => {
  const permissions = getRolePermissions(userRole);
  
  // Self-assignment is always allowed for all roles
  if (currentUserId === targetUserId) {
    return permissions.canAssignTasksToSelf;
  }
  
  // Check if user can assign to others
  if (!permissions.canAssignTasksToOthers) {
    return false;
  }
  
  // Role-specific assignment scope checks
  switch (permissions.assignmentScope) {
    case 'self':
      return currentUserId === targetUserId;
    
    case 'project':
      // Admin can assign within project scope
      // Check if target user is part of the project team
      if (projectContext && projectContext.projectTeam) {
        return projectContext.projectTeam.some(
          teamMember => teamMember.id === targetUserId
        );
      }
      // If no project context, allow assignment (fallback)
      return true;
    
    case 'organization':
      // Owner can assign to anyone in the organization
      return true;
    
    default:
      return false;
  }
};

/**
 * Filter assignable members based on user role and permissions
 * @param {array} allMembers - All available members
 * @param {string} userRole - Current user's role
 * @param {string} currentUserId - Current user's ID
 * @param {object} projectContext - Project context (optional)
 * @returns {array} Filtered list of assignable members
 */
export const getAssignableMembers = (allMembers, userRole, currentUserId, projectContext = null) => {
  let filteredMembers = allMembers.filter(member => {
    return canAssignTaskToUser(userRole, currentUserId, member.id, projectContext);
  });

  // Additional filtering based on project/board context
  if (projectContext) {
    filteredMembers = filterMembersByProjectAccess(filteredMembers, projectContext, userRole);
  }

  return filteredMembers;
};

/**
 * Filter members based on project/board access
 * @param {array} members - Members to filter
 * @param {object} projectContext - Project context with project/board info
 * @param {string} userRole - Current user's role
 * @returns {array} Filtered members who have access to the project/board
 */
export const filterMembersByProjectAccess = (members, projectContext, userRole) => {
  if (!projectContext || !projectContext.projectId) {
    return members;
  }

  // For now, return all members as we don't have project membership data
  // In a real implementation, this would filter based on project team membership
  return members.filter(member => {
    // Check if member is part of the project team
    if (projectContext.projectTeam) {
      return projectContext.projectTeam.some(teamMember => teamMember.id === member.id);
    }

    // If no project team data, allow all organization members for admin/owner
    const permissions = getRolePermissions(userRole);
    return permissions.assignmentScope === 'organization' || permissions.assignmentScope === 'project';
  });
};

/**
 * Get assignment restriction message for UI display
 * @param {string} userRole - Current user's role
 * @returns {string} User-friendly message explaining assignment restrictions
 */
export const getAssignmentRestrictionMessage = (userRole) => {
  const permissions = getRolePermissions(userRole);
  
  switch (permissions.assignmentScope) {
    case 'self':
      return userRole === 'viewer' 
        ? "Viewers can only assign tasks to themselves"
        : "Members can only assign tasks to themselves";
    
    case 'project':
      return "Admins can assign tasks to project team members";
    
    case 'organization':
      return "Owners can assign tasks to any organization member";
    
    default:
      return "Task assignment not available for your role";
  }
};

/**
 * Check if user can receive task assignments
 * @param {string} userRole - User's role
 * @returns {boolean} Whether user can receive task assignments
 */
export const canReceiveTaskAssignments = (userRole) => {
  // All roles can receive task assignments, but with different restrictions
  return ['member', 'admin', 'owner'].includes(userRole?.toLowerCase());
};

/**
 * Get role hierarchy level
 * @param {string} role - User role
 * @returns {number} Hierarchy level (higher number = more permissions)
 */
export const getRoleLevel = (role) => {
  return ROLE_HIERARCHY[role?.toLowerCase()] || 0;
};

/**
 * Check if user has higher or equal role than required
 * @param {string} userRole - Current user's role
 * @param {string} requiredRole - Required minimum role
 * @returns {boolean} Whether user meets role requirement
 */
export const hasMinimumRole = (userRole, requiredRole) => {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
};

/**
 * Validate assignment with enhanced project context
 * @param {string} userRole - Current user's role
 * @param {string} currentUserId - Current user's ID
 * @param {array} targetUserIds - Array of target user IDs for assignment
 * @param {object} projectContext - Project context with team data
 * @returns {object} Validation result with success status and error details
 */
export const validateAssignmentWithProjectContext = (userRole, currentUserId, targetUserIds, projectContext = null) => {
  const permissions = getRolePermissions(userRole);
  const invalidAssignments = [];
  const restrictionMessages = [];

  for (const targetUserId of targetUserIds) {
    // Check basic role permissions
    if (!canAssignTaskToUser(userRole, currentUserId, targetUserId, projectContext)) {
      invalidAssignments.push(targetUserId);

      // Determine specific reason for restriction
      if (currentUserId !== targetUserId && !permissions.canAssignTasksToOthers) {
        restrictionMessages.push(`${getAssignmentRestrictionMessage(userRole)}`);
      } else if (projectContext && projectContext.projectTeam) {
        const isInProject = projectContext.projectTeam.some(member => member.id === targetUserId);
        if (!isInProject) {
          restrictionMessages.push('Selected member is not part of this project team');
        }
      }
    }
  }

  return {
    valid: invalidAssignments.length === 0,
    invalidAssignments,
    errorMessage: restrictionMessages.length > 0 ? restrictionMessages[0] : null,
    allMessages: restrictionMessages
  };
};

const rolePermissions = {
  getRolePermissions,
  canAssignTaskToUser,
  getAssignableMembers,
  getAssignmentRestrictionMessage,
  canReceiveTaskAssignments,
  getRoleLevel,
  hasMinimumRole,
  filterMembersByProjectAccess,
  validateAssignmentWithProjectContext
};

export default rolePermissions;
