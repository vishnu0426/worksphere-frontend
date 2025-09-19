import React, { useState } from 'react';
import Button from '../ui/Button';
import { testBackendConnection, testLogin } from '../../utils/testConnection';
import { runAllTests, testCardFiltering, testChecklistCORS } from '../../utils/debugApiTest';

const ConnectionTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, status, details) => {
    setResults(prev => [...prev, {
      test,
      status,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runConnectionTest = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const connectionResult = await testBackendConnection();
      
      if (connectionResult.health) {
        addResult('Health Check', 'SUCCESS', 'Backend is responding');
      } else {
        addResult('Health Check', 'FAILED', connectionResult.error || 'Backend not responding');
      }
      
      if (connectionResult.cors) {
        addResult('CORS Check', 'SUCCESS', 'CORS is properly configured');
      } else {
        addResult('CORS Check', 'FAILED', 'CORS configuration issue');
      }
      
    } catch (error) {
      addResult('Connection Test', 'FAILED', error.message);
    }
    
    setLoading(false);
  };

  const runLoginTest = async () => {
    setLoading(true);

    try {
      const loginResult = await testLogin();

      if (loginResult.success) {
        addResult('Login Test', 'SUCCESS', 'Demo login successful');
      } else {
        addResult('Login Test', 'FAILED', loginResult.error?.message || 'Login failed');
      }

    } catch (error) {
      addResult('Login Test', 'FAILED', error.message);
    }

    setLoading(false);
  };

  const runCardFilteringTest = async () => {
    setLoading(true);

    try {
      const result = await testCardFiltering();

      if (result.success) {
        addResult('Card Filtering', 'SUCCESS', `Retrieved ${result.cardCount} cards`);
      } else {
        addResult('Card Filtering', 'FAILED', result.error || 'Card filtering failed');
      }

    } catch (error) {
      addResult('Card Filtering', 'FAILED', error.message);
    }

    setLoading(false);
  };

  const runChecklistTest = async () => {
    setLoading(true);

    try {
      const result = await testChecklistCORS();

      if (result.success) {
        addResult('Checklist CORS', 'SUCCESS', result.note || 'CORS working properly');
      } else {
        addResult('Checklist CORS', 'FAILED', result.error || 'CORS issue detected');
      }

    } catch (error) {
      addResult('Checklist CORS', 'FAILED', error.message);
    }

    setLoading(false);
  };

  const runAllApiTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      const results = await runAllTests();

      // Add results for each test
      if (results.cardFiltering.success) {
        addResult('Card Filtering', 'SUCCESS', `Retrieved ${results.cardFiltering.cardCount} cards`);
      } else {
        addResult('Card Filtering', 'FAILED', results.cardFiltering.error || 'Failed');
      }

      if (results.checklistCORS.success) {
        addResult('Checklist CORS', 'SUCCESS', results.checklistCORS.note || 'Working');
      } else {
        addResult('Checklist CORS', 'FAILED', results.checklistCORS.error || 'Failed');
      }

    } catch (error) {
      addResult('All API Tests', 'FAILED', error.message);
    }

    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 bg-white border border-border rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Backend Connection Test</h2>
      
      <div className="flex flex-wrap gap-3 mb-6">
        <Button
          onClick={runConnectionTest}
          loading={loading}
          variant="outline"
        >
          Test Connection
        </Button>
        <Button
          onClick={runLoginTest}
          loading={loading}
          variant="outline"
        >
          Test Login
        </Button>
        <Button
          onClick={runCardFilteringTest}
          loading={loading}
          variant="outline"
        >
          Test Card Filtering
        </Button>
        <Button
          onClick={runChecklistTest}
          loading={loading}
          variant="outline"
        >
          Test Checklist CORS
        </Button>
        <Button
          onClick={runAllApiTests}
          loading={loading}
          variant="default"
        >
          Run All Tests
        </Button>
        <Button
          onClick={clearResults}
          variant="ghost"
          disabled={results.length === 0}
        >
          Clear Results
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Test Results:</h3>
          {results.map((result, index) => (
            <div 
              key={index}
              className={`p-3 rounded border-l-4 ${
                result.status === 'SUCCESS' 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-red-50 border-red-400'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{result.test}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    result.status === 'SUCCESS' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{result.timestamp}</span>
              </div>
              {result.details && (
                <p className="text-sm text-gray-600 mt-1">{result.details}</p>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-50 rounded text-sm">
        <p className="font-medium mb-2">Expected Backend URL:</p>
        <code className="text-blue-600">{process.env.REACT_APP_API_URL || 'http://192.168.9.119:8000'}</code>
        <p className="mt-2 text-gray-600">
          Make sure the backend server is running on this URL.
        </p>
      </div>
    </div>
  );
};

export default ConnectionTest;
