/**
 * Dashboard types and interfaces
 */

// Dashboard sections
export enum DashboardSection {
  OVERVIEW = 'overview',
  AGENT_RUNS = 'agent-runs',
  CREATE_RUN = 'create-run',
  ORGANIZATIONS = 'organizations',
  PROJECTS = 'projects',
  SETTINGS = 'settings'
}

// Navigation item
export interface NavItem {
  id: DashboardSection;
  label: string;
  icon: string;
  description?: string;
}

// Sidebar props
export interface SidebarProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  userInfo: UserInfo | null;
  isLoading: boolean;
}

// User info
export interface UserInfo {
  id: string | number;
  email?: string;
  github_username?: string;
  github_user_id?: string | number;
  avatar_url?: string;
  full_name?: string;
}

// Organization
export interface Organization {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Agent run
export interface AgentRun {
  id: string | number;
  title?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
  organization_id?: number;
  user_id?: string | number;
  metadata?: Record<string, any>;
}

// Dashboard props
export interface DashboardProps {
  initialSection?: DashboardSection;
}

// Dashboard state
export interface DashboardState {
  activeSection: DashboardSection;
  isLoading: boolean;
  userInfo: UserInfo | null;
  organizations: Organization[];
  agentRuns: AgentRun[];
  githubConnected: boolean;
  error: string | null;
}

// Dashboard card props
export interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

// Stat card props
export interface StatCardProps {
  value: string | number;
  label: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  onClick?: () => void;
  actionLabel?: string;
}

