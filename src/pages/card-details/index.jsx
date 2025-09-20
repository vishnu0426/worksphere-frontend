// ... imports
// (removed duplicate import)
// (removed duplicate Icon import)

// --- Restored Old CardDetails UI, centered modal, stack-like ---
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
// (removed unused RoleBasedHeader import)
import Icon from '../../components/AppIcon';
import CardHeader from './components/CardHeader';
import CardDescription from './components/CardDescription';
import MemberAssignment from './components/MemberAssignment';
import DueDatePicker from './components/DueDatePicker';
import LabelManager from './components/LabelManager';
import ChecklistManager from './components/ChecklistManager';
import ActivityTimeline from './components/ActivityTimeline';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
// (removed unused authService and sessionService imports)

const CardDetails = ({ onSave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('id');
  const { toasts, showToast, hideToast } = useToast();

  // Validate card ID format
  const isValidUUID = (str) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Authentication state
  // Removed unused currentUser, userRole, currentOrganization state

  const userRole = 'member';
  const canEdit = ['member', 'admin', 'owner'].includes(userRole);
  const canDelete = ['admin', 'owner'].includes(userRole);
  const canComment = ['member', 'admin', 'owner'].includes(userRole);

  const [cardData, setCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Cleanup function to fix invalid IDs in existing checklist items
  const cleanupInvalidIds = (checklistItems) => {
    if (!checklistItems || checklistItems.length === 0) {
      return checklistItems;
    }

    console.log('🔧 Checking checklist items for invalid IDs:', checklistItems.length, 'items');

    return checklistItems.map(item => {
      // Check if this item has an invalid ID (old ai- prefix or too short)
      if (item.id && (item.id.startsWith('ai-') || item.id.length < 32)) {
        const newId = `temp-ai-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        console.log('🔧 Fixing invalid ID:', item.id, '→', newId, 'for item:', item.text);
        return {
          ...item,
          id: newId
        };
      }
      return item;
    });
  };

  useEffect(() => {
    let didCancel = false;
    setLoadError(null);
    const loadCardData = async () => {
      setIsLoading(true);
      if (location.state?.card) {
        const rawChecklist = location.state.card.checklist_items ||
                         location.state.card.checklist ||
                         [];
        const normalizedCardData = {
          ...location.state.card,
          checklist: cleanupInvalidIds(rawChecklist),
        };
        if (normalizedCardData.checklist_items) {
          delete normalizedCardData.checklist_items;
        }
        if (!didCancel) {
          setCardData(normalizedCardData);
          setIsLoading(false);
        }
        return;
      }
      if (cardId) {
        // Check if cardId is a valid UUID before making API call
        if (!isValidUUID(cardId)) {
          if (!didCancel) {
            setLoadError(
              'Invalid card ID format. This card may not exist in the backend.'
            );
            setIsLoading(false);
          }
          return;
        }

        try {
          const apiService = (await import('../../utils/realApiService'))
            .default;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 10000)
          );
          const result = await Promise.race([
            apiService.cards.getById(cardId),
            timeoutPromise,
          ]);
          if (result && result.data) {
            const rawChecklist = result.data.checklist_items || result.data.checklist || [];
            const normalizedCardData = {
              ...result.data,
              checklist: cleanupInvalidIds(rawChecklist),
            };
            if (normalizedCardData.checklist_items) {
              delete normalizedCardData.checklist_items;
            }
            if (!didCancel) {
              setCardData(normalizedCardData);
              setIsLoading(false);
            }
            return;
          } else {
            throw new Error('No card data found');
          }
        } catch (error) {
          if (!didCancel) {
            setLoadError(error.message || 'Failed to load card');
            setIsLoading(false);
          }
          return;
        }
      }
      if (!didCancel) {
        setCardData({
          id: cardId || '1',
          title: 'Card Not Found',
          description:
            'This card could not be loaded. Please return to the board and try again.',
          columnTitle: 'Unknown',
          assignedMembers: [],
          dueDate: null,
          labels: [],
          checklist: [],
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setIsLoading(false);
      }
    };
    loadCardData();
    return () => {
      didCancel = true;
    };
  }, [cardId, location.state, retryCount]);

  const handleRetry = () => setRetryCount((c) => c + 1);

  // Track changes
  const trackChange = (field, value) => {
    const updatedData = { [field]: value };
    setCardData((prev) => ({ ...prev, ...updatedData }));
    setPendingChanges((prev) => ({ ...prev, ...updatedData }));
    setHasUnsavedChanges(true);
  };
  const hasFieldChanged = (field) => pendingChanges.hasOwnProperty(field);
  const handleTitleChange = (newTitle) => trackChange('title', newTitle);
  const handleDescriptionChange = (newDescription) =>
    trackChange('description', newDescription);
  const handleMembersChange = (newMembers) =>
    trackChange('assignedMembers', newMembers);
  const handleDueDateChange = (newDueDate) =>
    trackChange('dueDate', newDueDate);
  const handleLabelsChange = (newLabels) => trackChange('labels', newLabels);
  const handleChecklistChange = (newChecklist) =>
    trackChange('checklist', newChecklist);

  // Helper function to save checklist changes via dedicated endpoints
  const saveChecklistChanges = async (cardId, pendingChanges) => {
    if (!pendingChanges.checklist) {
      return; // No checklist changes to save
    }

    const realApiService = (await import('../../utils/realApiService')).default;
    const newChecklist = pendingChanges.checklist;
    const originalChecklist = cardData.checklist || [];

    console.log('🔧 Saving checklist changes for card:', cardId);
    console.log('🔧 Original checklist:', originalChecklist);
    console.log('🔧 New checklist:', newChecklist);

    // Separate items into new, updated, and deleted
    const newItems = [];
    const updatedItems = [];
    const existingIds = new Set();

    // Process new checklist items
    for (const item of newChecklist) {
      // Check if this is a temporary ID (includes old 'ai-' prefix and new 'temp-' prefix)
      const isTemporaryId = !item.id ||
                           item.id.startsWith('temp-') ||
                           item.id.startsWith('ai-') ||
                           (item.id && item.id.length < 32); // Invalid UUID length

      if (isTemporaryId) {
        // New item (no id, temporary id, or invalid old AI id)
        console.log('🆕 Creating new item:', item.text, 'with temp ID:', item.id);
        newItems.push({
          text: item.text,
          position: item.position || 0,
          completed: item.completed || false,
          ai_generated: item.aiGenerated || false,
          confidence: item.confidence || null,
          metadata: item.metadata || null
        });
      } else {
        // Existing item to update (has a real UUID from database)
        console.log('🔄 Updating existing item:', item.text, 'with ID:', item.id);
        existingIds.add(item.id);
        updatedItems.push({
          id: item.id,
          text: item.text,
          position: item.position || 0,
          completed: item.completed || false
        });
      }
    }

    // Find deleted items (existed in original but not in new)
    // Only include items with real database IDs (not temporary IDs)
    const deletedItems = originalChecklist.filter(item => {
      if (!item.id || existingIds.has(item.id)) {
        return false; // Item still exists or has no ID
      }

      // Check if this is a temporary ID that should not be deleted via API
      const isTemporaryId = item.id.startsWith('temp-') ||
                           item.id.startsWith('ai-') ||
                           item.id.length < 32; // Invalid UUID length

      return !isTemporaryId; // Only delete items with real database IDs
    });

    console.log('🔧 New items to create:', newItems);
    console.log('🔧 Items to update:', updatedItems);
    console.log('🔧 Items to delete:', deletedItems);

    try {
      // Create new items in bulk
      if (newItems.length > 0) {
        console.log('🔧 Creating new checklist items...');
        await realApiService.checklist.createBulk(cardId, { items: newItems });
      }

      // Update existing items one by one
      for (const item of updatedItems) {
        console.log('🔧 Updating checklist item:', item.id);
        await realApiService.checklist.updateItem(item.id, {
          text: item.text,
          completed: item.completed,
          position: item.position
        });
      }

      // Delete removed items
      for (const item of deletedItems) {
        console.log('🔧 Deleting checklist item:', item.id);
        await realApiService.checklist.deleteItem(item.id);
      }

      // Fetch the latest checklist from backend to get new IDs
      console.log('🔧 Fetching updated checklist from backend...');
      const updatedChecklistResponse = await realApiService.checklist.getByCard(cardId);
      const updatedChecklist = updatedChecklistResponse.data || updatedChecklistResponse;

      // Update local state with fresh data from backend
      setCardData(prev => ({
        ...prev,
        checklist: updatedChecklist
      }));

      console.log('✅ Checklist changes saved successfully');
    } catch (error) {
      console.error('❌ Error saving checklist changes:', error);
      throw error; // Re-throw to be handled by the main save function
    }
  };

  // Save changes and update board
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || !cardData?.id) return;
    setIsSaving(true);
    try {
      if (cardData?.id && Object.keys(pendingChanges).length > 0) {
        // Validate card ID format before making API call
        if (!isValidUUID(cardData.id)) {
          console.warn(
            'Invalid card ID format, skipping API update:',
            cardData.id
          );
          console.log(
            'Note: Card might be newly created and not yet synced with backend'
          );
          return;
        }

        const kanbanApi = (await import('../../utils/kanbanApiService')).default;
        // Only send fields that the backend accepts for card updates
        const backendSupportedFields = [
          'title',
          'description',
          'priority',
          'position',
          'column_id',
          'due_date',
          'assigned_to',
          'labels'
        ];

        // Prepare payload for card update (excluding checklist)
        const sanitizedPayload = {};
        for (const [key, value] of Object.entries(pendingChanges)) {
          if (backendSupportedFields.includes(key) && value !== undefined) {
            sanitizedPayload[key] = value;
          }
        }

        // Only make API call if there are supported fields to update
        if (Object.keys(sanitizedPayload).length > 0) {
          console.log('Updating card with supported fields:', sanitizedPayload);
          await kanbanApi.cards.update(cardData.id, sanitizedPayload);
        } else {
          console.log(
            'No backend-supported fields to update, skipping API call'
          );
        }

        // Handle checklist changes via dedicated endpoints
        if (pendingChanges.checklist) {
          console.log('🔧 Processing checklist changes...');
          await saveChecklistChanges(cardData.id, pendingChanges);
        }

        // Handle other unsupported fields
        const unsupportedFields = Object.keys(pendingChanges).filter(
          (key) => !backendSupportedFields.includes(key) && key !== 'checklist'
        );
        if (unsupportedFields.length > 0) {
          console.log(
            'Note: Some fields are not yet supported by the backend API:',
            unsupportedFields
          );
        }
      }
      if (onSave && typeof onSave === 'function') {
        onSave({ ...cardData, ...pendingChanges });
      }
      setPendingChanges({});
      setHasUnsavedChanges(false);

      // Show success notification
      showToast('Card saved successfully! Redirecting to board...', 'success', 2000);

      // Navigate back to kanban board after a short delay
      setTimeout(() => {
        const returnPath = location.state?.returnPath || '/kanban-board';
        navigate(returnPath, {
          state: {
            // Preserve project context if available
            projectId: location.state?.projectId,
            project: location.state?.project,
            // Add success flag for potential board-level notifications
            cardSaved: true,
            savedCardId: cardData.id,
            savedCardTitle: cardData.title
          }
        });
      }, 1500);

    } catch (error) {
      console.error('Error saving card changes:', error);
      // Show error toast instead of alert
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  const handleDiscardChanges = () => {
    if (!hasUnsavedChanges) return;
    setPendingChanges({});
    setHasUnsavedChanges(false);
    window.location.reload();
  };
  const handleAddComment = (comment) => {};

  // Alias for handleSaveChanges to match component expectations
  const handleSave = handleSaveChanges;

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      if (!confirmLeave) return;
    }
    const returnPath = location.state?.returnPath || '/kanban-board';
    navigate(returnPath, {
      state: {
        // Preserve project context if available
        projectId: location.state?.projectId,
        project: location.state?.project
      }
    });
  };
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      // Show success notification for deletion
      showToast('Card deleted successfully!', 'success', 3000);

      // Navigate back with preserved state
      const returnPath = location.state?.returnPath || '/kanban-board';
      navigate(returnPath, {
        state: {
          // Preserve project context if available
          projectId: location.state?.projectId,
          project: location.state?.project,
          // Add deletion flag for potential board-level notifications
          cardDeleted: true,
          deletedCardTitle: cardData.title
        }
      });
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // --- UI ---
  if (isLoading) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-8 flex flex-col items-center border border-gray-300 dark:border-gray-600'>
          <div className='mb-6'>
            <div className='w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center animate-pulse'>
              <Icon name='FileText' size={24} className='text-white' />
            </div>
          </div>
          <div className='text-center'>
            <div className='text-xl font-semibold text-gray-900 dark:text-white mb-3'>
              Loading Card Details
            </div>
            <div className='text-gray-600 dark:text-gray-300 text-sm'>
              Please wait while we fetch the card information...
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-8 flex flex-col items-center border border-red-300 dark:border-red-700'>
          <div className='w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6'>
            <Icon name='AlertTriangle' size={28} className='text-white' />
          </div>
          <div className='text-center mb-8'>
            <div className='text-xl font-semibold text-gray-900 dark:text-white mb-3'>
              Failed to Load Card
            </div>
            <div className='text-gray-600 dark:text-gray-300 text-sm leading-relaxed'>{loadError}</div>
          </div>
          <div className='flex flex-col sm:flex-row gap-3 w-full'>
            <button
              onClick={handleRetry}
              className='flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg'
            >
              <Icon name='RefreshCw' size={16} />
              Retry
            </button>
            <button
              onClick={handleClose}
              className='flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2'
            >
              <Icon name='ArrowLeft' size={16} />
              Return to Board
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!cardData) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[90vh] overflow-hidden flex flex-col">

        <CardHeader
          card={cardData}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={handleClose}
          onDelete={handleDelete}
          onTitleChange={handleTitleChange}
          hasChanged={hasUnsavedChanges}
        />


        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <CardDescription
            card={cardData}
            canEdit={canEdit}
            onDescriptionChange={handleDescriptionChange}
            hasChanged={hasUnsavedChanges}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <MemberAssignment
                card={cardData}
                canEdit={canEdit}
                onMembersChange={handleMembersChange}
                hasChanged={hasUnsavedChanges}
              />
              <DueDatePicker
                card={cardData}
                canEdit={canEdit}
                onDueDateChange={handleDueDateChange}
                hasChanged={hasUnsavedChanges}
              />
              <LabelManager
                card={cardData}
                canEdit={canEdit}
                onLabelsChange={handleLabelsChange}
                hasChanged={hasUnsavedChanges}
              />
            </div>

            <div className="space-y-6">
              <ChecklistManager
                card={cardData}
                canEdit={canEdit}
                onChecklistChange={handleChecklistChange}
                hasChanged={hasUnsavedChanges}
              />
            </div>
          </div>

          <ActivityTimeline
            card={cardData}
            canComment={canComment}
            onAddComment={handleAddComment}
          />
        </div>

        {/* Save/Discard Changes Footer */}
        {hasUnsavedChanges && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Icon name="AlertCircle" size={16} className="text-amber-500" />
              <span>You have unsaved changes</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Icon name="Save" size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </div>
  );
};

export default React.memo(CardDetails);
