// Test connection to backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.9.119:8000';

export const testBackendConnection = async () => {
  console.log('🔍 Testing backend connection...');
  
  try {
    // Test basic health endpoint
    const healthResponse = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend is healthy:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }
    
    // Test CORS preflight
    const corsResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    console.log('CORS preflight status:', corsResponse.status);
    
    if (corsResponse.ok) {
      console.log('✅ CORS is properly configured');
    } else {
      console.log('❌ CORS configuration issue');
    }
    
    return {
      health: healthResponse.ok,
      cors: corsResponse.ok,
    };
    
  } catch (error) {
    console.error('❌ Backend connection test failed:', error);
    return {
      health: false,
      cors: false,
      error: error.message,
    };
  }
};

// Test login with demo credentials
export const testLogin = async () => {
  console.log('🔐 Testing login...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'owner123',
      }),
    });
    
    console.log('Login response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful:', data);
      return { success: true, data };
    } else {
      const errorData = await response.json();
      console.log('❌ Login failed:', errorData);
      return { success: false, error: errorData };
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return { success: false, error: error.message };
  }
};
