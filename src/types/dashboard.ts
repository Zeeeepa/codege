/**
 * Dashboard types
 */

// Dashboard section types
export type DashboardSection = 
  | 'dashboard'
  | 'runs'
  | 'projects'
  | 'organizations'
  | 'settings';

// User information
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

// Organization
export interface Organization {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  type: 'Personal' | 'Organization';
  repoCount: number;
  createdAt: string;
  updatedAt: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  description: string;
  repoFullName: string;
  isPrivate: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

// Agent run
export interface AgentRun {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  duration: number;
  projectId: string;
  organizationId: string;
}

// Dashboard state
export interface DashboardState {
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
  recentProjects: Project[];
  runs: AgentRun[];
  projects: Project[];
}

// Sidebar props
export interface SidebarProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  userInfo: UserInfo | null;
  isLoading: boolean;
}

