import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Icon from '../AppIcon';
import { ButtonAudit } from '../../utils/buttonAudit';

const ButtonAuditPanel = () => {
  const [auditResults, setAuditResults] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDetails, setShowDetails] = useState(false);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const audit = new ButtonAudit();
      const results = audit.scanButtons();
      setAuditResults(results);
    } catch (error) {
      console.error('Audit failed:', error);
    } finally {
      setIsAuditing(false);
    }
  };

  const testButtons = async () => {
    if (!auditResults) return;
    
    setIsAuditing(true);
    try {
      const audit = new ButtonAudit();
      audit.auditResults = auditResults.detailedResults;
      await audit.testButtonFunctionality(20);
      
      // Update results with test data
      setAuditResults(prev => ({
        ...prev,
        detailedResults: audit.auditResults
      }));
    } catch (error) {
      console.error('Button testing failed:', error);
    } finally {
      setIsAuditing(false);
    }
  };

  const getFilteredButtons = () => {
    if (!auditResults) return [];
    
    if (selectedCategory === 'all') {
      return auditResults.detailedResults;
    }
    
    return auditResults.categories[selectedCategory] || [];
  };

  const getStatusColor = (functionality) => {
    switch (functionality) {
      case 'functional': return 'text-green-600';
      case 'non-functional': return 'text-red-600';
      case 'disabled': return 'text-gray-500';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = (functionality) => {
    switch (functionality) {
      case 'functional': return 'CheckCircle';
      case 'non-functional': return 'XCircle';
      case 'disabled': return 'MinusCircle';
      default: return 'AlertCircle';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Button Audit Panel</h2>
          <p className="text-sm text-gray-600">Comprehensive audit of all interactive elements</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runAudit}
            loading={isAuditing}
            iconName="Search"
            iconPosition="left"
          >
            Run Audit
          </Button>
          {auditResults && (
            <Button
              onClick={testButtons}
              loading={isAuditing}
              variant="outline"
              iconName="Play"
              iconPosition="left"
            >
              Test Buttons
            </Button>
          )}
        </div>
      </div>

      {auditResults && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Icon name="MousePointer" size={20} className="text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-600">Total Buttons</p>
                  <p className="text-2xl font-bold text-blue-900">{auditResults.summary.totalButtons}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Icon name="CheckCircle" size={20} className="text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-green-600">Functional</p>
                  <p className="text-2xl font-bold text-green-900">{auditResults.summary.functionalButtons}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Icon name="XCircle" size={20} className="text-red-600 mr-2" />
                <div>
                  <p className="text-sm text-red-600">Non-Functional</p>
                  <p className="text-2xl font-bold text-red-900">{auditResults.summary.nonFunctionalButtons}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Icon name="Percent" size={20} className="text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-600">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{auditResults.summary.functionalityRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All ({auditResults.summary.totalButtons})
              </Button>
              {Object.entries(auditResults.categories).map(([category, buttons]) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category} ({buttons.length})
                </Button>
              ))}
            </div>
          </div>

          {/* Toggle Details */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              iconName={showDetails ? 'ChevronUp' : 'ChevronDown'}
              iconPosition="right"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>

          {/* Common Issues */}
          {auditResults.issues.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-2">Common Issues</h3>
              <ul className="space-y-1">
                {auditResults.issues.slice(0, 5).map((issue, index) => (
                  <li key={index} className="text-sm text-yellow-800">
                    <span className="font-medium">{issue.issue}</span> - {issue.count} occurrences
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {auditResults.recommendations.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {auditResults.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-blue-800">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Button List */}
          {showDetails && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 mb-3">
                Button Details ({getFilteredButtons().length})
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {getFilteredButtons().map((button, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            name={getStatusIcon(button.functionality)}
                            size={16}
                            className={getStatusColor(button.functionality)}
                          />
                          <span className="font-medium text-gray-900">
                            {button.text || 'No text'}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {button.type}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2">
                          {button.location.path}
                        </p>
                        
                        {button.issues.length > 0 && (
                          <div className="text-xs text-red-600">
                            Issues: {button.issues.join(', ')}
                          </div>
                        )}
                        
                        {button.testResult && (
                          <div className="text-xs text-green-600 mt-1">
                            Test: {button.testResult}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {button.location.visible ? 'Visible' : 'Hidden'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!auditResults && !isAuditing && (
        <div className="text-center py-12">
          <Icon name="Search" size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Click "Run Audit" to scan all buttons in the application</p>
        </div>
      )}
    </div>
  );
};

export default ButtonAuditPanel;
