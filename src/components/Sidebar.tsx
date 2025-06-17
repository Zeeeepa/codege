import React from 'react';
import { DashboardSection, DashboardSectionEnum, SidebarProps, UserInfo } from '../types/dashboard';

// Define NavItem interface
interface NavItem {
  id: DashboardSection;
  label: string;
  icon: string;
  description: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSectionChange,
  userInfo,
  isLoading
}) => {
  // Get user display name
  const getUserDisplayName = (): string => {
    if (isLoading) return 'Loading...';
    if (!userInfo) return 'Guest User';
    
    return userInfo.name || 
           userInfo.email ||
           `User ${userInfo.id}`;
  };
  
  // Navigation items
  const navItems: NavItem[] = [
    {
      id: DashboardSectionEnum.OVERVIEW,
      label: 'Overview',
      icon: '📊',
      description: 'Dashboard overview and statistics'
    },
    {
      id: DashboardSectionEnum.AGENT_RUNS,
      label: 'Agent Runs',
      icon: '🤖',
      description: 'View and manage agent runs'
    },
    {
      id: DashboardSectionEnum.CREATE_RUN,
      label: 'Create Run',
      icon: '➕',
      description: 'Create a new agent run'
    },
    {
      id: DashboardSectionEnum.ORGANIZATIONS,
      label: 'Organizations',
      icon: '🏢',
      description: 'Manage your organizations'
    },
    {
      id: DashboardSectionEnum.PROJECTS,
      label: 'Projects',
      icon: '📁',
      description: 'View and manage projects'
    },
    {
      id: DashboardSectionEnum.SETTINGS,
      label: 'Settings',
      icon: '⚙️',
      description: 'Application settings and preferences'
    }
  ];

  return (
    <div className="dashboard-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Codegen</div>
        
        {isLoading ? (
          <div className="sidebar-user-loading">
            <div className="loading-spinner-small"></div>
          </div>
        ) : userInfo ? (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {userInfo.avatarUrl ? (
                <img 
                  src={userInfo.avatarUrl} 
                  alt={userInfo.name} 
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userInfo.name || 'User'}</div>
              <div className="sidebar-user-email">{userInfo.email || ''}</div>
            </div>
          </div>
        ) : (
          <div className="sidebar-user-not-logged-in">
            <button className="sidebar-login-button" onClick={() => onSectionChange('settings')}>
              Connect
            </button>
          </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        <div 
          className={`sidebar-nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSectionChange('dashboard')}
        >
          <span className="sidebar-nav-icon">📊</span>
          Dashboard
        </div>
        
        <div 
          className={`sidebar-nav-item ${activeSection === 'runs' ? 'active' : ''}`}
          onClick={() => onSectionChange('runs')}
        >
          <span className="sidebar-nav-icon">🤖</span>
          Agent Runs
        </div>
        
        <div 
          className={`sidebar-nav-item ${activeSection === 'projects' ? 'active' : ''}`}
          onClick={() => onSectionChange('projects')}
        >
          <span className="sidebar-nav-icon">📁</span>
          Projects
        </div>
        
        <div 
          className={`sidebar-nav-item ${activeSection === 'organizations' ? 'active' : ''}`}
          onClick={() => onSectionChange('organizations')}
        >
          <span className="sidebar-nav-icon">🏢</span>
          Organizations
        </div>
        
        <div 
          className={`sidebar-nav-item ${activeSection === 'settings' ? 'active' : ''}`}
          onClick={() => onSectionChange('settings')}
        >
          <span className="sidebar-nav-icon">⚙️</span>
          Settings
        </div>
      </nav>
      
      <div className="sidebar-footer">
        <div className="sidebar-version">Version 1.0.0</div>
        <div className="sidebar-links">
          <a href="https://docs.codegen.com" target="_blank" rel="noopener noreferrer" className="sidebar-link">
            Documentation
          </a>
          {' • '}
          <a href="https://github.com/codegen-sh/codegen" target="_blank" rel="noopener noreferrer" className="sidebar-link">
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
