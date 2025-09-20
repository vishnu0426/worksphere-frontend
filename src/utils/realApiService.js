// src/utils/realApiService.js (minimal live backend client used by apiService)

import sessionService from './sessionService.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
if (!API_BASE_URL) {
  throw new Error('REACT_APP_API_URL must be set');
}

const getAuthHeaders = (extra = {}) => {
  // Database-only authentication - NO localStorage fallback
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
      // FastAPI validation errors format
      const validationErrors = Array.isArray(json.detail)
        ? json.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ')
        : json.detail;
      const error = new Error(`Validation error: ${validationErrors}`);
      error.status = resp.status;
      throw error;
    }

    // Create error with status code and detailed message
    const msg = json?.detail || json?.error?.message || json?.message || `HTTP ${resp.status}`;
    const error = new Error(msg);
    error.status = resp.status;
    throw error;
  }
  return json;
};

const buildQS = (params = {}) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') usp.append(k, v);
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
};

const realApiService = {
  // Basic HTTP methods
  get: async (url) => {
    const resp = await fetchWithCredentials(`${API_BASE_URL}${url}`, {
      method: 'GET',
    });
    return handle(resp);
  },

  post: async (url, data) => {
    const resp = await fetchWithCredentials(`${API_BASE_URL}${url}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handle(resp);
  },

  put: async (url, data) => {
    const resp = await fetchWithCredentials(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handle(resp);
  },

  delete: async (url) => {
    const resp = await fetchWithCredentials(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
    });
    return handle(resp);
  },

  // Authentication
  auth: {
    register: async (data) => {
      const body = {
        email: data.email,
        password: data.password,
        first_name: data.firstName || data.first_name,
        last_name: data.lastName || data.last_name,
        organization_name: data.organizationName || data.organization_name,
        organization_domain:
          data.organizationDomain || data.organization_domain,
      };
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return handle(resp);
    },
    login: async (email, password) => {
      console.log('🔍 Login attempt:', { email, apiUrl: `${API_BASE_URL}/api/v1/auth/login` });
      try {
        const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        console.log('📡 Login response status:', resp.status);
        const result = await handle(resp);
        console.log('✅ Login successful:', result);
        // Database-only authentication - no localStorage usage
        // Tokens are handled by sessionService
        return result;
      } catch (error) {
        console.error('❌ Login error:', error);
        throw error;
      }
    },
    logout: async () => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
      });
      const result = await handle(resp);
      // Database-only authentication - no localStorage usage
      // Session cleanup is handled by sessionService
      return result;
    },
    changePassword: async (data) => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await handle(resp);
      return { success: true, data: result };
    },
  },

  // Users
  users: {
    getCurrentUser: async () => {
      // Corrected endpoint: the user profile with role is under /api/v1/users/me
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/users/me`);
      return handle(resp);
    },
    updateProfile: async (updateData) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });
      return handle(resp);
    },
    uploadAvatar: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const token = sessionService.getSessionToken?.(); // No localStorage fallback
      const resp = await fetch(`${API_BASE_URL}/api/v1/users/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      return handle(resp);
    },
  },

  // Dashboard / Analytics (minimal)
  dashboard: {
    getStats: async () => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/analytics/dashboard/stats`,
        { headers: getAuthHeaders() }
      );
      // Normalize into {data, error}
      try {
        const j = await handle(resp);
        return { data: j.data || j, error: null };
      } catch (e) {
        return { data: null, error: e.message };
      }
    },
  },
  analytics: {
    getUserAnalytics: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/user`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    getOrganizationAnalytics: async (organizationId, period = '30d') => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/analytics/organizations/${organizationId}/performance${buildQS(
          { period }
        )}`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    getUsageAnalytics: async (period = '30d') => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/analytics/usage${buildQS({ period })}`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    getDashboardStats: async () => realApiService.dashboard.getStats(),
  },

  // Organizations (members endpoints used by teamService)
  organizations: {
    getAll: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/organizations`, {
        headers: getAuthHeaders(),
      });
      const r = await handle(resp);
      return {
        organizations: Array.isArray(r.data) ? r.data : r.data ? [r.data] : [],
      };
    },
    getById: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/organizations/${id}`, {
        headers: getAuthHeaders(),
      });
      const r = await handle(resp);
      return r.data || r;
    },
    getMembers: async (organizationId, filters = {}) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/members${buildQS(
          filters
        )}`,
        { headers: getAuthHeaders() }
      );
      const r = await handle(resp);
      return r.data;
    },
    // FIX: Add missing getAcceptedInvitations method
    getAcceptedInvitations: async (organizationId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/members${buildQS({ status: 'accepted' })}`,
        { headers: getAuthHeaders() }
      );
      const r = await handle(resp);
      return r.data || [];
    },
    create: async (data) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/organizations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    update: async (id, data) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/organizations/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    inviteMember: async (organizationId, inviteData) => {
      return await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/invite`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(inviteData),
        }
      );
    },
    acceptInvitation: async (invitationData) => {
      // Don't use fetchWithCredentials for invitation acceptance since user doesn't have account yet
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/accept-invitation`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            // Explicitly don't include Authorization header
          },
          body: JSON.stringify(invitationData),
        }
      );
      return handle(resp);
    },
    getActivities: async (organizationId, params = {}) => {
      const qs = new URLSearchParams(params).toString();
      const url = qs
        ? `${API_BASE_URL}/api/v1/organizations/${organizationId}/activities?${qs}`
        : `${API_BASE_URL}/api/v1/organizations/${organizationId}/activities`;
      const resp = await fetch(url, { headers: getAuthHeaders() });
      const result = await handle(resp);

      // Ensure activities is always an array
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          return result;
        }
        if (Array.isArray(result.data)) {
          return result.data;
        }
        if (Array.isArray(result.activities)) {
          return result.activities;
        }
        // If we get an object but no array, return empty array
        return [];
      }

      return [];
    },
    initializeDashboard: async (organizationId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/initialize-dashboard`,
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      );
      return handle(resp);
    },
  },

  // Projects
  projects: {
    getAll: async (organizationId) => {
      // Backend supports organization_id as a query parameter
      const qs = buildQS(
        organizationId ? { organization_id: organizationId } : {}
      );
      const resp = await fetch(`${API_BASE_URL}/api/v1/projects${qs}`, {
        headers: getAuthHeaders(),
      });
      const r = await handle(resp);
      // Backend returns a bare list for this endpoint
      return r;
    },
    getById: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
        headers: getAuthHeaders(),
      });
      const r = await handle(resp);
      // Backend returns a single project object
      return r;
    },
    create: async (organizationId, data) => {
      console.log('🔧 Creating project with organizationId:', organizationId, 'data:', data);
      const headers = getAuthHeaders();
      const url = new URL(`${API_BASE_URL}/api/v1/projects`);
      if (organizationId) {
        url.searchParams.append('organization_id', organizationId);
      }
      console.log('🔧 Project creation URL:', url.toString());
      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    update: async (id, data) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    delete: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    getTeamMembers: async (projectId, organizationId) => {
      const qs = buildQS(
        organizationId ? { organization_id: organizationId } : {}
      );
      const resp = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/team-members${qs}`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
  },

  // Boards
  boards: {
    getByProject: async (projectId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/boards`,
        { headers: getAuthHeaders() }
      );
      const r = await handle(resp);
      return r.data || r; // handle both wrapped and unwrapped responses
    },
    getById: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/boards/${id}`, {
        headers: getAuthHeaders(),
      });
      const r = await handle(resp);
      return r.data;
    },
    create: async (projectId, data) => {
      // Backend expects POST /api/v1/projects/{projectId}/boards
      const payload = { name: data.name, description: data.description };
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/projects/${projectId}/boards`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      return handle(resp);
    },
    update: async (id, data) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/boards/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    delete: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/boards/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
  },

  // Columns
  columns: {
    getByBoard: async (boardId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/boards/${boardId}/columns`,
        { headers: getAuthHeaders() }
      );
      const r = await handle(resp);
      return r.data || r; // server wraps in {success,message,data}
    },
    getById: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/columns/${id}`, {
        headers: getAuthHeaders(),
      });
      const r = await handle(resp);
      return r.data;
    },
    create: async (boardId, data) => {
      // Backend expects POST /api/v1/columns with board_id in body
      const payload = {
        board_id: boardId,
        name: data.name,
        position: data.position,
        color: data.color,
      };
      const resp = await fetch(`${API_BASE_URL}/api/v1/columns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return handle(resp);
    },
    update: async (id, data) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/columns/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    delete: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/columns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
  },

  // Cards / Tasks
  cards: {
    getAll: async (columnId = null) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/cards/${buildQS(
          columnId ? { column_id: columnId } : {}
        )}`,
        { headers: getAuthHeaders() }
      );
      const r = await handle(resp);
      return r.data ? r.data : [];
    },
    getByProject: async (projectId, opts = {}) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/cards/projects/${projectId}/cards`,
        {
          headers: getAuthHeaders(),
          signal: opts.signal  // Support AbortController
        }
      );
      const r = await handle(resp);
      return r.data ? r.data : r;
    },
    getById: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/cards/${id}`, {
        headers: getAuthHeaders(),
      });
      const result = await handle(resp);

      // Ensure consistent response format
      if (result && typeof result === 'object') {
        // If backend returns { success: true, data: {...} }, extract the data
        if (result.data) {
          return { data: result.data };
        }
        // If backend returns the card data directly, wrap it
        return { data: result };
      }

      return result;
    },
    create: async (columnId, data) => {
      const payload = { ...data, column_id: data.column_id || columnId };
      const resp = await fetch(`${API_BASE_URL}/api/v1/cards/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const result = await handle(resp);

      // Ensure consistent response format - backend returns { success, data, message }
      // Frontend expects { data: ... }
      if (result && typeof result === 'object') {
        // If backend returns { success: true, data: {...} }, extract the data
        if (result.data) {
          return { data: result.data };
        }
        // If backend returns the card data directly, wrap it
        return { data: result };
      }

      return result;
    },
    update: async (id, data) => {
      // Log what we're sending for debugging
      console.log('Updating card with data:', data);

      const resp = await fetch(`${API_BASE_URL}/api/v1/cards/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      // Enhanced error handling
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`Card update failed (${resp.status}):`, errorText);
        throw new Error(`HTTP ${resp.status}: ${errorText}`);
      }

      return handle(resp);
    },
    delete: async (id) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/cards/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    move: async (cardId, targetColumnId, position = null) => {
      const payload = { target_column_id: targetColumnId, position };
      const resp = await fetch(`${API_BASE_URL}/api/v1/cards/${cardId}/move`, {
        method: 'PUT', // Backend expects PUT, not POST
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return handle(resp);
    },
    getAssignableMembers: async (cardId) => {
      console.log('🔍 Fetching assignable members for card:', cardId);
      console.log('🔗 API URL:', `${API_BASE_URL}/api/v1/cards/${cardId}/assignable-members`);

      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/assignable-members`, {
        headers: getAuthHeaders(),
      });

      console.log('📡 Response status:', resp.status);
      const result = await handle(resp);
      console.log('📋 API Result:', result);

      return result;
    },
    assignUser: async (cardId, userId) => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/assign?user_id=${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    unassignUser: async (cardId, userId) => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/assign/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    addComment: async (cardId, commentData) => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(commentData),
      });
      return handle(resp);
    },
    getMentionAutocomplete: async (cardId, search = '') => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/mention-autocomplete?search=${encodeURIComponent(search)}`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },

    getCardActivities: async (cardId) => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/activities`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },

    addCommentToCard: async (cardId, commentData) => {
      const resp = await fetchWithCredentials(`${API_BASE_URL}/api/v1/cards/${cardId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(commentData),
      });
      return handle(resp);
    },
  },

  // Checklist
  checklist: {
    createBulk: async (cardId, checklistData) => {
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/checklist/${cardId}/bulk`,
        {
          method: 'POST',
          body: JSON.stringify(checklistData),
        }
      );
      return handle(resp);
    },
    updateItem: async (itemId, update) => {
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/checklist/items/${itemId}`,
        {
          method: 'PUT',
          body: JSON.stringify(update),
        }
      );
      return handle(resp);
    },
    deleteItem: async (itemId) => {
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/checklist/items/${itemId}`,
        { method: 'DELETE' }
      );
      return handle(resp);
    },
    generateAI: async (cardId, aiData) => {
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/checklist/${cardId}/generate-ai`,
        {
          method: 'POST',
          body: JSON.stringify(aiData),
        }
      );
      return handle(resp);
    },
    getByCard: async (cardId) => {
      const resp = await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/checklist/cards/${cardId}/checklist`
      );
      return handle(resp);
    },
  },

  // Files
  files: {
    upload: async (file, cardId = null) => {
      const form = new FormData();
      form.append('file', file);
      if (cardId) form.append('card_id', cardId);
      const token = sessionService.getSessionToken?.(); // No localStorage fallback
      const resp = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      return handle(resp);
    },
    getByCard: async (cardId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/files${buildQS({ card_id: cardId })}`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    delete: async (fileId) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
  },

  // Teams
  teams: {
    getMemberActivity: async (organizationId, userId) => {
      return await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/teams/${organizationId}/members/${userId}/activity`,
        { headers: getAuthHeaders() }
      );
    },
    getTeamStats: async (organizationId) => {
      return await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/teams/${organizationId}/stats`,
        { headers: getAuthHeaders() }
      );
    },
    updateMemberRole: async (organizationId, userId, roleData) => {
      return await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/members/${userId}/role`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(roleData),
        }
      );
    },
    removeMember: async (organizationId, userId) => {
      return await fetchWithCredentials(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/members/${userId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
    },
    // Organization Settings
    getSettings: async (organizationId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/settings`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    updateSettings: async (organizationId, settingsData) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/settings`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(settingsData),
        }
      );
      return handle(resp);
    },
    createSettings: async (organizationId, settingsData) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/organizations/${organizationId}/settings`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(settingsData),
        }
      );
      return handle(resp);
    },
  },

  // Notifications
  notifications: {
    getAll: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      const url = qs
        ? `${API_BASE_URL}/api/v1/notifications?${qs}`
        : `${API_BASE_URL}/api/v1/notifications`;
      const resp = await fetch(url, { headers: getAuthHeaders() });
      const result = await handle(resp);
      
      // FIX: Ensure notifications is always an array
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          return result;
        }
        if (Array.isArray(result.data)) {
          return result.data;
        }
        if (Array.isArray(result.notifications)) {
          return result.notifications;
        }
        // If we get an object but no array, return empty array
        return [];
      }
      
      return [];
    },
    create: async (data) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handle(resp);
    },
    markAsRead: async (notificationId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/notifications/${notificationId}/read`,
        { method: 'PUT', headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    markAllAsRead: async () => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/notifications/mark-all-read`,
        { method: 'PUT', headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    getStats: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/notifications/stats`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    delete: async (notificationId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/notifications/${notificationId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    // In-app notification endpoints
    getUserNotifications: async (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      const url = qs
        ? `${API_BASE_URL}/api/v1/notifications/in-app/user-notifications?${qs}`
        : `${API_BASE_URL}/api/v1/notifications/in-app/user-notifications`;
      const resp = await fetch(url, { headers: getAuthHeaders() });
      const result = await handle(resp);

      // Handle the backend response format
      if (result && result.success && Array.isArray(result.notifications)) {
        return {
          success: true,
          data: result.notifications,
          count: result.count
        };
      }

      return {
        success: false,
        data: [],
        count: 0
      };
    },
    getUnreadCount: async (organizationId = null) => {
      const params = organizationId ? `?organization_id=${organizationId}` : '';
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/notifications/in-app/unread-count${params}`,
        { headers: getAuthHeaders() }
      );
      const result = await handle(resp);

      // Handle the backend response format
      if (result && result.success && typeof result.unread_count === 'number') {
        return {
          success: true,
          count: result.unread_count
        };
      }

      return {
        success: false,
        count: 0
      };
    },
    markInAppAsRead: async (notificationId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/notifications/in-app/${notificationId}/read`,
        { method: 'PUT', headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    markAllInAppAsRead: async (organizationId = null) => {
      const body = organizationId ? { organization_id: organizationId } : {};
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/notifications/in-app/mark-all-read`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(body)
        }
      );
      return handle(resp);
    },
    // Notification Preferences
    getPreferences: async () => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/users/notifications/preferences`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    updatePreferences: async (preferences) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/users/notifications/preferences`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(preferences),
        }
      );
      return handle(resp);
    },
  },

  // AI Projects
  aiProjects: {
    preview: async ({
      name,
      project_type = 'general',
      team_size = 5,
      team_experience = 'intermediate',
      organization_id,
    }) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/ai-projects/ai-preview`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name,
            project_type,
            team_size,
            team_experience,
            organization_id,
          }),
        }
      );
      return handle(resp);
    },
    createAIProject: async (organizationId, data) => {
      // Map incoming data to backend simple create contract
      const payload = {
        name:
          data.name ||
          data.overview?.title ||
          data.configuration?.name ||
          'Untitled Project',
        description:
          data.description ||
          data.overview?.description ||
          data.configuration?.description ||
          '',
        organization_id: data.organization_id || organizationId,
        generated_tasks: data.generated_tasks || data.tasks || [],
        configuration: data.configuration || {},
        tech_stack: data.tech_stack || data.techStack || {},
        workflow: data.workflow || {},
      };
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/ai-projects/ai-create-simple`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      return handle(resp);
    },
    createFromPreview: async ({ confirmation_data, final_tasks, workflow }) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/ai-projects/ai-create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ confirmation_data, final_tasks, workflow }),
      });
      return handle(resp);
    },
  },

  // Add AI task to board card (helper)
  aiProjectsTaskToBoard: async (organizationId, projectId, taskData) => {
    const payload = {
      organization_id: organizationId,
      project_id: projectId,
      task_data: taskData,
    };
    const resp = await fetch(
      `${API_BASE_URL}/api/v1/ai-projects/ai-task-to-board`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return handle(resp);
  },

  // AI Projects metadata
  aiProjectsMeta: {
    getTemplates: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/ai-projects/templates`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    getTechStacks: async () => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/ai-projects/tech-stacks`,
        {
          headers: getAuthHeaders(),
        }
      );
      return handle(resp);
    },
  },

  // AI Info
  ai: {
    getModels: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/ai/models`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    getWorkflows: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/ai/workflows`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
    getInsights: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/ai/insights`, {
        headers: getAuthHeaders(),
      });
      return handle(resp);
    },
  },

  // Project Sign-off
  projectSignoff: {
    requestSignoff: async (projectId, requestData) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/project-signoff/${projectId}/request-signoff`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(requestData),
        }
      );
      return handle(resp);
    },
    approveSignoff: async (projectId, approvalData) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/project-signoff/${projectId}/approve-signoff`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(approvalData),
        }
      );
      return handle(resp);
    },
    getSignoffStatus: async (projectId) => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/project-signoff/${projectId}/signoff-status`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
    getPendingSignoffs: async () => {
      const resp = await fetch(
        `${API_BASE_URL}/api/v1/project-signoff/pending-signoffs`,
        { headers: getAuthHeaders() }
      );
      return handle(resp);
    },
  },

  // Support endpoints
  support: {
    getTickets: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/tickets`, {
        headers: getAuthHeaders()
      });
      return handle(resp);
    },
    createTicket: async (ticketData) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(ticketData)
      });
      return handle(resp);
    },
    getTicket: async (ticketId) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/tickets/${ticketId}`, {
        headers: getAuthHeaders()
      });
      return handle(resp);
    },
    updateTicket: async (ticketId, updateData) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updateData)
      });
      return handle(resp);
    },
    sendContactMessage: async (messageData) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(messageData)
      });
      return handle(resp);
    },
    getHelpArticles: async () => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/help-articles`, {
        headers: getAuthHeaders()
      });
      return handle(resp);
    },
    getHelpArticle: async (articleId) => {
      const resp = await fetch(`${API_BASE_URL}/api/v1/support/help-articles/${articleId}`, {
        headers: getAuthHeaders()
      });
      return handle(resp);
    }
  },
};

// Standardized checklist item update function (matches requirements)
export const updateChecklistItem = async (itemId, isCompleted) => {
  const resp = await fetch(`${API_BASE_URL}/api/v1/checklist/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ is_completed: isCompleted }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
};

export default realApiService;