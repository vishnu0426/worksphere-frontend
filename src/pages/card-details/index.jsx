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
// (removed unused authService and sessionService imports)

const CardDetails = ({ onSave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('id');

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
    } catch (error) {
      console.error('Error saving card changes:', error);
      // Show user-friendly error message
      alert('Failed to save changes. Please try again.');
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
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      if (!confirmLeave) return;
    }
    navigate('/kanban-board');
  };
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      navigate('/kanban-board');
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
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-8 flex flex-col items-center border border-gray-200 dark:border-gray-700'>
          <div className='relative mb-6'>
            <div className='animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700'></div>
            <div className='animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0'></div>
          </div>
          <div className='text-center'>
            <div className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
              Loading Card Details
            </div>
            <div className='text-gray-600 dark:text-gray-300'>
              Please wait while we fetch the card information...
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-8 flex flex-col items-center border border-red-200 dark:border-red-800'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6'>
            <Icon name='AlertTriangle' size={32} className='text-red-600 dark:text-red-400' />
          </div>
          <div className='text-center mb-6'>
            <div className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
              Failed to Load Card
            </div>
            <div className='text-gray-600 dark:text-gray-300'>{loadError}</div>
          </div>
          <button
            onClick={handleRetry}
            className='text-primary hover:underline px-4 py-2 border border-primary rounded'
          >
            Retry
          </button>
          <button
            onClick={handleClose}
            className='ml-4 text-text-secondary hover:underline px-4 py-2 border border-border rounded'
          >
            Return to Board
          </button>
        </div>
      </div>
    );
  }
  if (!cardData) {
    return null;
  }
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto p-0 flex flex-col'>
        <div className='flex flex-col divide-y divide-border'>
          <CardHeader
            card={cardData}
            onTitleChange={handleTitleChange}
            onClose={handleClose}
            onDelete={handleDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            hasChanged={hasFieldChanged('title')}
          />
          {hasUnsavedChanges && (
            <div className='bg-warning/10 border-b border-warning/20 px-8 py-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <Icon name='AlertCircle' size={20} className='text-warning' />
                  <div>
                    <p className='text-sm font-medium text-warning'>
                      You have unsaved changes
                    </p>
                    <p className='text-xs text-warning/80'>
                      Save your changes to avoid losing them
                    </p>
                  </div>
                </div>
                <div className='flex items-center space-x-3'>
                  <button
                    onClick={handleDiscardChanges}
                    disabled={isSaving}
                    className='px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50'
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className='px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2'
                  >
                    {isSaving ? (
                      <>
                        <Icon
                          name='Loader2'
                          size={16}
                          className='animate-spin'
                        />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Icon name='Save' size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className='flex flex-col md:flex-row overflow-y-auto max-h-[80vh]'>
            <div className='flex-1 md:w-3/5 p-8 space-y-8'>
              <CardDescription
                card={cardData}
                onDescriptionChange={handleDescriptionChange}
                canEdit={canEdit}
                hasChanged={hasFieldChanged('description')}
              />
              <ChecklistManager
                card={cardData}
                onChecklistChange={handleChecklistChange}
                canEdit={canEdit}
                hasChanged={hasFieldChanged('checklist')}
              />
              <ActivityTimeline
                card={cardData}
                onAddComment={handleAddComment}
                canComment={canComment}
              />
            </div>
            <div className='md:w-2/5 p-8 bg-gradient-to-b from-muted/20 to-muted/40 border-l border-border/50 space-y-8'>
              <MemberAssignment
                card={cardData}
                onMembersChange={handleMembersChange}
                canEdit={canEdit}
                hasChanged={hasFieldChanged('assignedMembers')}
              />
              <DueDatePicker
                card={cardData}
                onDueDateChange={handleDueDateChange}
                canEdit={canEdit}
                hasChanged={hasFieldChanged('dueDate')}
              />
              <LabelManager
                card={cardData}
                onLabelsChange={handleLabelsChange}
                canEdit={canEdit}
                hasChanged={hasFieldChanged('labels')}
              />
              <div className='bg-surface/50 rounded-lg p-6 border border-border/30 space-y-4'>
                <h4 className='font-semibold text-text-primary flex items-center gap-2'>
                  <Icon name='Info' size={16} className='text-primary' />
                  Card Information
                </h4>
                <div className='space-y-3 text-sm'>
                  <div className='flex justify-between items-center py-2 border-b border-border/20'>
                    <span className='text-text-secondary font-medium'>
                      Created:
                    </span>
                    <span className='text-text-primary'>
                      {new Date(cardData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='flex justify-between items-center py-2 border-b border-border/20'>
                    <span className='text-text-secondary font-medium'>
                      Last updated:
                    </span>
                    <span className='text-text-primary'>
                      {new Date(cardData.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className='flex justify-between items-center py-2'>
                    <span className='text-text-secondary font-medium'>
                      Card ID:
                    </span>
                    <span className='text-text-primary font-mono text-xs bg-muted px-2 py-1 rounded'>
                      #{cardData.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CardDetails);
