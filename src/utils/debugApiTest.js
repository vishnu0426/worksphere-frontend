// Debug API Test - Test both card filtering and checklist CORS issues
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const testCardFiltering = async () => {
  console.log('🔍 Testing card filtering...');
  
  try {
    // Test 1: Get all cards (should be filtered by organization)
    const allCardsResponse = await fetch(`${API_BASE_URL}/api/v1/cards/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('sessionToken')}`,
      },
      credentials: 'include',
    });
    
    console.log('All cards response status:', allCardsResponse.status);
    
    if (allCardsResponse.ok) {
      const allCardsData = await allCardsResponse.json();
      console.log('✅ All cards retrieved:', allCardsData.length, 'cards');
      console.log('Cards:', allCardsData.map(card => ({ id: card.id, title: card.title, column_id: card.column_id })));
    } else {
      console.log('❌ Failed to get all cards:', allCardsResponse.status);
    }
    
    // Test 2: Get cards by project (if we have a project ID)
    // This would need to be called with an actual project ID
    
    return {
      success: allCardsResponse.ok,
      cardCount: allCardsResponse.ok ? (await allCardsResponse.json()).length : 0,
    };
    
  } catch (error) {
    console.error('❌ Card filtering test failed:', error);
    return { success: false, error: error.message };
  }
};

export const testChecklistCORS = async (testItemId = 'test-item-id') => {
  console.log('🔍 Testing checklist CORS...');
  
  try {
    // Test checklist item update (this was failing with CORS)
    const updateResponse = await fetch(`${API_BASE_URL}/api/v1/checklist/items/${testItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('sessionToken')}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        text: 'Test checklist item',
        completed: true,
      }),
    });
    
    console.log('Checklist update response status:', updateResponse.status);
    
    if (updateResponse.ok) {
      console.log('✅ Checklist CORS working');
      return { success: true };
    } else if (updateResponse.status === 404) {
      console.log('✅ Checklist CORS working (404 expected for test item)');
      return { success: true, note: 'CORS working, test item not found (expected)' };
    } else {
      const errorData = await updateResponse.json();
      console.log('❌ Checklist update failed:', errorData);
      return { success: false, error: errorData };
    }
    
  } catch (error) {
    console.error('❌ Checklist CORS test failed:', error);
    
    if (error.message.includes('CORS')) {
      return { success: false, error: 'CORS issue still present', details: error.message };
    }
    
    return { success: false, error: error.message };
  }
};

export const testProjectSpecificCards = async (projectId) => {
  console.log(`🔍 Testing project-specific cards for project: ${projectId}`);
  
  try {
    // Test getting cards for a specific project
    const projectCardsResponse = await fetch(`${API_BASE_URL}/api/v1/cards/projects/${projectId}/cards`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('sessionToken')}`,
      },
      credentials: 'include',
    });
    
    console.log('Project cards response status:', projectCardsResponse.status);
    
    if (projectCardsResponse.ok) {
      const projectCardsData = await projectCardsResponse.json();
      console.log('✅ Project cards retrieved:', projectCardsData.length, 'cards');
      console.log('Project cards:', projectCardsData.map(card => ({ id: card.id, title: card.title })));
      return { success: true, cardCount: projectCardsData.length };
    } else {
      const errorData = await projectCardsResponse.json();
      console.log('❌ Failed to get project cards:', errorData);
      return { success: false, error: errorData };
    }
    
  } catch (error) {
    console.error('❌ Project cards test failed:', error);
    return { success: false, error: error.message };
  }
};

export const runAllTests = async () => {
  console.log('🚀 Running all API debug tests...');
  
  const results = {
    cardFiltering: await testCardFiltering(),
    checklistCORS: await testChecklistCORS(),
    timestamp: new Date().toISOString(),
  };
  
  console.log('📊 Test Results:', results);
  return results;
};
