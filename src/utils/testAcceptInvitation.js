/**
 * Test utility to verify the accept-invitation endpoint is working
 * Run this in the browser console to test the endpoint
 */

export const testAcceptInvitationEndpoint = async () => {
  console.log('🔍 Testing Accept Invitation Endpoint from Frontend...');
  
  const API_BASE_URL = 'http://192.168.9.119:8000';
  const endpoint = `${API_BASE_URL}/api/v1/organizations/accept-invitation`;
  
  const testData = {
    token: "test-token-123",
    temporary_password: "temp123",
    new_password: "newpassword123",
    first_name: "Test",
    last_name: "User"
  };
  
  try {
    console.log(`📡 Making POST request to: ${endpoint}`);
    console.log('📦 Request data:', testData);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('📄 Response Data:', responseData);
    
    if (response.status === 405) {
      console.error('❌ 405 Method Not Allowed - Endpoint missing or wrong method');
      return { success: false, error: '405 Method Not Allowed' };
    } else if (response.status === 400) {
      console.log('✅ 400 Bad Request - Endpoint exists, validation failed (expected for test token)');
      return { success: true, message: 'Endpoint is working correctly' };
    } else if (response.status === 404) {
      console.error('❌ 404 Not Found - Endpoint does not exist');
      return { success: false, error: '404 Not Found' };
    } else {
      console.log(`ℹ️ Unexpected status: ${response.status}`);
      return { success: true, message: `Endpoint responded with ${response.status}` };
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error);
    return { success: false, error: error.message };
  }
};

// Test function that can be called from browser console
window.testAcceptInvitation = testAcceptInvitationEndpoint;

// Auto-run test if in development
if (process.env.NODE_ENV === 'development') {
  console.log('🚀 Accept Invitation Endpoint Test Available');
  console.log('Run: testAcceptInvitation() in browser console to test');
}

export default testAcceptInvitationEndpoint;
