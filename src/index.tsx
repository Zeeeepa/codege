import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Initialize environment variables from various sources
function initializeEnvironment() {
  // Check for environment variables in data attributes
  const htmlElement = document.documentElement;
  const envVars = {
    CODEGEN_API_TOKEN: htmlElement.getAttribute('data-codegen-api-token'),
    CODEGEN_ORG_ID: htmlElement.getAttribute('data-codegen-org-id'),
    CODEGEN_USER_ID: htmlElement.getAttribute('data-codegen-user-id'),
    CODEGEN_API_BASE_URL: htmlElement.getAttribute('data-codegen-api-base-url'),
  };

  // Set on window for access by preferences system
  (window as any).ENV = Object.fromEntries(
    Object.entries(envVars).filter(([_, value]) => value !== null)
  );
}

// Initialize the application
function initializeApp() {
  initializeEnvironment();

  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Start the application
initializeApp();

