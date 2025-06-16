import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  style: 'success' | 'failure' | 'animated';
  duration?: number;
  primaryAction?: {
    title: string;
    onAction: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-hide toast after duration (default 3 seconds)
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// Toast Container Component
function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toasts, hideToast } = context;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onClose={() => hideToast(toast.id)} 
        />
      ))}
    </div>
  );
}

// Individual Toast Item Component
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getToastIcon = () => {
    switch (toast.style) {
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'animated':
        return '⏳';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`toast-item toast-${toast.style}`}>
      <div className="toast-content">
        <div className="toast-icon">{getToastIcon()}</div>
        <div className="toast-text">
          <div className="toast-title">{toast.title}</div>
          {toast.message && <div className="toast-message">{toast.message}</div>}
        </div>
      </div>
      
      <div className="toast-actions">
        {toast.primaryAction && (
          <button 
            className="toast-action-button primary"
            onClick={toast.primaryAction.onAction}
          >
            {toast.primaryAction.title}
          </button>
        )}
        <button 
          className="toast-close-button"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Hook to use toast functionality
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Utility functions that match Raycast API
export function showToast(toast: Omit<Toast, 'id'>) {
  // This will be called from components that don't have access to the hook
  // We'll need to implement a global toast manager
  const event = new CustomEvent('show-toast', { detail: toast });
  window.dispatchEvent(event);
}

export function showHUD(message: string) {
  showToast({
    title: message,
    style: 'success',
    duration: 2000,
  });
}

// Global toast manager for non-hook usage
let globalToastManager: ToastContextType | null = null;

export function setGlobalToastManager(manager: ToastContextType) {
  globalToastManager = manager;
}

// Listen for global toast events
if (typeof window !== 'undefined') {
  window.addEventListener('show-toast', (event: any) => {
    if (globalToastManager) {
      globalToastManager.showToast(event.detail);
    }
  });
}

// Toast style constants (matching Raycast)
export const Toast_Style = {
  Success: 'success' as const,
  Failure: 'failure' as const,
  Animated: 'animated' as const,
};

export { ToastProvider, Toast_Style as Toast };

