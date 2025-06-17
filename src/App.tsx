import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider, setGlobalToastManager, useToast } from './components/WebToast';
import { AlertProvider, setGlobalAlertManager, useAlert } from './components/WebAlert';
import { setGlobalNavigate } from './hooks/useWebNavigation';
import { useNavigate } from 'react-router-dom';
import { hasCredentials } from './utils/credentials';

// Import main components
import Dashboard from './components/Dashboard';
import GitHubCallback from './components/GitHubCallback';
import CredentialsSetup from './components/CredentialsSetup';

// For backward compatibility - these will be rendered inside the Dashboard
import CreateAgentRun from './create-agent-run';
import ListAgentRuns from './list-agent-runs';
import ListOrganizations from './list-organizations';
import ProjectDashboard from './components/ProjectDashboard';

// App Layout Component - No longer needed as Dashboard handles layout
function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const toastManager = useToast();
  const alertManager = useAlert();

  // Set global managers for non-hook usage
  React.useEffect(() => {
    setGlobalNavigate(navigate);
    setGlobalToastManager(toastManager);
    setGlobalAlertManager(alertManager);
  }, [navigate, toastManager, alertManager]);

  return (
    <div className="app-layout">
      {children}
    </div>
  );
}

// Main App Component
function App() {
  const [credentialsAvailable, setCredentialsAvailable] = React.useState<boolean | null>(null);

  // Check credentials on mount
  React.useEffect(() => {
    const checkCredentials = () => {
      const available = hasCredentials();
      console.log('🔑 Credentials check:', available);
      setCredentialsAvailable(available);
    };

    checkCredentials();

    // Listen for credentials changes
    const handleCredentialsChange = () => {
      checkCredentials();
    };

    window.addEventListener('preferences-changed', handleCredentialsChange);
    return () => {
      window.removeEventListener('preferences-changed', handleCredentialsChange);
    };
  }, []);

  // Show loading while checking credentials
  if (credentialsAvailable === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#e0e0e0',
        backgroundColor: '#121212'
      }}>
        <div className="loading-spinner" style={{
          border: '4px solid #333333',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          animation: 'spin 1s linear infinite',
          marginRight: '12px'
        }}></div>
        Loading...
      </div>
    );
  }

  // Show credentials setup if not available
  if (!credentialsAvailable) {
    return (
      <ToastProvider>
        <AlertProvider>
          <CredentialsSetup onCredentialsSet={() => setCredentialsAvailable(true)} />
        </AlertProvider>
      </ToastProvider>
    );
  }

  // Show main app if credentials are available
  return (
    <Router>
      <ToastProvider>
        <AlertProvider>
          <AppLayout>
            <Routes>
              {/* Auth callback route */}
              <Route path="/auth/callback" element={<GitHubCallback />} />
              
              {/* Main dashboard route */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Legacy routes - all render the Dashboard with the appropriate section */}
              <Route path="/agent-runs" element={<Dashboard />} />
              <Route path="/create" element={<Dashboard />} />
              <Route path="/organizations" element={<Dashboard />} />
              <Route path="/projects" element={<Dashboard />} />
              <Route path="/settings" element={<Dashboard />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </AlertProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;

