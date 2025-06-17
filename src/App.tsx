import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider, setGlobalToastManager, useToast } from './components/WebToast';
import { AlertProvider, setGlobalAlertManager, useAlert } from './components/WebAlert';
import { setGlobalNavigate } from './hooks/useWebNavigation';
import { useNavigate } from 'react-router-dom';

// Import main components
import CreateAgentRun from './create-agent-run';
import ListAgentRuns from './list-agent-runs';
import ListOrganizations from './list-organizations';
import ProjectDashboard from './components/ProjectDashboard';
import GitHubCallback from './components/GitHubCallback';

// App Layout Component
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
      <header className="app-header">
        <div className="app-header-content">
          <h1 className="app-title">Codegen</h1>
          <nav className="app-nav">
            <button 
              className="nav-button"
              onClick={() => navigate('/agent-runs')}
            >
              Agent Runs
            </button>
            <button 
              className="nav-button"
              onClick={() => navigate('/create')}
            >
              Create Run
            </button>
            <button 
              className="nav-button"
              onClick={() => navigate('/organizations')}
            >
              Organizations
            </button>
            <button 
              className="nav-button"
              onClick={() => navigate('/projects')}
            >
              Projects
            </button>
          </nav>
        </div>
      </header>
      
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <ToastProvider>
        <AlertProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/agent-runs" replace />} />
              <Route path="/agent-runs" element={<ListAgentRuns />} />
              <Route path="/create" element={<CreateAgentRun />} />
              <Route path="/organizations" element={<ListOrganizations />} />
              <Route path="/projects" element={<ProjectDashboard />} />
              <Route path="/auth/callback" element={<GitHubCallback />} />
              <Route path="*" element={<Navigate to="/agent-runs" replace />} />
            </Routes>
          </AppLayout>
        </AlertProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
