/**
 * Web-compatible navigation hook that matches Raycast's useNavigation API
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export interface NavigationOptions {
  replace?: boolean;
  state?: any;
}

export interface WebNavigationResult {
  push: (path: string, options?: NavigationOptions) => void;
  pop: () => void;
  replace: (path: string, options?: NavigationOptions) => void;
  goBack: () => void;
  goForward: () => void;
  currentPath: string;
}

/**
 * Hook that provides navigation functionality similar to Raycast's useNavigation
 */
export function useNavigation(): WebNavigationResult {
  const navigate = useNavigate();
  const location = useLocation();

  const push = useCallback((path: string, options: NavigationOptions = {}) => {
    navigate(path, {
      replace: options.replace || false,
      state: options.state,
    });
  }, [navigate]);

  const pop = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const replace = useCallback((path: string, options: NavigationOptions = {}) => {
    navigate(path, {
      replace: true,
      state: options.state,
    });
  }, [navigate]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  return {
    push,
    pop,
    replace,
    goBack,
    goForward,
    currentPath: location.pathname,
  };
}

// Alternative hook with more React Router-like API
export function useWebNavigation() {
  return useNavigation();
}

// Navigation utilities
export const Navigation = {
  push: (path: string, options?: NavigationOptions) => {
    // For imperative navigation outside of components
    const event = new CustomEvent('navigate', { 
      detail: { path, options, type: 'push' } 
    });
    window.dispatchEvent(event);
  },
  
  pop: () => {
    const event = new CustomEvent('navigate', { 
      detail: { type: 'pop' } 
    });
    window.dispatchEvent(event);
  },
  
  replace: (path: string, options?: NavigationOptions) => {
    const event = new CustomEvent('navigate', { 
      detail: { path, options, type: 'replace' } 
    });
    window.dispatchEvent(event);
  },
};

// Global navigation manager for non-hook usage
let globalNavigate: ((delta: number) => void) | ((to: string, options?: any) => void) | null = null;

export function setGlobalNavigate(navigateFunction: any) {
  globalNavigate = navigateFunction;
}

// Listen for global navigation events
if (typeof window !== 'undefined') {
  window.addEventListener('navigate', (event: any) => {
    if (globalNavigate) {
      const { path, options, type } = event.detail;
      
      switch (type) {
        case 'push':
          (globalNavigate as any)(path, options);
          break;
        case 'replace':
          (globalNavigate as any)(path, { ...options, replace: true });
          break;
        case 'pop':
          (globalNavigate as any)(-1);
          break;
      }
    }
  });
}

export default useNavigation;
