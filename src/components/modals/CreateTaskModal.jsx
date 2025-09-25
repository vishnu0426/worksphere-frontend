import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  validateTaskAssignment,
  handleError,
  displayError,
} from '../../utils/errorHandling';
import { getAssignableMembers } from '../../utils/rolePermissions';
import { generateAIChecklist } from '../../utils/aiChecklistService';
import authService from '../../utils/authService';
import apiService from '../../utils/apiService';
import notificationService from '../../utils/notificationService';
import teamService from '../../utils/teamService';
import sessionService from '../../utils/sessionService';

const CreateTaskModal = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
  project,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: [],
    dueDate: '',
    labels: [],
    checklist: [],
    columnId: '', // Will be set to first available column
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [aiChecklistGenerated, setAiChecklistGenerated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [members, setMembers] = useState([]);
  const [columns, setColumns] = useState([]);

  // Load user data and project members
  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 CreateTaskModal useEffect triggered:', { isOpen, projectId });

      if (!isOpen || !projectId) {
        console.log('⏭️ Skipping data load - modal closed or no projectId');
        return;
      }

      try {
        // Load current user
        const userResult = await authService.getCurrentUser();
        if (userResult.data?.user) {
          setCurrentUser(userResult.data.user);
          setUserRole(userResult.data.user.role || 'member');
        }

        // Load project members from organization
        if (projectId) {
          try {
            // Get current organization from session
            const currentOrganization = sessionService.getCurrentOrganization();
            if (currentOrganization?.id) {
              console.log('Loading team members for organization:', currentOrganization.id);

              // Get active team members
              const teamMembers = await teamService.getTeamMembers(currentOrganization.id);
              console.log('Team members loaded:', teamMembers);

              if (teamMembers && Array.isArray(teamMembers)) {
                setMembers(teamMembers);
              } else {
                console.warn('No team members found, using empty array');
                setMembers([]);
              }
            } else {
              console.warn('No current organization found, using empty members array');
              setMembers([]);
            }
          } catch (memberError) {
            console.error('Failed to load team members:', memberError);
            // Set empty array on error to prevent UI issues
            setMembers([]);
          }

          // Load project boards and columns using Kanban API for better board creation
          try {
            console.log('🔄 Loading/creating board for project:', projectId);

            // Use the Kanban API service which has get-or-create functionality
            const kanbanApi = (await import('../../utils/kanbanApiService')).default;

            try {
              // This will create a board with default columns if none exists
              const boardResponse = await kanbanApi.board.getOrCreateForProject(projectId);
              console.log('📋 Board response from Kanban API:', boardResponse);

              if (boardResponse && (boardResponse.id || boardResponse.data?.id)) {
                const boardData = boardResponse.data || boardResponse;
                const boardId = boardData.id;
                console.log('✅ Board found/created:', boardId);

                // Now get columns for this board
                try {
                  const boardColumns = await apiService.columns.getByBoard(boardId);
                  console.log('📊 Columns loaded for board:', boardColumns);

                  if (boardColumns && Array.isArray(boardColumns) && boardColumns.length > 0) {
                    // Ensure columns have proper title/name properties
                    const normalizedColumns = boardColumns.map(col => ({
                      ...col,
                      title: col.title || col.name || 'Untitled',
                      name: col.name || col.title || 'Untitled'
                    }));

                    console.log('✅ Setting normalized columns:', normalizedColumns);
                    setColumns(normalizedColumns);

                    // Set default column to first column (usually "To Do")
                    setFormData((prev) => ({
                      ...prev,
                      columnId: normalizedColumns[0].id,
                    }));
                    console.log('✅ Default column set:', normalizedColumns[0]);
                  } else {
                    console.warn('⚠️ No columns found after board creation, creating default columns...');

                    // Create default columns manually
                    const defaultColumns = [
                      { name: 'To-Do', position: 0 },
                      { name: 'In Progress', position: 1 },
                      { name: 'Review', position: 2 },
                      { name: 'Done', position: 3 }
                    ];

                    const createdColumns = [];
                    for (const colData of defaultColumns) {
                      try {
                        const newCol = await apiService.columns.create(boardId, colData);
                        createdColumns.push(newCol);
                        console.log('✅ Created column:', newCol);
                      } catch (createError) {
                        console.error('❌ Failed to create column:', colData.name, createError);
                      }
                    }

                    if (createdColumns.length > 0) {
                      const normalizedColumns = createdColumns.map(col => ({
                        ...col,
                        title: col.title || col.name || 'Untitled',
                        name: col.name || col.title || 'Untitled'
                      }));

                      setColumns(normalizedColumns);
                      setFormData((prev) => ({
                        ...prev,
                        columnId: normalizedColumns[0].id,
                      }));
                      console.log('✅ Set manually created columns:', normalizedColumns);
                    } else {
                      console.error('❌ Failed to create any columns');
                      setColumns([]);
                    }
                  }
                } catch (columnError) {
                  console.error('❌ Failed to load columns for board:', boardId, columnError);
                  setColumns([]);
                }
              } else {
                console.error('❌ Failed to get/create board for project:', projectId);
                setColumns([]);
              }
            } catch (kanbanError) {
              console.error('❌ Kanban API failed, falling back to regular board API:', kanbanError);

              // Fallback to regular board API
              const boards = await apiService.boards.getByProject(projectId);
              console.log('📋 Fallback boards loaded:', boards);

              if (boards && boards.length > 0) {
                const boardId = boards[0].id;
                const boardColumns = await apiService.columns.getByBoard(boardId);

                if (boardColumns && Array.isArray(boardColumns) && boardColumns.length > 0) {
                  const normalizedColumns = boardColumns.map(col => ({
                    ...col,
                    title: col.title || col.name || 'Untitled',
                    name: col.name || col.title || 'Untitled'
                  }));
                  setColumns(normalizedColumns);
                  setFormData((prev) => ({
                    ...prev,
                    columnId: normalizedColumns[0].id,
                  }));
                } else {
                  setColumns([]);
                }
              } else {
                console.warn('⚠️ No boards found and fallback failed for project:', projectId);
                setColumns([]);
              }
            }
          } catch (error) {
            console.error('❌ Complete failure to load boards/columns:', error);
            console.error('Error details:', error.message, error.stack);
            setColumns([]);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, projectId]);

  const handleInputChange = (field, value) => {
    // Validate task assignments in real-time
    if (field === 'assignedTo' && currentUser) {
      const invalidAssignments = value.filter((userId) => {
        const validationError = validateTaskAssignment(
          userRole,
          userId,
          currentUser.id
        );
        return validationError !== null;
      });

      if (invalidAssignments.length > 0) {
        const error = validateTaskAssignment(
          userRole,
          invalidAssignments[0],
          currentUser.id
        );
        displayError(error);
        return; // Don't update the field if assignment is invalid
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleAISuggestion = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a task title first.');
      return;
    }

    console.log('Starting AI suggestion generation for:', formData.title);
    setIsGeneratingChecklist(true);

    try {
      // Generate AI checklist
      const checklistResult = await generateAIChecklist(
        formData.title,
        formData.description,
        formData.priority,
        'general' // Could be determined from project context
      );

      console.log('AI checklist result:', checklistResult);

      if (checklistResult.success) {
        console.log('Generated checklist items:', checklistResult.items);
        setFormData((prev) => ({
          ...prev,
          checklist: checklistResult.items || [],
        }));
        setAiChecklistGenerated(true);
      } else {
        console.error('AI checklist generation failed:', checklistResult.error);
        alert('Failed to generate AI suggestions. Please try again.');
      }
    } catch (error) {
      console.error('AI checklist generation error:', error);
      alert('Failed to generate AI suggestions. Please try again.');
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.columnId) {
      newErrors.columnId = 'Please select a column';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        id: Date.now().toString(),
        columnId: formData.columnId,
        column_id: formData.columnId, // For backend API
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        position: 0, // Add position for backend
        assignedTo: formData.assignedTo,
        assigned_to: formData.assignedTo, // For backend API
        dueDate: formData.dueDate || null,
        due_date: formData.dueDate || null, // For backend API
        labels: formData.labels.map((labelValue) => {
          const labelData = [
            { value: 'bug', label: 'Bug', color: '#ef4444' },
            { value: 'feature', label: 'Feature', color: '#3b82f6' },
            { value: 'improvement', label: 'Improvement', color: '#10b981' },
            {
              value: 'documentation',
              label: 'Documentation',
              color: '#f59e0b',
            },
            { value: 'testing', label: 'Testing', color: '#8b5cf6' },
          ].find((l) => l.value === labelValue);
          return {
            id: labelValue,
            name: labelData?.label || labelValue,
            color: labelData?.color || '#6b7280',
          };
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        checklist: formData.checklist || [],
        comments: [],
        attachments: [],
      };

      // Create task via API
      console.log('🎯 Creating task with data:', taskData);
      const result = await apiService.cards.create(
        taskData.column_id,
        taskData
      );
      console.log('✅ Task created via API:', result);

      // Send notifications for task assignments
      if (taskData.assignedTo && taskData.assignedTo.length > 0) {
        try {
          for (const assigneeId of taskData.assignedTo) {
            if (assigneeId !== currentUser?.id) {
              // Don't notify self
              await notificationService.notifyTaskAssigned(
                taskData,
                assigneeId,
                currentUser?.id
              );
            }
          }
        } catch (notificationError) {
          console.error(
            'Failed to send task assignment notifications:',
            notificationError
          );
        }
      }

      // Call the callback to refresh the parent component
      if (onTaskCreated) {
        onTaskCreated(result.data || taskData);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      handleError(error, 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: [],
      dueDate: '',
      labels: [],
      checklist: [],
      columnId: columns.length > 0 ? columns[0].id : '',
    });
    setErrors({});
    setAiChecklistGenerated(false);
    setIsGeneratingChecklist(false);
    onClose();
  };

  if (!isOpen) return null;

  // Show loading state if no columns are loaded yet
  const isLoadingColumns = isOpen && projectId && columns.length === 0;

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const labelOptions = [
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'testing', label: 'Testing' },
  ];

  const assigneeOptions = getAssignableMembers(
    members,
    userRole,
    currentUser?.id
  ).map((member) => ({
    value: member.id,
    label: member.name,
  }));

  const columnOptions = columns.map((column) => ({
    value: column.id,
    label: column.title || column.name || 'Untitled',
  }));

  // Debug logging for column loading issues
  console.log('🔍 CreateTaskModal Debug:', {
    isOpen,
    projectId,
    columnsCount: columns.length,
    columns: columns.map(c => ({ id: c.id, name: c.name, title: c.title })),
    columnOptions: columnOptions,
    formDataColumnId: formData.columnId
  });

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={handleClose}
      />

      {/* Modal */}
      <div className='relative bg-surface rounded-lg shadow-focused w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-border'>
          <h2 className='text-lg font-semibold text-text-primary'>
            Create New Task
          </h2>
          <Button variant='ghost' size='icon' onClick={handleClose}>
            <Icon name='X' size={20} />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <Input
            label='Task Title'
            type='text'
            placeholder='Enter task title...'
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={errors.title}
            required
          />

          {/* AI Suggestion Button */}
          <div className='flex justify-end -mt-2 mb-2'>
            <button
              type='button'
              onClick={handleAISuggestion}
              disabled={isGeneratingChecklist || !formData.title.trim()}
              className='flex items-center space-x-2 px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
            >
              {isGeneratingChecklist ? (
                <>
                  <Icon name='Loader2' size={12} className='animate-spin' />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Icon name='Sparkles' size={12} />
                  <span>✨ AI Suggestions</span>
                </>
              )}
            </button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Select
              label='Priority'
              options={priorityOptions}
              value={formData.priority}
              onChange={(value) => handleInputChange('priority', value)}
            />

            <Select
              label='Column'
              options={columnOptions}
              value={formData.columnId}
              onChange={(value) => handleInputChange('columnId', value)}
              error={errors.columnId}
              required
              loading={isLoadingColumns}
              placeholder={isLoadingColumns ? "Loading columns..." : "Select a column"}
            />
          </div>

          <Input
            label='Description'
            type='textarea'
            placeholder='Enter task description...'
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Input
              label='Due Date'
              type='date'
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
            />

            <Select
              label='Assignees'
              options={assigneeOptions}
              value={formData.assignedTo}
              onChange={(value) =>
                handleInputChange(
                  'assignedTo',
                  Array.isArray(value) ? value : [value]
                )
              }
              multiple
            />
          </div>

          <Select
            label='Labels'
            options={labelOptions}
            value={formData.labels}
            onChange={(value) =>
              handleInputChange(
                'labels',
                Array.isArray(value) ? value : [value]
              )
            }
            multiple
          />

          {/* AI Generated Checklist */}
          {aiChecklistGenerated && formData.checklist.length > 0 && (
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-text-primary'>
                ✨ AI Generated Checklist
              </label>
              <div className='space-y-2 p-3 bg-muted/50 rounded-md'>
                {formData.checklist.map((item, index) => (
                  <div key={index} className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      checked={item.completed || false}
                      onChange={(e) => {
                        const updatedChecklist = [...formData.checklist];
                        updatedChecklist[index] = {
                          ...item,
                          completed: e.target.checked,
                        };
                        handleInputChange('checklist', updatedChecklist);
                      }}
                      className='rounded border-border'
                    />
                    <span className='text-sm text-text-primary'>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className='flex items-center justify-end space-x-3 pt-4 border-t border-border'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icon
                    name='Loader2'
                    size={16}
                    className='animate-spin mr-2'
                  />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
