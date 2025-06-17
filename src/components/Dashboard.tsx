import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAPIClient } from '../api/client';
import { validateCredentials, getCurrentUserInfo } from '../utils/credentials';
import { showToast, Toast_Style as Toast } from './WebToast';
import { getGitHubService } from '../services/github.service';
import ListAgentRuns from '../list-agent-runs';
import CreateAgentRun from '../create-agent-run';
import ListOrganizations from '../list-organizations';
import ProjectDashboard from './ProjectDashboard';
import Sidebar from './Sidebar';

// Dashboard sections
enum DashboardSection {
  OVERVIEW = 'overview',
  AGENT_RUNS = 'agent-runs',
  CREATE_RUN = 'create-run',
  ORGANIZATIONS = 'organizations',
  PROJECTS = 'projects',
  SETTINGS = 'settings'
}

const Dashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DashboardSection>(DashboardSection.OVERVIEW);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [githubConnected, setGithubConnected] = useState(false);
  
  const navigate = useNavigate();
  const apiClient = getAPIClient();
  const githubService = getGitHubService();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get user info
        const user = await getCurrentUserInfo();
        setUserInfo(user);
        
        // Check GitHub connection
        const isGithubConnected = githubService.isAuthenticated();
        setGithubConnected(isGithubConnected);
        
        // Get organizations
        const validation = await validateCredentials();
        if (validation.isValid && validation.organizations) {
          setOrganizations(validation.organizations);
        }
        
        // Set default section based on URL path
        const path = window.location.pathname;
        if (path.includes('agent-runs')) {
          setActiveSection(DashboardSection.AGENT_RUNS);
        } else if (path.includes('create')) {
          setActiveSection(DashboardSection.CREATE_RUN);
        } else if (path.includes('organizations')) {
          setActiveSection(DashboardSection.ORGANIZATIONS);
        } else if (path.includes('projects')) {
          setActiveSection(DashboardSection.PROJECTS);
        } else if (path.includes('settings')) {
          setActiveSection(DashboardSection.SETTINGS);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        await showToast({
          style: Toast.Failure,
          title: 'Failed to Load Data',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [githubService]);

  // Handle section change
  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
    
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
    switch (activeSection) {
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
                <div className="stat-value">{organizations.length}</div>
                <div className="stat-label">Organizations</div>
                <div className="stat-action" onClick={() => handleSectionChange(DashboardSection.ORGANIZATIONS)}>
                  View All →
                </div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{agentRuns.length}</div>
                <div className="stat-label">Agent Runs</div>
                <div className="stat-action" onClick={() => handleSectionChange(DashboardSection.AGENT_RUNS)}>
                  View All →
                </div>
              </div>
              
              <div className="dashboard-stat-card">
                <div className="stat-value">{githubConnected ? 'Connected' : 'Not Connected'}</div>
                <div className="stat-label">GitHub Status</div>
                <div className="stat-action" onClick={() => handleSectionChange(DashboardSection.PROJECTS)}>
                  {githubConnected ? 'View Projects →' : 'Connect →'}
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
                {agentRuns.length > 0 ? (
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
        return <ListAgentRuns />;
      
      case DashboardSection.CREATE_RUN:
        return <CreateAgentRun />;
      
      case DashboardSection.ORGANIZATIONS:
        return <ListOrganizations />;
      
      case DashboardSection.PROJECTS:
        return <ProjectDashboard />;
      
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
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        userInfo={userInfo}
        isLoading={isLoading}
      />
      
      <div className="dashboard-content">
        {isLoading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          renderSectionContent()
        )}
      </div>
    </div>
  );
};

export default Dashboard;

