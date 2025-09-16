import React, { useState } from 'react';
import Button from '../ui/Button';

const API_BASE_URL = process.env.REACT_APP_API_URL;
if (!API_BASE_URL) {
  throw new Error('REACT_APP_API_URL must be defined');
}

const ApiTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, result, error = null) => {
    setResults(prev => [...prev, {
      test,
      result,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testHealthEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3002/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      addResult('Health Check', 'SUCCESS', null);
      console.log('Health check result:', data);
    } catch (error) {
      addResult('Health Check', 'FAILED', error.message);
      console.error('Health check error:', error);
    }
    setLoading(false);
  };

  const testCORS = async () => {
    setLoading(true);
    try {
      // Test CORS preflight
      const response = await fetch('http://localhost:3002/api/v1/auth/register', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3002',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      if (response.ok) {
        addResult('CORS Preflight', 'SUCCESS', null);
        console.log('CORS headers:', response.headers);
      } else {
        addResult('CORS Preflight', 'FAILED', `Status: ${response.status}`);
      }
    } catch (error) {
      addResult('CORS Preflight', 'FAILED', error.message);
      console.error('CORS test error:', error);
    }
    setLoading(false);
  };

  const testRegistration = async () => {
    setLoading(true);
    try {
      const testData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!',
        first_name: 'Test',
        last_name: 'User',
        organization_name: 'Test Org'
      };

      const response = await fetch('http://localhost:3002/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const data = await response.json();
        addResult('Registration', 'SUCCESS', null);
        console.log('Registration result:', data);
      } else {
        const errorData = await response.json();
        addResult('Registration', 'FAILED', errorData.message || 'Unknown error');
      }
    } catch (error) {
      addResult('Registration', 'FAILED', error.message);
      console.error('Registration error:', error);
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3002/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123!'
        })
      });

      if (response.ok) {
        const data = await response.json();
        addResult('Login', 'SUCCESS', null);
        console.log('Login result:', data);
      } else {
        const errorData = await response.json();
        addResult('Login', 'FAILED', errorData.message || 'Unknown error');
      }
    } catch (error) {
      addResult('Login', 'FAILED', error.message);
      console.error('Login error:', error);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Connection Test</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={testHealthEndpoint} disabled={loading}>
          Test Health Endpoint
        </Button>
        <Button onClick={testCORS} disabled={loading}>
          Test CORS
        </Button>
        <Button onClick={testRegistration} disabled={loading}>
          Test Registration
        </Button>
        <Button onClick={testLogin} disabled={loading}>
          Test Login
        </Button>
        <Button onClick={clearResults} variant="outline">
          Clear Results
        </Button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">No tests run yet</p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className={`p-3 rounded ${
                result.error ? 'bg-red-100 border border-red-300' : 'bg-green-100 border border-green-300'
              }`}>
                <div className="flex justify-between items-start">
                  <span className="font-medium">{result.test}</span>
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
                <div className={`text-sm ${result.error ? 'text-red-700' : 'text-green-700'}`}>
                  Status: {result.result}
                </div>
                {result.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiTest;
