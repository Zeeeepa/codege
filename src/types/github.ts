// GitHub Integration Types
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
}

export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  repository_selection: 'all' | 'selected';
  permissions: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubAuthConfig {
  clientId: string;
  clientSecret: string;
  appId: string;
  privateKey: string;
  webhookSecret?: string;
}

export interface GitHubWebhookEvent {
  action: string;
  repository: GitHubRepository;
  pull_request?: GitHubPullRequest;
  ref?: string;
  ref_type?: 'branch' | 'tag';
  installation?: {
    id: number;
  };
  sender: {
    login: string;
    avatar_url: string;
  };
}

// OAuth Flow Types
export interface GitHubOAuthState {
  state: string;
  redirectUri: string;
  timestamp: number;
}

export interface GitHubOAuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in?: number;
  refresh_token?: string;
}

// API Response Types
export interface GitHubAPIError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

