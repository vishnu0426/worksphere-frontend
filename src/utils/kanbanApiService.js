// Dedicated Kanban API Service
// Uses the new comprehensive Kanban backend endpoints

import sessionService from './sessionService.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getAuthHeaders = (extra = {}) => {
  const token = sessionService.getSessionToken?.();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
};

const fetchWithCredentials = async (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
};

const handle = async (resp) => {
  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }
  if (!resp.ok) {
    // Handle validation errors (422) with detailed messages
    if (resp.status === 422 && json?.detail) {
      const validationErrors = Array.isArray(json.detail)
        ? json.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ')
        : json.detail;
      throw new Error(`Validation error: ${validationErrors}`);
    }

    const msg = json?.error?.message || json?.message || `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return json;
};

const kanbanApiService = {
  // Board operations
  board: {
    getOrCreateForProject: async (projectId) => {
      console.log(`🔧 Getting/creating board for project: ${projectId}`);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/projects/${projectId}/board`
      );
      const result = await handle(resp);
      console.log(`🔧 Board response:`, result);
      console.log(`🔧 Board response structure - has data property:`, !!result?.data);
      console.log(`🔧 Board response structure - has id:`, !!result?.id);
      console.log(`🔧 Board response structure - has columns:`, !!result?.columns);
      return result;
    }
  },

  // Column operations
  columns: {
    create: async (boardId, columnData) => {
      console.log(`🔧 Creating column in board: ${boardId}`, columnData);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/boards/${boardId}/columns`,
        {
          method: 'POST',
          body: JSON.stringify(columnData),
        }
      );
      const result = await handle(resp);
      console.log(`🔧 Column creation response:`, result);
      return result;
    },

    getCards: async (columnId) => {
      console.log(`🔧 Getting cards for column: ${columnId}`);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/columns/${columnId}/cards`
      );
      const result = await handle(resp);
      console.log(`🔧 Cards response:`, result);
      return result;
    }
  },

  // Card operations
  cards: {
    create: async (columnId, cardData) => {
      console.log(`🔧 Creating card in column: ${columnId}`, cardData);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/columns/${columnId}/cards`,
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        }
      );
      const result = await handle(resp);
      console.log(`🔧 Card creation response:`, result);
      return result;
    },

    update: async (cardId, cardData) => {
      console.log(`🔧 Updating card: ${cardId}`, cardData);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/cards/${cardId}`,
        {
          method: 'PUT',
          body: JSON.stringify(cardData),
        }
      );
      const result = await handle(resp);
      console.log(`🔧 Card update response:`, result);
      return result;
    },

    move: async (cardId, targetColumnId, position = null) => {
      console.log(`🔧 Moving card ${cardId} to column ${targetColumnId} at position ${position}`);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/cards/${cardId}/move`,
        {
          method: 'PUT',
          body: JSON.stringify({
            target_column_id: targetColumnId,
            position: position
          }),
        }
      );
      const result = await handle(resp);
      console.log(`🔧 Card move response:`, result);
      return result;
    },

    delete: async (cardId) => {
      console.log(`🔧 Deleting card: ${cardId}`);
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/kanban/cards/${cardId}`,
        {
          method: 'DELETE',
        }
      );
      const result = await handle(resp);
      console.log(`🔧 Card deletion response:`, result);
      return result;
    }
  },

  // Utility methods
  utils: {
    // Transform backend board data to frontend format
    transformBoardData: (backendBoard) => {
      if (!backendBoard) {
        return null;
      }

      // Handle both wrapped (backendBoard.data) and direct formats
      const board = backendBoard.data || backendBoard;

      // Ensure we have the required fields
      if (!board || !board.id || !board.columns) {
        console.log('❌ Invalid board data structure:', board);
        return null;
      }

      return {
        id: board.id,
        name: board.name,
        description: board.description,
        project_id: board.project_id,
        columns: board.columns.map(col => ({
          id: col.id,
          title: col.name,
          name: col.name,
          position: col.position,
          order: col.position,
          color: col.color,
          board_id: col.board_id
        })),
        created_at: board.created_at,
        updated_at: board.updated_at
      };
    },

    // Transform backend card data to frontend format
    transformCardData: (backendCard) => {
      if (!backendCard) {
        return null;
      }

      const card = backendCard.data || backendCard;
      return {
        id: card.id,
        columnId: card.column_id,
        title: card.title,
        description: card.description,
        position: card.position,
        priority: card.priority,
        status: card.status,
        dueDate: card.due_date,
        labels: card.labels || [],
        assignedTo: card.assignments?.map(a => a.user_id) || [],
        assignments: card.assignments || [],
        createdBy: card.created_by,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        checklist: card.checklist_items || []
      };
    },

    // Transform frontend card data to backend format
    transformCardToBackend: (frontendCard) => {
      return {
        title: frontendCard.title,
        description: frontendCard.description || '',
        priority: frontendCard.priority || 'medium',
        assigned_to: frontendCard.assignedTo || [],
        due_date: frontendCard.dueDate || null,
        labels: frontendCard.labels || []
      };
    }
  }
};

export default kanbanApiService;
