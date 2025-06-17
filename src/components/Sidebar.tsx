import React from 'react';

// Dashboard sections enum (must match the one in Dashboard.tsx)
enum DashboardSection {
  OVERVIEW = 'overview',
  AGENT_RUNS = 'agent-runs',
  CREATE_RUN = 'create-run',
  ORGANIZATIONS = 'organizations',
  PROJECTS = 'projects',
  SETTINGS = 'settings'
}

interface SidebarProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  userInfo: any | null;
  isLoading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSectionChange,
  userInfo,
  isLoading
}) => {
  // Get user display name
  const getUserDisplayName = () => {
    if (isLoading) return 'Loading...';
    if (!userInfo) return 'Guest User';
    
    return userInfo.full_name || 
           (userInfo.github_username ? `@${userInfo.github_username}` : undefined) ||
           userInfo.email ||
           `User ${userInfo.id}`;
  };
  
  // Navigation items
  const navItems = [
    {
      id: DashboardSection.OVERVIEW,
      label: 'Overview',
      icon: '📊'
    },
    {
      id: DashboardSection.AGENT_RUNS,
      label: 'Agent Runs',
      icon: '🤖'
    },
    {
      id: DashboardSection.CREATE_RUN,
      label: 'Create Run',
      icon: '➕'
    },
    {
      id: DashboardSection.ORGANIZATIONS,
      label: 'Organizations',
      icon: '🏢'
    },
    {
      id: DashboardSection.PROJECTS,
      label: 'Projects',
      icon: '📁'
    },
    {
      id: DashboardSection.SETTINGS,
      label: 'Settings',
      icon: '⚙️'
    }
  ];

  return (
    <div className="dashboard-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Codegen</h2>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {userInfo?.avatar_url ? (
              <img 
                src={userInfo.avatar_url} 
                alt={getUserDisplayName()} 
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {getUserDisplayName().charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{getUserDisplayName()}</div>
            {userInfo?.email && (
              <div className="sidebar-user-email">{userInfo.email}</div>
            )}
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSectionChange(item.id)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-text">{item.label}</span>
          </div>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="sidebar-version">Version 1.0.0</div>
        <a 
          href="https://codegen.com/docs" 
          target="_blank" 
          rel="noopener noreferrer"
          className="sidebar-link"
        >
          Documentation
        </a>
      </div>
    </div>
  );
};

export default Sidebar;

