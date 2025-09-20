import React from 'react';
import Icon from '../AppIcon';

const Toast = ({ toast, onClose }) => {
  const getToastStyles = (type) => {
    const baseStyles = 'fixed bottom-6 right-6 rounded-xl shadow-lg px-6 py-4 z-[60] border max-w-md transform transition-all duration-300 ease-in-out';
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-800`;
      case 'info':
      default:
        return `${baseStyles} bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800`;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'CheckCircle';
      case 'error':
        return 'AlertCircle';
      case 'warning':
        return 'AlertTriangle';
      case 'info':
      default:
        return 'Info';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className={getToastStyles(toast.type)}>
      <div className='flex items-start gap-3'>
        <div className={`flex-shrink-0 ${getIconColor(toast.type)}`}>
          <Icon name={getIcon(toast.type)} size={20} />
        </div>
        <div className='flex-1'>
          <div className='font-medium text-sm leading-relaxed'>
            {toast.message}
          </div>
        </div>
        <button 
          className='flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors ml-2'
          onClick={() => onClose(toast.id)}
        >
          <Icon name='X' size={16} />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = ({ toasts, onClose }) => {
  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            bottom: `${24 + (index * 80)}px`, // Stack toasts vertically
            right: '24px'
          }}
          className='fixed z-[60]'
        >
          <Toast toast={toast} onClose={onClose} />
        </div>
      ))}
    </>
  );
};

export default Toast;
export { ToastContainer };
