// Session-based authentication service that stores sessions in database
// This replaces localStorage-based token storage

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.9.119:8000';

class SessionService {
  constructor() {
    this.currentSession = null;
    this.sessionToken = null;
    this.refreshToken = null;
    this.user = null;
  }

  // Initialize session from any existing data
  async initialize() {
    try {
      // Check if we have session tokens (could be from previous session)
      const sessionToken = this.getSessionToken();
      const refreshToken = this.getRefreshToken();

      if (sessionToken) {
        console.log('🔍 SESSION: Found existing session token, validating...');
        const isValid = await this.validateSession(sessionToken);

        if (isValid) {
          console.log('✅ SESSION: Session is valid');
          return true;
        } else {
          console.log('❌ SESSION: Session invalid, trying refresh...');
          if (refreshToken) {
            const refreshed = await this.refreshSession(refreshToken);
            if (refreshed) {
              console.log('✅ SESSION: Session refreshed successfully');
              return true;
            }
          }
        }
      }

      console.log('ℹ️ SESSION: No valid session found');
      this.clearSession();
      return false;
    } catch (error) {
      console.error('❌ SESSION: Initialization failed:', error);
      this.clearSession();
      return false;
    }
  }

  // Login with email and password
  async login(email, password) {
    try {
      console.log('🔐 SESSION: Attempting login...');

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const result = await response.json();
      // Support multiple API response shapes.
      // Some API endpoints wrap the actual payload under a "data" key while others return the
      // payload at the top level. If "data" exists, prefer it; otherwise use the root object.
      const payload = result?.data ?? result;

      // If the backend includes a success flag and an error, propagate the error.
      if (payload?.success === false) {
        const errMsg =
          payload?.error?.message ||
          payload?.message ||
          'Login failed';
        throw new Error(errMsg);
      }

      // Ensure required fields exist
      const tokens = payload?.tokens || {};
      const user = payload?.user || null;
      const organization = payload?.organization || null;
      const organizations = payload?.organizations || [];

      // Only proceed if token and user exist; otherwise throw
      if (!tokens?.access_token || !user) {
        throw new Error('Unexpected response format from login API');
      }

      // Store session data
      this.sessionToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      this.user = user;
      this.currentSession = {
        user,
        organization,
        organizations: Array.isArray(organizations) ? organizations : [],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Store in sessionStorage (not localStorage) for security
      this.storeSession();

      console.log('✅ SESSION: Login successful');
      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error('❌ SESSION: Login failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Logout and clear session
  async logout() {
    try {
      console.log('🚪 SESSION: Logging out...');

      const sessionToken = this.getSessionToken();
      if (sessionToken) {
        // Call backend logout endpoint
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      this.clearSession();
      console.log('✅ SESSION: Logout successful');

      return { success: true };
    } catch (error) {
      console.error('❌ SESSION: Logout error:', error);
      this.clearSession(); // Clear anyway
      return { success: false, error: error.message };
    }
  }

  // Validate current session with backend
  async validateSession(sessionToken = null) {
    try {
      const token = sessionToken || this.getSessionToken();
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        // Support both wrapped and unwrapped response shapes
        const payload = userData?.data ?? userData;
        // If backend includes success flag and it's false, treat as invalid
        if (payload?.success === false) {
          return false;
        }
        this.user = payload;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ SESSION: Validation failed:', error);
      return false;
    }
  }

  // Refresh session using refresh token
  async refreshSession(refreshToken = null) {
    try {
      const token = refreshToken || this.getRefreshToken();
      if (!token) return false;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/refresh-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: token }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const payload = result?.data ?? result;
        const tokens = payload?.tokens || payload; // fallback: some endpoints may return {access_token, refresh_token} directly
        // In refresh token endpoint, the response model is TokenResponse (access_token, refresh_token, expires_in)
        // so tokens may be at top-level
        this.sessionToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        this.storeSession();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ SESSION: Refresh failed:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!(this.sessionToken && this.user);
  }

  // Get session token for API calls
  getSessionToken() {
    if (this.sessionToken) return this.sessionToken;

    // Try to get from sessionStorage
    try {
      const stored = sessionStorage.getItem('agno_session');
      if (stored) {
        const session = JSON.parse(stored);
        return session.sessionToken;
      }
    } catch (error) {
      console.error('Error reading session from storage:', error);
    }

    return null;
  }

  // Get refresh token
  getRefreshToken() {
    if (this.refreshToken) return this.refreshToken;

    // Try to get from sessionStorage
    try {
      const stored = sessionStorage.getItem('agno_session');
      if (stored) {
        const session = JSON.parse(stored);
        return session.refreshToken;
      }
    } catch (error) {
      console.error('Error reading refresh token from storage:', error);
    }

    return null;
  }

  // Store session in sessionStorage
  storeSession() {
    try {
      const sessionData = {
        sessionToken: this.sessionToken,
        refreshToken: this.refreshToken,
        user: this.user,
        organization: this.currentSession?.organization,
        organizations: this.currentSession?.organizations || [],
        timestamp: Date.now(),
      };

      sessionStorage.setItem('agno_session', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  // Clear all session data
  clearSession() {
    this.currentSession = null;
    this.sessionToken = null;
    this.refreshToken = null;
    this.user = null;

    // Clear from storage
    try {
      sessionStorage.removeItem('agno_session');
      // Also clear any old localStorage data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('organizationId');
    } catch (error) {
      console.error('Error clearing session storage:', error);
    }
  }

  // Get auth headers for API calls
  getAuthHeaders() {
    const token = this.getSessionToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Get organization ID
  getOrganizationId() {
    // Try multiple sources for organization ID
    if (this.currentSession?.organization?.id) {
      return this.currentSession.organization.id;
    }

    if (this.currentSession?.organizations?.length > 0) {
      return this.currentSession.organizations[0].id;
    }

    if (this.user?.organizationId) {
      return this.user.organizationId;
    }

    // Try to get from stored session
    try {
      const stored = sessionStorage.getItem('agno_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session.organization?.id) {
          return session.organization.id;
        }
        if (session.user?.organizationId) {
          return session.user.organizationId;
        }
      }
    } catch (error) {
      console.error('Error reading organization ID from storage:', error);
    }

    // Fallback to explicit storage keys set elsewhere
    try {
      const explicit =
        sessionStorage.getItem('currentOrganizationId') ||
        sessionStorage.getItem('organizationId');
      if (explicit) return explicit;
    } catch (e) {
      // ignore
    }

    return null;
  }

  // Get user role
  getUserRole() {
    // Prefer live session info
    const roleFromSession = this.currentSession?.organization?.role;
    if (roleFromSession) return roleFromSession;

    // From in-memory user object
    if (this.user?.organizationRole) return this.user.organizationRole;
    if (this.user?.role) return this.user.role;

    // Try stored session snapshot
    try {
      const stored = sessionStorage.getItem('agno_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session.organization?.role) return session.organization.role;
        if (session.user?.role) return session.user.role;
      }
    } catch (error) {
      console.error('Error reading user role from storage:', error);
    }

    // Explicit userRole key set by other parts of the app
    try {
      const explicitRole = sessionStorage.getItem('userRole');
      if (explicitRole) return explicitRole;
    } catch (e) {
      // ignore
    }

    return null; // No default fallback - return null if no role found
  }

  // Get current organization object
  getCurrentOrganization() {
    // Try current session first
    if (this.currentSession?.organization) {
      return this.currentSession.organization;
    }

    // Try stored session
    try {
      const stored = sessionStorage.getItem('agno_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session.organization) {
          return session.organization;
        }
      }
    } catch (error) {
      console.error('Error reading organization from storage:', error);
    }

    // Return basic organization object if we have ID
    const orgId = this.getOrganizationId();
    if (orgId) {
      return {
        id: orgId,
        role: this.getUserRole()
      };
    }

    return null;
  }
}

// Create singleton instance
const sessionService = new SessionService();

export default sessionService;
