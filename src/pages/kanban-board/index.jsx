import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import RoleBasedHeader from '../../components/ui/RoleBasedHeader';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import BoardHeader from './components/BoardHeader';
import BoardColumn from './components/BoardColumn';

import AddCardModal from './components/AddCardModal';
import AddColumnModal from './components/AddColumnModal';
import InviteMemberModal from './components/InviteMemberModal';
import { useUserProfile } from '../../hooks/useUserProfile';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import teamService from '../../utils/teamService';

const KanbanBoard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { currentOrganization, userProfile } = useUserProfile();
  const { toasts, showToast, hideToast } = useToast();

  // User state and role - simplified to use single source of truth
  const [currentUser, setCurrentUser] = useState(null);

  // Get user role from current organization (primary) or user profile (fallback)
  const userRole = currentOrganization?.role || userProfile?.role || 'member';

  // Debug role detection
  useEffect(() => {
    console.log('🔍 KANBAN ROLE DEBUG:', {
      currentOrganization: currentOrganization?.role,
      userProfile: userProfile?.role,
      finalRole: userRole
    });
  }, [currentOrganization, userProfile, userRole]);

  // Project context - get from location state or default
  const [currentProject] = useState(() => {
    const locationState = window.location.state;
    return locationState?.projectId
      ? {
          id: locationState.projectId,
          name: 'Current Project',
          memberRole: 'assigned', // This would come from API
        }
      : {
          id: 1,
          name: 'Website Redesign',
          memberRole: 'assigned', // assigned, not-assigned
        };
  });

  // Check if current user is assigned to this project
  const isUserAssignedToProject = () => {
    // For members, check if they're assigned to this specific project
    if (userRole === 'member') {
      return currentProject.memberRole === 'assigned';
    }
    // Admins and owners have access to all projects
    return ['admin', 'owner'].includes(userRole);
  };

  // Mock data
  const [board] = useState({
    id: 'board-1',
    title: 'Project Management Board',
    description: 'Main project tracking board for Q4 initiatives',
    isPrivate: false,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-28T05:54:23Z',
  });

  // Real members data - will be loaded from team service
  const [members, setMembers] = useState([]);

  // Initialize with empty columns - will be loaded from backend
  const [columns, setColumns] = useState([]);
  // Current board id (needed when creating columns) - initialize with board.id
  const [boardId, setBoardId] = useState(board.id);

  // Initialize with empty cards - will be loaded from backend
  const [cards, setCards] = useState(() => {
    // Try to restore cards from localStorage as fallback
    try {
      const savedCards = localStorage.getItem('kanban-cards');
      return savedCards ? JSON.parse(savedCards) : [];
    } catch (error) {
      console.error('Error loading cards from localStorage:', error);
      return [];
    }
  });

  // Ensure boardId is set when component mounts
  useEffect(() => {
    if (board && board.id && !boardId) {
      setBoardId(board.id);
      console.log('✅ Board ID set to:', board.id);
    }
  }, [board, boardId]);

  // Modal states
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh function to reload board data
  const refreshBoard = useCallback(async () => {
    console.log('🔄 Refreshing board data...');
    setIsLoading(true);
    setError(null);

    // Trigger a re-load by updating a dependency
    const timeoutId = setTimeout(() => {
      window.location.reload(); // Simple but effective refresh
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  // Load user data via unified profile hook
  useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
    }
  }, [userProfile]);

  // Check for card save/delete success notifications
  useEffect(() => {
    const locationState = window.history.state?.usr;

    if (locationState?.cardSaved && locationState?.savedCardTitle) {
      showToast(
        `Card "${locationState.savedCardTitle}" was saved successfully!`,
        'success',
        4000
      );

      // Clear the state to prevent showing the notification again
      window.history.replaceState(
        { ...window.history.state, usr: { ...locationState, cardSaved: false } },
        '',
        window.location.pathname + window.location.search
      );
    }

    if (locationState?.cardDeleted && locationState?.deletedCardTitle) {
      showToast(
        `Card "${locationState.deletedCardTitle}" was deleted successfully!`,
        'success',
        4000
      );

      // Clear the state to prevent showing the notification again
      window.history.replaceState(
        { ...window.history.state, usr: { ...locationState, cardDeleted: false } },
        '',
        window.location.pathname + window.location.search
      );
    }
  }, [showToast]);

  // Helper function to load cards for columns (supports both full reload and partial reload)
  const loadCardsForColumns = useCallback(async (columnsToLoad, apiService = null, replaceAll = true) => {
    if (!columnsToLoad || columnsToLoad.length === 0) return;

    console.log('🔄 Loading cards for columns:', columnsToLoad.map(c => ({ id: c.id, title: c.title })));

    try {
      const kanbanApi = apiService || (await import('../../utils/kanbanApiService')).default;
      let newCards = [];

      for (const column of columnsToLoad) {
        try {
          console.log(`🔧 Loading cards for column: ${column.id} (${column.title || column.name})`);
          const cardsResponse = await kanbanApi.columns.getCards(column.id);
          const cards = cardsResponse?.data || [];

          if (Array.isArray(cards) && cards.length > 0) {
            const transformedCards = cards.map(card =>
              kanbanApi.utils.transformCardData({ data: card })
            ).filter(Boolean);

            newCards = [...newCards, ...transformedCards];
            console.log(`✅ Loaded ${transformedCards.length} cards from column ${column.id}`);
          } else {
            console.log(`📭 No cards found for column ${column.id}`);
          }
        } catch (columnError) {
          console.error(`❌ Error loading cards for column ${column.id}:`, columnError);
        }
      }

      // Update cards state - either replace all or merge with existing
      if (replaceAll) {
        setCards(newCards);
        console.log('✅ All cards replaced:', newCards);
      } else {
        // Partial update - replace cards from these specific columns only
        setCards(prevCards => {
          const columnIds = columnsToLoad.map(col => col.id);
          const otherCards = prevCards.filter(card => !columnIds.includes(card.columnId));
          const updatedCards = [...otherCards, ...newCards];
          console.log('✅ Cards partially updated:', updatedCards);
          return updatedCards;
        });
      }

      // Save to localStorage as backup
      try {
        if (replaceAll) {
          localStorage.setItem('kanban-cards', JSON.stringify(newCards));
        }
      } catch (error) {
        console.error('Error saving cards to localStorage:', error);
      }
    } catch (error) {
      console.error('❌ Error loading cards:', error);
    }
  }, []);

  // Load boards and columns for current project, robust to navigation/reload
  useEffect(() => {
    const loadBoardsAndColumns = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isAuthenticated) {
          console.log('User not authenticated, clearing board state');
          setColumns([]);
          setBoardId(null);
          setCards([]);
          setIsLoading(false);
          // Clear localStorage backup when not authenticated
          try {
            localStorage.removeItem('kanban-cards');
          } catch (error) {
            console.error('Error clearing localStorage:', error);
          }
          return;
        }

        console.log('🚀 Loading Kanban board for authenticated user');
        const apiService = (await import('../../utils/apiService')).default;
        const kanbanApi = (await import('../../utils/kanbanApiService')).default;

        // Always fetch projects for the authenticated user from backend
        console.log('🔍 Fetching projects...');
        const projects = await apiService.projects.getAll();
        console.log('🔍 Projects response:', projects);

        if (!projects || projects.length === 0) {
          console.log('❌ No projects found');
          setColumns([]);
          setBoardId(null);
          setCards([]);
          setIsLoading(false);
          setError('No projects found. Please create a project first.');
          return;
        }

        // Use first available project (or prompt user in future)
        const currentProjectId = projects[0].id;
        console.log('✅ Using project:', currentProjectId, '- Name:', projects[0].name);

        // Get or create board for the project using new Kanban API
        console.log('🔧 Getting/creating board for project...');
        const boardResponse = await kanbanApi.board.getOrCreateForProject(currentProjectId);
        const boardData = kanbanApi.utils.transformBoardData(boardResponse);

        if (!boardData) {
          console.log('❌ Failed to get/create board');
          setColumns([]);
          setBoardId(null);
          setCards([]);
          setIsLoading(false);
          setError('Failed to load board. Please try refreshing the page.');
          return;
        }

        console.log('✅ Board loaded:', boardData);
        setBoardId(boardData.id);

        // Load team members for the current organization
        try {
          if (currentOrganization?.id) {
            console.log('🔍 Loading team members for organization:', currentOrganization.id);
            const teamMembers = await teamService.getTeamMembers(currentOrganization.id);
            console.log('✅ Team members loaded:', teamMembers);

            if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
              setMembers(teamMembers);
              console.log('✅ Team members set in state:', teamMembers.length, 'members');
            } else {
              console.warn('⚠️ No team members found or empty array returned');
              setMembers([]);

              // Try to reload team members after a short delay
              setTimeout(async () => {
                try {
                  console.log('🔄 Retrying team members load...');
                  const retryMembers = await teamService.getTeamMembers(currentOrganization.id);
                  if (retryMembers && Array.isArray(retryMembers) && retryMembers.length > 0) {
                    console.log('✅ Team members loaded on retry:', retryMembers.length);
                    setMembers(retryMembers);
                  }
                } catch (retryError) {
                  console.error('❌ Retry failed:', retryError);
                }
              }, 2000);
            }
          } else {
            console.warn('⚠️ No current organization found, using empty members array');
            setMembers([]);
          }
        } catch (memberError) {
          console.error('❌ Failed to load team members:', memberError);
          console.error('Error details:', memberError.message, memberError.stack);
          // Set empty array on error to prevent UI issues
          setMembers([]);
        }

        // Set columns from board data
        if (boardData.columns && boardData.columns.length > 0) {
          const sortedColumns = boardData.columns
            .map(column => ({
              ...column,
              title: column.title || column.name || 'Untitled',
              name: column.name || column.title || 'Untitled'
            }))
            .sort((a, b) => (a.order || a.position || 0) - (b.order || b.position || 0));
          setColumns(sortedColumns);
          console.log('✅ Columns loaded:', sortedColumns);

          // Load cards for each column
          await loadCardsForColumns(sortedColumns, kanbanApi, true);
          setIsLoading(false);
        } else {
          console.log('⚠️ No columns found in board');
          setColumns([]);
          setCards([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading boards and columns:', error);
        setIsLoading(false);
        setError(`Failed to load board: ${error.message || 'Unknown error'}`);
        // Don't clear existing state on error - this prevents data loss on temporary network issues
        console.log('Keeping existing board state due to error');
      }
    };
    
    // Add a small delay to ensure authentication state is stable
    const timeoutId = setTimeout(loadBoardsAndColumns, 50);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]);

  // Listen for real-time task updates via WebSocket
  useEffect(() => {
    if (!currentProject?.id || !isAuthenticated) return;

    let cleanup = () => {};

    try {
      // Dynamically import WebSocket service to avoid issues if not available
      const setupWebSocket = async () => {
        try {
          const websocketModule = await import('../../utils/websocketService.js');
          const websocketService = websocketModule.default || websocketModule;

          const handleTaskUpdate = (data) => {
            console.log('🔄 Received task update via WebSocket in Kanban:', data);

            // Check if this update is for our current project
            if (data.payload?.project_id === currentProject?.id) {
              console.log('🎯 Task update is for current project, reloading cards...');
              // Reload cards for all columns to get the latest data
              if (columns.length > 0) {
                loadCardsForColumns(columns, null, true);
              }
            } else {
              console.log('🔍 Task update for different project:', data.payload?.project_id, 'vs current:', currentProject?.id);
            }
          };

          // Listen for task updates
          websocketService.on('task_update', handleTaskUpdate);

          // Join the project room for real-time updates
          websocketService.joinProject(currentProject?.id);

          cleanup = () => {
            websocketService.off('task_update', handleTaskUpdate);
          };
        } catch (wsError) {
          console.warn('WebSocket service not available for real-time updates:', wsError);
        }
      };

      setupWebSocket();
    } catch (error) {
      console.warn('Failed to set up WebSocket listeners:', error);
    }

    return cleanup;
  }, [currentProject?.id, isAuthenticated, columns, loadCardsForColumns]);

  // Periodic refresh to ensure cards created via API are displayed
  useEffect(() => {
    if (!isAuthenticated || columns.length === 0) return;

    // Set up periodic refresh every 30 seconds to catch API-created cards
    const refreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh: checking for new cards...');
      loadCardsForColumns(columns, null, true);
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, columns, loadCardsForColumns]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (columns.length > 0) {
      console.log('🔄 Manual refresh triggered');
      setIsLoading(true);
      try {
        await loadCardsForColumns(columns, null, true);
        console.log('✅ Manual refresh completed');
      } catch (error) {
        console.error('❌ Manual refresh failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Role-based and project-based permission checks
  const canCreateCards = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  const canEditCards = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  const canDeleteCards = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  const canCreateColumns = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  const canEditColumns = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  const canDeleteColumns = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  const canInviteMembers = () => {
    return ['admin', 'owner'].includes(userRole);
  };

  const canDragCards = () => {
    if (userRole === 'viewer') return false;
    return isUserAssignedToProject();
  };

  // Note: Card loading is handled by the main loadCardsForColumns function above
  // This prevents duplicate API calls and ensures consistency

  // Filter cards based on search and filters
  const filteredCards = cards.filter((card) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        card.title.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        card.labels?.some((label) => label.name.toLowerCase().includes(query));

      if (!matchesSearch) return false;
    }

    // Priority filter
    if (activeFilters.priority?.length > 0) {
      if (!activeFilters.priority.includes(card.priority)) return false;
    }

    // Assignee filter
    if (activeFilters.assignee?.length > 0) {
      const hasAssignee = card.assignedTo?.some((assigneeId) =>
        activeFilters.assignee.includes(assigneeId)
      );
      if (!hasAssignee) return false;
    }

    // Due date filter
    if (activeFilters.dueDate?.length > 0) {
      const today = new Date();
      const cardDueDate = card.dueDate ? new Date(card.dueDate) : null;

      const matchesDueDate = activeFilters.dueDate.some((filter) => {
        if (filter === 'overdue') {
          return cardDueDate && cardDueDate < today;
        }
        if (filter === 'today') {
          return (
            cardDueDate && cardDueDate.toDateString() === today.toDateString()
          );
        }
        if (filter === 'this-week') {
          const weekFromNow = new Date(
            today.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          return (
            cardDueDate && cardDueDate >= today && cardDueDate <= weekFromNow
          );
        }
        if (filter === 'this-month') {
          const monthFromNow = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
          );
          return (
            cardDueDate && cardDueDate >= today && cardDueDate <= monthFromNow
          );
        }
        if (filter === 'custom' && activeFilters.customDateRange) {
          const startDate = new Date(activeFilters.customDateRange.start);
          const endDate = new Date(activeFilters.customDateRange.end);
          return (
            cardDueDate && cardDueDate >= startDate && cardDueDate <= endDate
          );
        }
        return false;
      });

      if (!matchesDueDate) return false;
    }

    return true;
  });

  // Handle card movement between columns
  const handleCardMove = async (cardId, sourceColumnId, targetColumnId) => {
    // Check if user can drag cards
    if (!canDragCards()) {
      if (userRole === 'viewer') {
        console.log('Viewers cannot move cards');
      } else {
        console.log('You can only move cards in projects you are assigned to');
      }
      return;
    }

    try {
      console.log(`🔧 Moving card ${cardId} from ${sourceColumnId} to ${targetColumnId}`);

      // Use new Kanban API for card movement
      const kanbanApi = (await import('../../utils/kanbanApiService')).default;
      await kanbanApi.cards.move(cardId, targetColumnId);

      console.log('✅ Card moved successfully, reloading cards...');

      // Reload cards for all columns to ensure consistency
      await loadCardsForColumns(columns, kanbanApi, true);
    } catch (error) {
      console.error('❌ Failed to move card:', error);
      alert(`Failed to move card: ${error.message}`);
    }
  };

  // Handle card click - navigate to card details
  const handleCardClick = (card) => {
    console.log('Navigating to card details:', card);

    // Navigate with card data in state and URL params
    navigate(`/card-details?id=${card.id}`, {
      state: {
        card: card,
        members: members,
        returnPath: '/kanban-board',
      },
    });
  };

  // Handle adding new card
  const handleAddCard = (columnId) => {
    // Check authentication first
    if (!isAuthenticated) {
      console.log('Please log in to create cards');
      // Optionally redirect to login page
      navigate('/login');
      return;
    }

    if (!canCreateCards()) {
      if (userRole === 'viewer') {
        console.log('Viewers cannot create cards');
      } else {
        console.log(
          'You can only create cards in projects you are assigned to'
        );
      }
      return;
    }
    console.log('Opening AddCardModal for column ID:', columnId);
    setSelectedColumnId(columnId);
    setShowAddCardModal(true);
  };

  const handleSaveCard = async (newCard) => {
    try {
      // Choose a valid target column (prefer explicit, then selected, then first available)
      const chosenColumnId =
        newCard.columnId ||
        newCard.column_id ||
        selectedColumnId ||
        columns[0]?.id;
      if (!chosenColumnId) {
        alert('No column available. Please create a column first.');
        return;
      }

      console.log('🔧 Creating card in column:', chosenColumnId);
      console.log('🔧 Card data:', newCard);

      // Use the Kanban API service consistently
      const kanbanApi = (await import('../../utils/kanbanApiService')).default;

      // Transform frontend card data to backend format
      const cardData = kanbanApi.utils.transformCardToBackend(newCard);

      // Create card using new API
      const result = await kanbanApi.cards.create(chosenColumnId, cardData);

      console.log('✅ Card created successfully:', result);

      // Transform the created card to frontend format
      const createdCard = kanbanApi.utils.transformCardData(result);

      if (createdCard && createdCard.id) {
        // Add to UI immediately
        setCards((prev) => [...prev, createdCard]);
        console.log('✅ Card added to UI:', createdCard);

        // Schedule a refresh to ensure all cards are synced (including those created via API)
        setTimeout(() => {
          console.log('🔄 Refreshing board to sync with backend after card creation...');
          const column = columns.find(col => col.id === chosenColumnId);
          if (column) {
            loadCardsForColumns([column], kanbanApi, false);
          }
        }, 2000);
      } else {
        console.warn('⚠️ Invalid card data returned, will reload cards');
        // Reload cards for the column to ensure consistency
        const column = columns.find(col => col.id === chosenColumnId);
        if (column) {
          await loadCardsForColumns([column], kanbanApi, false);
        }
      }

      // Send notifications for task assignments (best-effort)
      if (createdCard?.assignments?.length) {
        try {
          const notificationService = (
            await import('../../utils/notificationService')
          ).default;
          for (const assignment of createdCard.assignments) {
            if (assignment.user_id !== currentUser?.id) {
              await notificationService.notifyTaskAssigned(
                createdCard,
                assignment.user_id,
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
    } catch (error) {
      const errorMsg =
        error?.message ||
        'Failed to create card. Please check your connection and try again.';
      console.error('Create card failed:', errorMsg, error);
      alert(`Failed to create card: ${errorMsg}`);
    }
  };

  // Handle adding new column
  const handleSaveColumn = async (newColumn) => {
    if (!canCreateColumns()) {
      if (userRole === 'viewer') {
        console.log('Viewers cannot create columns');
      } else {
        console.log(
          'You can only create columns in projects you are assigned to'
        );
      }
      return;
    }

    // Check if board is loaded
    if (!boardId) {
      console.error('❌ Cannot create column: Board not loaded yet');
      alert('Please wait for the board to load before creating columns');
      return;
    }

    try {
      console.log('🔧 Creating column:', newColumn, 'for board:', boardId);

      // Use new Kanban API to create column
      const kanbanApi = (await import('../../utils/kanbanApiService')).default;
      const result = await kanbanApi.columns.create(boardId, {
        name: newColumn.title || newColumn.name,
        color: newColumn.color || '#E5E7EB'
      });

      const createdColumn = result?.data || result;
      console.log('✅ Column created via API:', createdColumn);

      if (createdColumn && createdColumn.id) {
        // Add the backend-created column to frontend state
        const frontendColumn = {
          id: createdColumn.id,
          title: createdColumn.name || createdColumn.title || 'Untitled',
          name: createdColumn.name || createdColumn.title || 'Untitled',
          status: 'todo',
          order: createdColumn.position || createdColumn.order || 0,
          position: createdColumn.position || createdColumn.order || 0,
          color: createdColumn.color || '#E5E7EB'
        };
        setColumns((prevColumns) => [...prevColumns, frontendColumn]);
        console.log('✅ Column added to UI:', frontendColumn);
      } else {
        alert('Failed to create column: Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Failed to create column:', error);

      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error.message.includes('500')) {
        errorMessage = 'Server error - please try again in a moment';
      } else if (error.message.includes('403')) {
        errorMessage = 'You do not have permission to create columns';
      } else if (error.message.includes('404')) {
        errorMessage = 'Board not found - please refresh the page';
      } else {
        errorMessage = error.message;
      }

      alert(`Failed to create column: ${errorMessage}`);
    }
  };

  // Handle column operations
  const handleEditColumn = (columnId, updates) => {
    if (!canEditColumns()) {
      if (userRole === 'viewer') {
        console.log('Viewers cannot edit columns');
      } else {
        console.log(
          'You can only edit columns in projects you are assigned to'
        );
      }
      return;
    }
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId
          ? { ...col, ...updates, updatedAt: new Date().toISOString() }
          : col
      )
    );
  };

  const handleDeleteColumn = async (columnId) => {
    if (!canDeleteColumns()) {
      if (userRole === 'viewer') {
        console.log('Viewers cannot delete columns');
      } else {
        console.log(
          'You can only delete columns in projects you are assigned to'
        );
      }
      return;
    }

    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this column? All cards in this column will be moved to the first column.')) {
      return;
    }

    try {
      console.log(`🔧 Deleting column ${columnId}`);

      // First, move cards from deleted column to first column if needed
      const firstColumnId = columns[0]?.id;
      const cardsToMove = cards.filter(card => card.columnId === columnId);

      if (firstColumnId && firstColumnId !== columnId && cardsToMove.length > 0) {
        console.log(`🔧 Moving ${cardsToMove.length} cards to first column before deletion`);

        // Use kanban API to move cards
        const kanbanApi = (await import('../../utils/kanbanApiService')).default;

        for (const card of cardsToMove) {
          try {
            await kanbanApi.cards.move(card.id, firstColumnId);
            console.log(`✅ Moved card ${card.id} to column ${firstColumnId}`);
          } catch (error) {
            console.error(`❌ Failed to move card ${card.id}:`, error);
          }
        }
      }

      // Delete the column via API
      const apiService = (await import('../../utils/apiService')).default;
      await apiService.columns.delete(columnId);

      console.log('✅ Column deleted successfully');

      // Update local state
      setColumns((prevColumns) =>
        prevColumns.filter((col) => col.id !== columnId)
      );

      // Update cards state to reflect moved cards
      if (firstColumnId && firstColumnId !== columnId) {
        setCards((prevCards) =>
          prevCards.map((card) =>
            card.columnId === columnId
              ? { ...card, columnId: firstColumnId }
              : card
          )
        );
      }

    } catch (error) {
      console.error('❌ Failed to delete column:', error);
      alert(`Failed to delete column: ${error.message}`);
    }
  };

  // Handle member invitation
  const handleMemberInvite = () => {
    if (!canInviteMembers()) {
      console.log('Only admins and owners can invite members');
      return;
    }
    setShowInviteMemberModal(true);
  };

  const handleSendInvitation = (invitation) => {
    console.log('Invitation sent:', invitation);
    // In real app, this would send the invitation via API
  };

  // Handle board updates
  const handleBoardUpdate = (updates) => {
    console.log('Board updated:', updates);
    // In real app, this would update the board via API
  };

  // Get cards for a specific column
  const getCardsForColumn = (columnId) => {
    return filteredCards.filter((card) => card.columnId === columnId);
  };

  // Show login prompt if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4'>
            <Icon name='Kanban' size={32} className='text-primary-foreground' />
          </div>
          <h1 className='text-2xl font-bold text-foreground mb-2'>
            Authentication Required
          </h1>
          <p className='text-muted-foreground mb-6'>
            Please log in to access the project management board.
          </p>
          <Button onClick={() => navigate('/login')} className='px-6 py-2'>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className='min-h-screen bg-background'>
        <RoleBasedHeader
          userRole={userRole.toLowerCase()}
          currentUser={
            currentUser
              ? {
                  name: `${currentUser.firstName} ${currentUser.lastName}`,
                  email: currentUser.email,
                  role: userRole,
                }
              : {
                  name: 'Loading...',
                  email: '',
                  role: userRole,
                }
          }
        />

        <main className='pt-16'>
          <div className='max-w-full px-4 sm:px-6 lg:px-8 py-8'>
            <Breadcrumb />

            {/* Enhanced Page Header */}
            <div className='mb-8'>
              <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-4'>
                    <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg'>
                      <Icon
                        name='Kanban'
                        size={24}
                        className='text-white'
                      />
                    </div>
                    <div>
                      <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
                        Project Board
                      </h1>
                      <p className='text-gray-600 dark:text-gray-300 mt-1'>
                        Organize tasks and track progress with visual workflow
                      </p>
                    </div>
                  </div>

                  {/* Board Stats */}
                  <div className='hidden md:flex items-center space-x-6'>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                        {columns.length}
                      </div>
                      <div className='text-sm text-gray-500 dark:text-gray-400'>Columns</div>
                    </div>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                        {cards.length}
                      </div>
                      <div className='text-sm text-gray-500 dark:text-gray-400'>Tasks</div>
                    </div>
                    <div className='text-center'>
                      <div className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
                        {cards.filter(card => card.priority === 'high' || card.priority === 'urgent').length}
                      </div>
                      <div className='text-sm text-gray-500 dark:text-gray-400'>Priority</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Loading State */}
            {isLoading && (
              <div className='flex items-center justify-center py-16'>
                <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8'>
                  <div className='flex flex-col items-center space-y-4'>
                    <div className='relative'>
                      <div className='animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700'></div>
                      <div className='animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0'></div>
                    </div>
                    <div className='text-center'>
                      <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Loading Board</h3>
                      <p className='text-gray-600 dark:text-gray-300 mt-1'>Setting up your workspace...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Error State */}
            {error && !isLoading && (
              <div className='flex items-center justify-center py-16'>
                <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-800 p-8 max-w-md'>
                  <div className='flex flex-col items-center space-y-4'>
                    <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center'>
                      <Icon name='AlertTriangle' size={32} className='text-red-600 dark:text-red-400' />
                    </div>
                    <div className='text-center'>
                      <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Unable to Load Board</h3>
                      <p className='text-gray-600 dark:text-gray-300 mt-2'>{error}</p>
                    </div>
                    <div className='flex space-x-3'>
                      <Button
                        variant='outline'
                        onClick={() => window.location.reload()}
                        className='px-6'
                      >
                        <Icon name='RefreshCw' size={16} className='mr-2' />
                        Retry
                      </Button>
                      <Button
                        variant='default'
                        onClick={() => navigate('/dashboard')}
                        className='px-6'
                      >
                        <Icon name='Home' size={16} className='mr-2' />
                        Go Home
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Board Header */}
            {!isLoading && !error && (
              <BoardHeader
                board={board}
                members={members}
                onBoardUpdate={handleBoardUpdate}
                onMemberInvite={handleMemberInvite}
                onFilterChange={setActiveFilters}
                onSearchChange={setSearchQuery}
                onRefresh={handleManualRefresh}
                searchQuery={searchQuery}
                activeFilters={activeFilters}
                canInviteMembers={canInviteMembers()}
                organizationName={
                  (currentOrganization && currentOrganization.name) ||
                  'Organization'
                }
              />
            )}

            {/* Board Content */}
            {!isLoading && !error && (
              <div className='flex-1 p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-900 dark:to-slate-800 overflow-hidden'>
                <div className='flex space-x-4 sm:space-x-6 overflow-x-auto pb-6 h-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600' style={{ minHeight: 'calc(100vh - 180px)' }}>
                {/* Columns */}
                {columns
                  .sort((a, b) => a.order - b.order)
                  .map((column) => (
                    <BoardColumn
                      key={column.id}
                      column={column}
                      cards={getCardsForColumn(column.id)}
                      onCardMove={handleCardMove}
                      onCardClick={handleCardClick}
                      onAddCard={handleAddCard}
                      onEditColumn={handleEditColumn}
                      onDeleteColumn={handleDeleteColumn}
                      members={members}
                      canCreateCards={canCreateCards()}
                      canEditColumns={canEditColumns()}
                      canDeleteColumns={canDeleteColumns()}
                      canDragCards={canDragCards()}
                    />
                  ))}

                {/* Add Column Button - Only show for non-viewers */}
                {canCreateColumns() && (
                  <div className='flex-shrink-0'>
                    <Button
                      variant='outline'
                      onClick={() => setShowAddColumnModal(true)}
                      className='w-64 sm:w-80 h-32 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors'
                      iconName='Plus'
                      iconPosition='left'
                    >
                      Add Column
                    </Button>
                  </div>
                )}
              </div>

              {/* Empty State */}
              {filteredCards.length === 0 && searchQuery && (
                <div className='flex flex-col items-center justify-center py-12'>
                  <Icon
                    name='Search'
                    size={48}
                    className='text-text-secondary mb-4'
                  />
                  <h3 className='text-lg font-medium text-text-primary mb-2'>
                    No cards found
                  </h3>
                  <p className='text-text-secondary text-center max-w-md'>
                    No cards match your search criteria. Try adjusting your
                    search terms or filters.
                  </p>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilters({});
                    }}
                    className='mt-4'
                  >
                    Clear Search & Filters
                  </Button>
                </div>
              )}
              </div>
            )}

            {/* Modals */}
            <AddCardModal
              isOpen={showAddCardModal}
              onClose={() => {
                setShowAddCardModal(false);
                setSelectedColumnId(null);
              }}
              onSave={handleSaveCard}
              columnId={selectedColumnId}
              members={members}
            />

            {/* Debug members data */}
            {showAddCardModal && (
              <div style={{ display: 'none' }}>
                {console.log('🔍 DEBUG: AddCardModal members prop:', members)}
                {console.log('🔍 DEBUG: Members length:', members?.length)}
                {console.log('🔍 DEBUG: Current organization:', currentOrganization)}
              </div>
            )}

            <AddColumnModal
              isOpen={showAddColumnModal}
              onClose={() => setShowAddColumnModal(false)}
              onSave={handleSaveColumn}
            />

            <InviteMemberModal
              isOpen={showInviteMemberModal}
              onClose={() => setShowInviteMemberModal(false)}
              onInvite={handleSendInvitation}
            />
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </DndProvider>
  );
};

export default KanbanBoard;
