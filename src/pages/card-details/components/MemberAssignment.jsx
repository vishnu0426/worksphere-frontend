import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import {
  getAssignableMembers,
  getAssignmentRestrictionMessage,
  getRolePermissions,
  canAssignTaskToUser,
} from '../../../utils/rolePermissions';
import authService from '../../../utils/authService';
import sessionService from '../../../utils/sessionService';
import realApiService from '../../../utils/realApiService';

const MemberAssignment = ({
  card,
  onMembersChange,
  canEdit,
  hasChanged = false,
  projectContext = null, // Add project context prop
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Load user data and organization members
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userResult = await authService.getCurrentUser();
        if (userResult.data.user) {
          setCurrentUser(userResult.data.user);
          setUserRole(
            userResult.data.user.role ||
              userResult.data.user.organizationRole ||
              sessionService.getUserRole()
          );
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setUserRole(sessionService.getUserRole());
      }
    };

    const loadOrganizationMembers = async () => {
      if (!card?.id) {
        console.warn('No card ID available for loading organization members');
        return;
      }

      try {
        setLoading(true);
        setValidationError(null); // Clear previous errors

        console.log('Loading organization members for card:', card.id);

        // Add retry logic for network issues
        let retryCount = 0;
        const maxRetries = 3;
        let response;

        while (retryCount < maxRetries) {
          try {
            response = await realApiService.cards.getAssignableMembers(card.id);
            break; // Success, exit retry loop
          } catch (retryError) {
            retryCount++;
            console.warn(`Attempt ${retryCount} failed:`, retryError.message);

            if (retryCount >= maxRetries) {
              throw retryError; // Re-throw after max retries
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        console.log('API Response:', response);

        // Handle different response formats
        let members = [];
        if (response && Array.isArray(response)) {
          // Direct array response
          members = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          // Wrapped response
          members = response.data;
        } else if (response && response.success && response.data) {
          // Success wrapper
          members = response.data;
        } else {
          console.error('Unexpected response format:', response);
          setOrganizationMembers([]);
          setValidationError('Failed to load team members - unexpected response format');
          return;
        }

        setOrganizationMembers(members);

        // If no members available, show helpful message instead of error
        if (members.length === 0) {
          setValidationError('no_members_available');
        }
      } catch (error) {
        console.error('Error loading organization members:', error);
        setOrganizationMembers([]);

        // Improved error handling with more specific error types
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
          // Silently handle network errors - don't show error message to user
          console.warn('Network error loading members, will retry on next interaction');
        } else if (error.status === 401 || error.message.includes('Authentication')) {
          setValidationError('auth_error');
        } else if (error.status === 404) {
          setValidationError('card_not_found');
        } else if (error.status === 403) {
          setValidationError('permission_denied');
        } else {
          setValidationError(`Failed to load team members: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
    loadOrganizationMembers();
  }, [card?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter members based on role permissions and project context
  const assignableMembers = currentUser
    ? getAssignableMembers(organizationMembers, userRole, currentUser.id, projectContext)
    : organizationMembers;

  const filteredMembers = assignableMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rolePermissions = getRolePermissions(userRole);
  const assignmentRestrictionMessage =
    getAssignmentRestrictionMessage(userRole);

  // Get assigned members from card assignments
  const assignedMembers = organizationMembers.filter((member) => {
    if (card.assignments && Array.isArray(card.assignments)) {
      return card.assignments.some(assignment => assignment.user_id === member.id);
    }
    // Fallback to assignedMembers array if assignments not available
    return card.assignedMembers?.includes(member.id);
  });

  const handleMemberToggle = async (memberId) => {
    // Validate assignment before making changes
    if (currentUser && !canAssignTaskToUser(userRole, currentUser.id, memberId, projectContext)) {
      setValidationError(`Cannot assign task to this member. ${getAssignmentRestrictionMessage(userRole)}`);
      return;
    }

    setAssignmentLoading(true);
    setValidationError(null);

    try {
      const isCurrentlyAssigned = assignedMembers.some(member => member.id === memberId);

      if (isCurrentlyAssigned) {
        // Unassign user
        const response = await realApiService.cards.unassignUser(card.id, memberId);
        if (response.success) {
          // Update local state by calling parent callback
          const updatedAssignments = card.assignments?.filter(assignment => assignment.user_id !== memberId) || [];
          onMembersChange(updatedAssignments);
        } else {
          setValidationError(response.error || 'Failed to unassign member');
        }
      } else {
        // Assign user
        const response = await realApiService.cards.assignUser(card.id, memberId);
        if (response.success) {
          // Update local state by calling parent callback
          const newAssignment = {
            user_id: memberId,
            assigned_at: new Date().toISOString(),
            assigned_by: currentUser.id
          };
          const updatedAssignments = [...(card.assignments || []), newAssignment];
          onMembersChange(updatedAssignments);
        } else {
          setValidationError(response.error || 'Failed to assign member');
        }
      }
    } catch (error) {
      console.error('Error toggling member assignment:', error);
      setValidationError('Failed to update assignment');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setAssignmentLoading(true);
    setValidationError(null);

    try {
      const response = await realApiService.cards.unassignUser(card.id, memberId);
      if (response.success) {
        // Update local state by calling parent callback
        const updatedAssignments = card.assignments?.filter(assignment => assignment.user_id !== memberId) || [];
        onMembersChange(updatedAssignments);
      } else {
        setValidationError(response.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setValidationError('Failed to remove member');
    } finally {
      setAssignmentLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-3'>
          <Icon name='Users' size={16} className='text-text-secondary' />
          <h4 className='font-medium text-text-primary'>Members</h4>
          {hasChanged && (
            <div className='flex items-center space-x-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-md'>
              <Icon name='Edit' size={12} />
              <span>Modified</span>
            </div>
          )}
        </div>

        {/* Validation Error Display */}
        {validationError && (
          <>
            {validationError === 'no_members_available' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Icon name="Users" size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">
                      No Team Members Available
                    </h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      There are no team members in your organization available for card assignment.
                      To assign members to cards, you'll need to invite team members to your organization first.
                    </p>
                    <button
                      onClick={() => {
                        // Navigate to team invitation page
                        window.location.href = '/organization-settings?tab=members';
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      <Icon name="UserPlus" size={16} className="mr-2" />
                      Invite Team Members
                    </button>
                  </div>
                </div>
              </div>
            ) : validationError === 'auth_error' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Icon name="Lock" size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">
                      Authentication Required
                    </h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Your session has expired. Please log in again to continue.
                    </p>
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 transition-colors"
                    >
                      <Icon name="LogIn" size={16} className="mr-2" />
                      Log In
                    </button>
                  </div>
                </div>
              </div>
            ) : validationError === 'card_not_found' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Icon name="AlertTriangle" size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800 mb-1">
                      Card Not Found
                    </h4>
                    <p className="text-sm text-red-700 mb-3">
                      This card may have been deleted or you don't have access to it.
                    </p>
                    <button
                      onClick={() => window.history.back()}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Icon name="ArrowLeft" size={16} className="mr-2" />
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            ) : validationError === 'permission_denied' ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Icon name="Shield" size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-800 mb-1">
                      Access Denied
                    </h4>
                    <p className="text-sm text-orange-700 mb-3">
                      You don't have permission to assign members to this card.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className='flex items-center space-x-2 px-3 py-2 bg-destructive/10 text-destructive text-sm rounded-md'>
                <Icon name='AlertCircle' size={14} />
                <span>{validationError}</span>
              </div>
            )}
          </>
        )}

        {canEdit && rolePermissions.canAssignTasksToSelf && (
          <div className='relative' ref={dropdownRef}>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={assignableMembers.length === 0 || loading || assignmentLoading}
              title={
                loading ? 'Loading members...' :
                assignableMembers.length === 0
                  ? 'No team members available. Invite members first.'
                  : 'Add member'
              }
            >
              {loading ? (
                <Icon name='Loader2' size={16} className='animate-spin' />
              ) : (
                <Icon name='Plus' size={16} />
              )}
            </Button>

            {isDropdownOpen && (
              <div className='absolute top-full right-0 mt-1 w-72 bg-popover border border-border rounded-md shadow-elevated z-1010'>
                <div className='p-3'>
                  <div className='relative mb-3'>
                    <Icon
                      name='Search'
                      size={16}
                      className='absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary'
                    />
                    <input
                      type='text'
                      placeholder='Search members...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='w-full pl-10 pr-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent'
                    />
                  </div>

                  {/* Role-based assignment restriction message */}
                  {!rolePermissions.canAssignTasksToOthers && (
                    <div className='mb-3 p-2 bg-muted/50 rounded-md'>
                      <div className='flex items-start space-x-2'>
                        <Icon
                          name='Info'
                          size={14}
                          className='text-text-secondary mt-0.5 flex-shrink-0'
                        />
                        <p className='text-xs text-text-secondary'>
                          {assignmentRestrictionMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className='max-h-48 overflow-y-auto space-y-1'>
                    {loading ? (
                      <div className='text-center py-4 text-text-secondary text-sm'>
                        <Icon name='Loader2' size={16} className='animate-spin mx-auto mb-2' />
                        Loading team members...
                      </div>
                    ) : filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => {
                        const isAssigned = assignedMembers.some(assignedMember => assignedMember.id === member.id);
                        return (
                          <button
                            key={member.id}
                            onClick={() => handleMemberToggle(member.id)}
                            disabled={assignmentLoading}
                            className='w-full flex items-center space-x-3 p-2 rounded-md hover:bg-muted transition-micro text-left disabled:opacity-50 disabled:cursor-not-allowed'
                          >
                            <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-medium text-white'>
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div className='font-medium text-text-primary truncate'>
                                {member.name}
                              </div>
                              <div className='text-xs text-text-secondary truncate'>
                                {member.role} • {member.email}
                              </div>
                            </div>
                            {assignmentLoading ? (
                              <Icon name='Loader2' size={16} className='animate-spin text-text-secondary' />
                            ) : isAssigned && (
                              <Icon
                                name='Check'
                                size={16}
                                className='text-success'
                              />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className='text-center py-4 text-text-secondary text-sm'>
                        {assignableMembers.length === 0 ? (
                          <div className='space-y-2'>
                            <Icon name='Users' size={24} className='mx-auto text-text-secondary' />
                            <p>No team members available</p>
                            <p className='text-xs'>Invite members to your organization first</p>
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            <Icon name='Search' size={24} className='mx-auto text-text-secondary' />
                            <p>No members found</p>
                            <p className='text-xs'>Try adjusting your search</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className='space-y-2'>
        {assignedMembers.length > 0 ? (
          assignedMembers.map((member) => (
            <div
              key={member.id}
              className='flex items-center justify-between p-2 bg-muted rounded-md'
            >
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm font-medium text-white'>
                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className='font-medium text-text-primary text-sm'>
                    {member.name}
                  </div>
                  <div className='text-xs text-text-secondary'>
                    {member.role}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={assignmentLoading}
                  className='text-text-secondary hover:text-destructive disabled:opacity-50'
                  title='Remove member'
                >
                  {assignmentLoading ? (
                    <Icon name='Loader2' size={14} className='animate-spin' />
                  ) : (
                    <Icon name='X' size={14} />
                  )}
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className='text-text-secondary text-sm italic'>
            No members assigned
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberAssignment;
