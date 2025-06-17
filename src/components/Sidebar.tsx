import React from 'react';
import { DashboardSection, SidebarProps, NavItem, UserInfo } from '../types/dashboard';

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
    
    return userInfo.full_name || 
           (userInfo.github_username ? `@${userInfo.github_username}` : undefined) ||
           userInfo.email ||
           `User ${userInfo.id}`;
  };
  
  // Navigation items
  const navItems: NavItem[] = [
    {
      id: DashboardSection.OVERVIEW,
      label: 'Overview',
      icon: '📊',
      description: 'Dashboard overview and statistics'
    },
    {
      id: DashboardSection.AGENT_RUNS,
      label: 'Agent Runs',
      icon: '🤖',
      description: 'View and manage agent runs'
    },
    {
      id: DashboardSection.CREATE_RUN,
      label: 'Create Run',
      icon: '➕',
      description: 'Create a new agent run'
    },
    {
      id: DashboardSection.ORGANIZATIONS,
      label: 'Organizations',
      icon: '🏢',
      description: 'Manage your organizations'
    },
    {
      id: DashboardSection.PROJECTS,
      label: 'Projects',
      icon: '📁',
      description: 'View and manage projects'
    },
    {
      id: DashboardSection.SETTINGS,
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
