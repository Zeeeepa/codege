import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AlertOptions {
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    style?: 'default' | 'destructive';
    onAction?: () => void;
  };
  dismissAction?: {
    title: string;
    onAction?: () => void;
  };
  icon?: string;
}

export interface ConfirmAlertOptions {
  title: string;
  message?: string;
  confirmTitle?: string;
  cancelTitle?: string;
  icon?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => Promise<boolean>;
  confirmAlert: (options: ConfirmAlertOptions) => Promise<boolean>;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertState {
  isVisible: boolean;
  options: AlertOptions | null;
  resolve: ((value: boolean) => void) | null;
}

// Alert Provider Component
function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    isVisible: false,
    options: null,
    resolve: null,
  });

  const showAlert = useCallback((options: AlertOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlertState({
        isVisible: true,
        options,
        resolve,
      });
    });
  }, []);

  const confirmAlert = useCallback((options: ConfirmAlertOptions): Promise<boolean> => {
    const alertOptions: AlertOptions = {
      title: options.title,
      message: options.message,
      icon: options.icon,
      primaryAction: {
        title: options.confirmTitle || 'Confirm',
        style: 'destructive',
      },
      dismissAction: {
        title: options.cancelTitle || 'Cancel',
      },
    };

    return showAlert(alertOptions);
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlertState(prev => {
      if (prev.resolve) {
        prev.resolve(false);
      }
      return {
        isVisible: false,
        options: null,
        resolve: null,
      };
    });
  }, []);

  const handlePrimaryAction = useCallback(() => {
    const { resolve, options } = alertState;
    options?.primaryAction?.onAction?.();
    resolve?.(true);
    setAlertState({
      isVisible: false,
      options: null,
      resolve: null,
    });
  }, [alertState]);

  const handleDismissAction = useCallback(() => {
    const { resolve, options } = alertState;
    options?.dismissAction?.onAction?.();
    resolve?.(false);
    setAlertState({
      isVisible: false,
      options: null,
      resolve: null,
    });
  }, [alertState]);

  return (
    <AlertContext.Provider value={{ showAlert, confirmAlert, hideAlert }}>
      {children}
      {alertState.isVisible && alertState.options && (
        <AlertModal
          options={alertState.options}
          onPrimaryAction={handlePrimaryAction}
          onDismissAction={handleDismissAction}
          onClose={hideAlert}
        />
      )}
    </AlertContext.Provider>
  );
}

// Alert Modal Component
function AlertModal({
  options,
  onPrimaryAction,
  onDismissAction,
  onClose,
}: {
  options: AlertOptions;
  onPrimaryAction: () => void;
  onDismissAction: () => void;
  onClose: () => void;
}) {
  return (
    <div className="alert-overlay" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="alert-content">
          {options.icon && (
            <div className={`alert-icon ${options.icon}`}></div>
          )}
          
          <div className="alert-text">
            <h3 className="alert-title">{options.title}</h3>
            {options.message && (
              <p className="alert-message">{options.message}</p>
            )}
          </div>
        </div>
        
        <div className="alert-actions">
          {options.dismissAction && (
            <button
              className="alert-button secondary"
              onClick={onDismissAction}
            >
              {options.dismissAction.title}
            </button>
          )}
          
          {options.primaryAction && (
            <button
              className={`alert-button primary ${options.primaryAction.style || 'default'}`}
              onClick={onPrimaryAction}
            >
              {options.primaryAction.title}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to use alert functionality
export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

// Utility functions that match Raycast API
export function showAlert(options: AlertOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const event = new CustomEvent('show-alert', { detail: { options, resolve } });
    window.dispatchEvent(event);
  });
}

export function confirmAlert(options: ConfirmAlertOptions): Promise<boolean> {
  const alertOptions: AlertOptions = {
    title: options.title,
    message: options.message,
    icon: options.icon,
    primaryAction: {
      title: options.confirmTitle || 'Confirm',
      style: 'destructive',
    },
    dismissAction: {
      title: options.cancelTitle || 'Cancel',
    },
  };

  return showAlert(alertOptions);
}

// Global alert manager for non-hook usage
let globalAlertManager: AlertContextType | null = null;

export function setGlobalAlertManager(manager: AlertContextType) {
  globalAlertManager = manager;
}

// Listen for global alert events
if (typeof window !== 'undefined') {
  window.addEventListener('show-alert', (event: any) => {
    if (globalAlertManager) {
      const { options, resolve } = event.detail;
      globalAlertManager.showAlert(options).then(resolve);
    }
  });
}

// Alert style constants (matching Raycast)
export const Alert = {
  ActionStyle: {
    Default: 'default' as const,
    Destructive: 'destructive' as const,
  },
};

export { AlertProvider };
