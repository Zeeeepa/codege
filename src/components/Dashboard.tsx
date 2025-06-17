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
  DashboardSectionEnum,
  UserInfo,
  Organization,
  AgentRun
} from '../types/dashboard';
import SettingsPage from './SettingsPage';
import '../styles/settings.css';

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

// Define DashboardProps interface
interface DashboardProps {
  initialSection?: DashboardSection;
}

// Define DashboardState interface
interface DashboardState {
  activeSection: DashboardSection;
  userInfo: UserInfo | null;
  organizations: Organization[];
  agentRuns: AgentRun[];
  githubConnected: boolean;
  error: string | null;
  isLoading: boolean;
  stats: {
    totalRuns: number;
    totalProjects: number;
    totalOrganizations: number;
  };
  recentRuns: AgentRun[];
  recentProjects: any[]; // Using any for now
  runs: AgentRun[];
  projects: any[]; // Using any for now
}

const Dashboard: React.FC<DashboardProps> = ({ initialSection }) => {
  const [state, setState] = useState<DashboardState>({
    activeSection: initialSection || 'dashboard',
    userInfo: null,
    organizations: [],
    agentRuns: [],
    githubConnected: false,
    error: null,
    isLoading: true,
    stats: {
      totalRuns: 0,
      totalProjects: 0,
      totalOrganizations: 0
    },
    recentRuns: [],
    recentProjects: [],
    runs: [],
    projects: []
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
        let activeSection: DashboardSection = 'dashboard';
        
        if (path.includes('agent-runs')) {
          activeSection = DashboardSectionEnum.AGENT_RUNS;
        } else if (path.includes('create')) {
          activeSection = DashboardSectionEnum.CREATE_RUN;
        } else if (path.includes('organizations')) {
          activeSection = DashboardSectionEnum.ORGANIZATIONS;
        } else if (path.includes('projects')) {
          activeSection = DashboardSectionEnum.PROJECTS;
        } else if (path.includes('settings')) {
          activeSection = DashboardSectionEnum.SETTINGS;
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
      case DashboardSectionEnum.AGENT_RUNS:
        navigate('/agent-runs');
        break;
      case DashboardSectionEnum.CREATE_RUN:
        navigate('/create');
        break;
      case DashboardSectionEnum.ORGANIZATIONS:
        navigate('/organizations');
        break;
      case DashboardSectionEnum.PROJECTS:
        navigate('/projects');
        break;
      case DashboardSectionEnum.SETTINGS:
        navigate('/settings');
        break;
      default:
        navigate('/');
    }
  };

  // Render active section content
  const renderSectionContent = () => {
    switch (state.activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard-overview">
            <div className="dashboard-header">
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-description">
                Welcome to your Codegen dashboard. View your recent activity and manage your projects.
              </p>
            </div>
            
            <div className="dashboard-grid">
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.stats.totalRuns || 0}</div>
                <div className="stat-label">Total Agent Runs</div>
                <div className="stat-action" onClick={() => handleSectionChange('runs')}>View all runs →</div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.stats.totalProjects || 0}</div>
                <div className="stat-label">Projects</div>
                <div className="stat-action" onClick={() => handleSectionChange('projects')}>View all projects →</div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.stats.totalOrganizations || 0}</div>
                <div className="stat-label">Organizations</div>
                <div className="stat-action" onClick={() => handleSectionChange('organizations')}>View all organizations →</div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{state.githubConnected ? 'Connected' : 'Not Connected'}</div>
                <div className="stat-label">GitHub Status</div>
                <div className="stat-action" onClick={() => handleSectionChange('settings')}>Manage settings →</div>
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title">Recent Agent Runs</h2>
                <button className="dashboard-card-action" onClick={() => handleSectionChange('runs')}>
                  View All
                </button>
              </div>
              <div className="dashboard-card-content">
                <Suspense fallback={<div className="component-loading">Loading recent runs...</div>}>
                  <ListAgentRuns runs={state.recentRuns} limit={5} />
                </Suspense>
              </div>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-card-title">Recent Projects</h2>
                <button className="dashboard-card-action" onClick={() => handleSectionChange('projects')}>
                  View All
                </button>
              </div>
              <div className="dashboard-card-content">
                <Suspense fallback={<div className="component-loading">Loading recent projects...</div>}>
                  <ListProjects projects={state.recentProjects} limit={5} />
                </Suspense>
              </div>
            </div>
          </div>
        );
        
      case 'runs':
        return (
          <div className="dashboard-runs">
            <div className="dashboard-header">
              <h1 className="dashboard-title">Agent Runs</h1>
              <p className="dashboard-description">
                View and manage your agent runs.
              </p>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-content">
                <Suspense fallback={<div className="component-loading">Loading agent runs...</div>}>
                  <ListAgentRuns runs={state.runs} />
                </Suspense>
              </div>
            </div>
          </div>
        );
        
      case 'projects':
        return (
          <div className="dashboard-projects">
            <div className="dashboard-header">
              <h1 className="dashboard-title">Projects</h1>
              <p className="dashboard-description">
                View and manage your projects.
              </p>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-content">
                <Suspense fallback={<div className="component-loading">Loading projects...</div>}>
                  <ListProjects projects={state.projects} />
                </Suspense>
              </div>
            </div>
          </div>
        );
        
      case 'organizations':
        return (
          <div className="dashboard-organizations">
            <div className="dashboard-header">
              <h1 className="dashboard-title">Organizations</h1>
              <p className="dashboard-description">
                View and manage your organizations.
              </p>
            </div>
            
            <div className="dashboard-card">
              <div className="dashboard-card-content">
                <Suspense fallback={<div className="component-loading">Loading organizations...</div>}>
                  <ListOrganizations organizations={state.organizations} />
                </Suspense>
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <Suspense fallback={<div className="component-loading">Loading settings...</div>}>
            <SettingsPage />
          </Suspense>
        );
        
      default:
        return (
          <div className="dashboard-error">
            <h1>Unknown Section</h1>
            <p>The requested section "{state.activeSection}" does not exist.</p>
            <button onClick={() => handleSectionChange('dashboard')}>Return to Dashboard</button>
          </div>
        );
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
