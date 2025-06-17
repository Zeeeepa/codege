import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAPIClient } from '../api/client';
import { validateCredentials, getCurrentUserInfo } from '../utils/credentials';
import { showToast, Toast_Style as Toast } from './WebToast';
import { getGitHubService } from '../services/github.service';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';
import { 
  DashboardSection, 
  DashboardProps, 
  DashboardState,
  UserInfo,
  Organization,
  AgentRun
} from '../types/dashboard';

// Lazy load components for better performance
const ListAgentRuns = lazy(() => import('../list-agent-runs'));
const CreateAgentRun = lazy(() => import('../create-agent-run'));
const ListOrganizations = lazy(() => import('../list-organizations'));
const ProjectDashboard = lazy(() => import('./ProjectDashboard'));

// Loading component for suspense fallback
const LoadingComponent = () => (
  <div className="component-loading">
    <div className="loading-spinner"></div>
    <p>Loading component...</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ initialSection }) => {
  const [state, setState] = useState<DashboardState>({
    activeSection: initialSection || DashboardSection.OVERVIEW,
    isLoading: true,
    userInfo: null,
    organizations: [],
    agentRuns: [],
    githubConnected: false,
    error: null
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const apiClient = getAPIClient();
  const githubService = getGitHubService();

  // Update state helper function
  const updateState = (newState: Partial<DashboardState>) => {
    setState(prevState => ({ ...prevState, ...newState }));
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        updateState({ isLoading: true, error: null });
        
        // Get user info
        const user = await getCurrentUserInfo();
        updateState({ userInfo: user as UserInfo });
        
        // Check GitHub connection
        const isGithubConnected = githubService.isAuthenticated();
        updateState({ githubConnected: isGithubConnected });
        
        // Get organizations
        const validation = await validateCredentials();
        if (validation.isValid && validation.organizations) {
          updateState({ organizations: validation.organizations as Organization[] });
        }
        
        // Set active section based on URL path
        const path = location.pathname;
        let activeSection = DashboardSection.OVERVIEW;
        
        if (path.includes('agent-runs')) {
          activeSection = DashboardSection.AGENT_RUNS;
        } else if (path.includes('create')) {
          activeSection = DashboardSection.CREATE_RUN;
        } else if (path.includes('organizations')) {
          activeSection = DashboardSection.ORGANIZATIONS;
        } else if (path.includes('projects')) {
          activeSection = DashboardSection.PROJECTS;
        } else if (path.includes('settings')) {
          activeSection = DashboardSection.SETTINGS;
        }
        
        updateState({ activeSection });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        updateState({ error: errorMessage });
        
        await showToast({
          style: Toast.Failure,
          title: 'Failed to Load Data',
          message: errorMessage,
        });
      } finally {
        updateState({ isLoading: false });
      }
    };
    
    loadData();
  }, [githubService, location.pathname]);

  // Handle section change
  const handleSectionChange = (section: DashboardSection) => {
    updateState({ activeSection: section });
    
    // Update URL to match section
    switch (section) {
      case DashboardSection.AGENT_RUNS:
        navigate('/agent-runs');
        break;
      case DashboardSection.CREATE_RUN:
        navigate('/create');
        break;
      case DashboardSection.ORGANIZATIONS:
        navigate('/organizations');
        break;
      case DashboardSection.PROJECTS:
        navigate('/projects');
        break;
      case DashboardSection.SETTINGS:
        navigate('/settings');
        break;
      default:
        navigate('/');
    }
  };

  // Render active section content
  const renderSectionContent = () => {
    switch (state.activeSection) {
      case DashboardSection.OVERVIEW:
        return (
          <div className="dashboard-overview">
            <div className="dashboard-header">
              <h1 className="dashboard-title">Dashboard Overview</h1>
              <p className="dashboard-description">
                Welcome to Codegen. View your agent runs, organizations, and projects.
              </p>
            </div>
            
            <div className="dashboard-grid">
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.organizations.length}</div>
                <div className="stat-label">Organizations</div>
                <div className="stat-action" onClick={() => handleSectionChange(DashboardSection.ORGANIZATIONS)}>
                  View All →
                </div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.agentRuns.length}</div>
                <div className="stat-label">Agent Runs</div>
                <div className="stat-action" onClick={() => handleSectionChange(DashboardSection.AGENT_RUNS)}>
                  View All →
                </div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.githubConnected ? 'Connected' : 'Not Connected'}</div>
                <div className="stat-label">GitHub Status</div>
                <div className="stat-action" onClick={() => handleSectionChange(DashboardSection.PROJECTS)}>
                  {state.githubConnected ? 'View Projects →' : 'Connect →'}
                </div>
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title">Recent Agent Runs</h2>
                <button 
                  className="dashboard-card-action"
                  onClick={() => handleSectionChange(DashboardSection.AGENT_RUNS)}
                >
                  View All
                </button>
              </div>
              <div className="dashboard-card-content">
                {state.agentRuns.length > 0 ? (
                  <div className="recent-runs-list">
                    {/* Render recent runs here */}
                    <p>Recent runs will be displayed here</p>
                  </div>
                ) : (
                  <p>No recent agent runs found.</p>
                )}
              </div>
            </div>
          </div>
        );
      
      case DashboardSection.AGENT_RUNS:
        return (
          <Suspense fallback={<LoadingComponent />}>
            <ListAgentRuns />
          </Suspense>
        );
      
      case DashboardSection.CREATE_RUN:
        return (
          <Suspense fallback={<LoadingComponent />}>
            <CreateAgentRun />
          </Suspense>
        );
      
      case DashboardSection.ORGANIZATIONS:
        return (
          <Suspense fallback={<LoadingComponent />}>
            <ListOrganizations />
          </Suspense>
        );
      
      case DashboardSection.PROJECTS:
        return (
          <Suspense fallback={<LoadingComponent />}>
            <ProjectDashboard />
          </Suspense>
        );
      
      case DashboardSection.SETTINGS:
        return (
          <div className="dashboard-settings">
            <div className="dashboard-header">
              <h1 className="dashboard-title">Settings</h1>
              <p className="dashboard-description">
                Manage your API credentials and preferences.
              </p>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title">API Credentials</h2>
              </div>
              <div className="dashboard-card-content">
                <p>API credential settings will be displayed here</p>
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title">GitHub Integration</h2>
              </div>
              <div className="dashboard-card-content">
                <p>GitHub integration settings will be displayed here</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Select a section from the sidebar</div>;
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        activeSection={state.activeSection}
        onSectionChange={handleSectionChange}
        userInfo={state.userInfo}
        isLoading={state.isLoading}
      />
      
      <div className="dashboard-content">
        {state.isLoading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <ErrorBoundary
            onError={(error) => {
              console.error('Dashboard error:', error);
              showToast({
                style: Toast.Failure,
                title: 'Error',
                message: 'An error occurred while rendering the dashboard. Please try again.',
              });
            }}
          >
            {renderSectionContent()}
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
