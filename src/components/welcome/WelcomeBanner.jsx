import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const WelcomeBanner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract welcome data from navigation state
  const welcomeData = location.state || {};
  const {
    showWelcome = false,
    welcomeMessage = '',
    userInfo = {},
    organizationInfo = {},
    rolePermissions = {},
    nextSteps = [],
    isNewUser = false
  } = welcomeData;

  useEffect(() => {
    if (showWelcome && isNewUser) {
      setIsVisible(true);
      // Auto-expand for a few seconds
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, isNewUser]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Clear the welcome state from navigation
    navigate(location.pathname, { replace: true, state: {} });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible || !showWelcome) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg overflow-hidden">
        {/* Main banner */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon name="Users" size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Welcome to {organizationInfo.name}! 🎉
                </h3>
                <p className="text-gray-700 mb-2">
                  Hi {userInfo.name}! {welcomeMessage || `You've successfully joined as a ${rolePermissions.title || userInfo.role}.`}
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-sm text-blue-700">
                    <Icon name="Shield" size={14} className="mr-1" />
                    <span className="font-medium">{rolePermissions.title || userInfo.role}</span>
                  </div>
                  <div className="flex items-center text-sm text-green-700">
                    <Icon name="Mail" size={14} className="mr-1" />
                    <span>Welcome email sent</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="text-blue-600 hover:text-blue-700"
              >
                <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-700"
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-blue-200 bg-white bg-opacity-50">
            <div className="p-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Permissions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Icon name="Key" size={16} className="text-green-600 mr-2" />
                    Your Capabilities
                  </h4>
                  <ul className="space-y-2">
                    {(rolePermissions.capabilities || []).slice(0, 3).map((capability, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <Icon name="Check" size={14} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{capability}</span>
                      </li>
                    ))}
                    {(rolePermissions.capabilities || []).length > 3 && (
                      <li className="text-sm text-blue-600 font-medium">
                        +{rolePermissions.capabilities.length - 3} more capabilities
                      </li>
                    )}
                  </ul>
                </div>

                {/* Next Steps */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Icon name="Rocket" size={16} className="text-purple-600 mr-2" />
                    Get Started
                  </h4>
                  <ul className="space-y-2">
                    {nextSteps.slice(0, 3).map((step, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <div className="w-4 h-4 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold mr-2 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-blue-200">
                <div className="text-sm text-gray-600">
                  <Icon name="Info" size={14} className="inline mr-1" />
                  Check your email for detailed getting started guide
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/profile')}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    Complete Profile
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/projects')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Explore Projects
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeBanner;
