import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import Icon from '../AppIcon';

const WelcomeFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

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
      // Auto-advance through steps
      const timer = setTimeout(() => {
        if (currentStep < 2) {
          setCurrentStep(currentStep + 1);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome, isNewUser, currentStep]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Clear the welcome state from navigation
    navigate(location.pathname, { replace: true, state: {} });
  };

  const handleNextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible || !showWelcome) {
    return null;
  }

  const steps = [
    {
      title: `Welcome to ${organizationInfo.name}! 🎉`,
      content: (
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Users" size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hi {userInfo.name}! 👋
            </h2>
            <p className="text-gray-600 text-lg">
              {welcomeMessage || `You've successfully joined ${organizationInfo.name}`}
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <Icon name="Shield" size={20} className="text-blue-600 mr-2" />
              <span className="font-semibold text-blue-900">Your Role: {rolePermissions.title || userInfo.role}</span>
            </div>
            <p className="text-blue-700 text-sm">
              {rolePermissions.description || 'You have been assigned access to this organization'}
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Your Permissions & Capabilities',
      content: (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Icon name="Key" size={20} className="text-green-600 mr-2" />
              What you can do as a {rolePermissions.title}:
            </h3>
            <ul className="space-y-3">
              {(rolePermissions.capabilities || []).map((capability, index) => (
                <li key={index} className="flex items-start">
                  <Icon name="Check" size={16} className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{capability}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {rolePermissions.capabilities?.length === 0 && (
            <div className="text-center py-8">
              <Icon name="Info" size={24} className="text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600">Your permissions are being set up. Contact your administrator for details.</p>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Ready to Get Started! 🚀',
      content: (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Icon name="Rocket" size={20} className="text-purple-600 mr-2" />
              Next Steps:
            </h3>
            <div className="space-y-3">
              {nextSteps.map((step, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center mb-2">
              <Icon name="Mail" size={16} className="text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Welcome Email Sent!</span>
            </div>
            <p className="text-blue-700 text-sm">
              Check your email at <strong>{userInfo.email}</strong> for detailed information about your role and getting started guide.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{steps[currentStep].title}</h1>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <Icon name="X" size={20} />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex mt-4 space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-white' : 'bg-white bg-opacity-30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {steps[currentStep].content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <Icon name="ChevronLeft" size={16} className="mr-1" />
            Previous
          </Button>
          
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          
          <Button
            onClick={handleNextStep}
            className="flex items-center"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Get Started
                <Icon name="ArrowRight" size={16} className="ml-1" />
              </>
            ) : (
              <>
                Next
                <Icon name="ChevronRight" size={16} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeFlow;
