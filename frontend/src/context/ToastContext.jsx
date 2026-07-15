import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let Icon = CheckCircle;
          let themeClasses = 'bg-dark-card border-accent-emerald text-accent-emerald';
          
          if (toast.type === 'error') {
            Icon = XCircle;
            themeClasses = 'bg-dark-card border-accent-rose text-accent-rose';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            themeClasses = 'bg-dark-card border-accent-amber text-accent-amber';
          } else if (toast.type === 'info') {
            Icon = Info;
            themeClasses = 'bg-dark-card border-accent-teal text-accent-teal';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center justify-between p-4 rounded-2xl border bg-dark-card shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100 hover:scale-[1.02] pointer-events-auto border-l-4`}
              role="alert"
            >
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium text-dark-text">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-dark-muted hover:text-dark-text p-1 transition-colors duration-150"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
