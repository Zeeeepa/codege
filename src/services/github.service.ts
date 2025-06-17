import { Octokit } from '@octokit/rest';

import CryptoJS from 'crypto-js';
import { LocalStorage } from '../utils/webStorage';
import { showToast, Toast_Style as Toast } from '../components/WebToast';
import {
  GitHubRepository,
  GitHubBranch,
  GitHubPullRequest,
  GitHubUser,
  GitHubOAuthState,
  GitHubOAuthToken,
  GitHubAuthConfig,
  GitHubWebhookEvent
} from '../types/github';

// GitHub App Configuration
const GITHUB_CONFIG: GitHubAuthConfig = {
  clientId: process.env.REACT_APP_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || 'Ov23li1WIpEcbDjbqaRu',
  clientSecret: process.env.REACT_APP_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '96e3e06d7ffc4447b2b4e39d9302dfb4f06f1099',
  appId: '', // Will be set from environment or config
  privateKey: '', // Will be set from environment or config
  webhookSecret: 'your-webhook-secret'
};

// Storage keys
const STORAGE_KEYS = {
  GITHUB_TOKEN: 'github_oauth_token',
  GITHUB_USER: 'github_user',
  OAUTH_STATE: 'github_oauth_state',
  INSTALLATION_TOKEN: 'github_installation_token'
};

// Encryption key for token storage (in production, this should be more secure)
const ENCRYPTION_KEY = 'github-token-encryption-key-2024';

export class GitHubService {
  private octokit: Octokit | null = null;
  private currentUser: GitHubUser | null = null;

  constructor() {
    this.initializeFromStorage();
  }

  // Initialize service from stored tokens
  private async initializeFromStorage(): Promise<void> {
    try {
      const encryptedToken = await LocalStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
      const storedUser = await LocalStorage.getItem(STORAGE_KEYS.GITHUB_USER);

      if (encryptedToken && storedUser) {
        const token = this.decryptToken(encryptedToken);
        this.octokit = new Octokit({ auth: token });
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Failed to initialize GitHub service from storage:', error);
      await this.clearStoredAuth();
    }
  }

  // Encrypt token for storage
  private encryptToken(token: string): string {
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  }

  // Decrypt token from storage
  private decryptToken(encryptedToken: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Generate OAuth state for CSRF protection
  private generateOAuthState(): GitHubOAuthState {
    const state = CryptoJS.lib.WordArray.random(32).toString();
    return {
      state,
      redirectUri: `${window.location.origin}/auth/callback`,
      timestamp: Date.now()
    };
  }

  // Start OAuth flow
  async startOAuthFlow(): Promise<string> {
    const oauthState = this.generateOAuthState();
    await LocalStorage.setItem(STORAGE_KEYS.OAUTH_STATE, JSON.stringify(oauthState));

    const params = new URLSearchParams({
      client_id: GITHUB_CONFIG.clientId,
      redirect_uri: oauthState.redirectUri,
      scope: 'repo,user,read:org',
      state: oauthState.state,
      allow_signup: 'true'
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string): Promise<boolean> {
    try {
      // Verify state parameter
      const storedStateData = await LocalStorage.getItem(STORAGE_KEYS.OAUTH_STATE);
      if (!storedStateData) {
        throw new Error('No OAuth state found');
      }

      const storedState: GitHubOAuthState = JSON.parse(storedStateData);
      if (storedState.state !== state) {
        throw new Error('Invalid OAuth state');
      }

      // Check if state is not too old (5 minutes)
      if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
        throw new Error('OAuth state expired');
      }

      // Exchange code for token using a more robust approach
      const tokenData = await this.exchangeCodeForToken(code, storedState.redirectUri);
      
      // Validate the token data
      if (!tokenData || !tokenData.access_token) {
        console.error('No access token in response:', tokenData);
        throw new Error('No access token received from GitHub');
      }

      console.log('Successfully obtained GitHub token with scopes:', tokenData.scope);

      // Initialize Octokit with the new token
      this.octokit = new Octokit({ auth: tokenData.access_token });

      // Get user information
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.currentUser = user;

      // Store encrypted token and user info
      const encryptedToken = this.encryptToken(tokenData.access_token);
      await LocalStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, encryptedToken);
      await LocalStorage.setItem(STORAGE_KEYS.GITHUB_USER, JSON.stringify(user));

      // Clean up OAuth state
      await LocalStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);

      await showToast({
        style: Toast.Success,
        title: 'GitHub Connected',
        message: `Successfully connected as ${user.login}`,
      });

      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      
      // Provide more detailed error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Error object could not be stringified';
        }
      }
      
      await showToast({
        style: Toast.Failure,
        title: 'GitHub Connection Failed',
        message: errorMessage,
      });
      return false;
    }
  }

  // Exchange code for token with better error handling and response parsing
  private async exchangeCodeForToken(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    // Prepare the request body
    const requestBody = {
      client_id: GITHUB_CONFIG.clientId,
      client_secret: GITHUB_CONFIG.clientSecret,
      code,
      redirect_uri: redirectUri,
    };

    // First try the fetch API approach
    try {
      // Make the request with proper headers
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Check for HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText
        });
        throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText}`);
      }

      // Try to get the response as a clone first to avoid consuming it
      const responseClone = response.clone();
      
      // Try to parse as JSON first
      try {
        const jsonData = await response.json();
        console.log('Successfully parsed response as JSON');
        
        // Validate the token data structure
        if (jsonData && typeof jsonData === 'object' && 'access_token' in jsonData) {
          return jsonData as GitHubOAuthToken;
        } else {
          console.warn('JSON response missing access_token:', jsonData);
        }
      } catch (jsonError) {
        console.warn('JSON parsing failed:', jsonError);
        // Continue to try other methods
      }

      // If JSON parsing fails, try to parse as text and then as URL-encoded
      try {
        const textData = await responseClone.text();
        
        // Check if we got the infamous "[object Object]" string
        if (textData === "[object Object]") {
          console.warn('Received "[object Object]" as response text');
          
          // Try a different approach - use XMLHttpRequest as a fallback
          return await this.exchangeCodeWithXHR(code, redirectUri);
        }
        
        // Try to parse as JSON again (sometimes text() works better than json())
        try {
          const parsedJson = JSON.parse(textData);
          if (parsedJson && typeof parsedJson === 'object' && 'access_token' in parsedJson) {
            return parsedJson as GitHubOAuthToken;
          }
        } catch (innerJsonError) {
          console.warn('Secondary JSON parsing failed:', innerJsonError);
        }
        
        // Try to parse as URL-encoded form data
        console.log('Trying URL-encoded format');
        const params = new URLSearchParams(textData);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          return {
            access_token: accessToken,
            token_type: params.get('token_type') || 'bearer',
            scope: params.get('scope') || ''
          };
        } else {
          console.warn('URL-encoded parsing failed to find access_token');
        }
      } catch (textError) {
        console.warn('Text parsing failed:', textError);
      }
      
      // If we got here, all parsing attempts failed
      throw new Error('Failed to parse GitHub OAuth response in any format');
    } catch (fetchError) {
      console.error('Fetch approach failed:', fetchError);
      
      // Try the XMLHttpRequest approach as a fallback
      return await this.exchangeCodeWithXHR(code, redirectUri);
    }
  }
  
  // Fallback method using XMLHttpRequest
  private exchangeCodeWithXHR(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://github.com/login/oauth/access_token', true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // Try to parse as JSON
            const response = JSON.parse(xhr.responseText);
            if (response && response.access_token) {
              resolve(response);
              return;
            }
          } catch (e) {
            console.warn('XHR JSON parsing failed:', e);
            
            // Try to parse as URL-encoded
            try {
              const params = new URLSearchParams(xhr.responseText);
              const accessToken = params.get('access_token');
              if (accessToken) {
                resolve({
                  access_token: accessToken,
                  token_type: params.get('token_type') || 'bearer',
                  scope: params.get('scope') || ''
                });
                return;
              }
            } catch (urlError) {
              console.warn('XHR URL parsing failed:', urlError);
            }
          }
          
          // If we got here, parsing failed
          reject(new Error(`Failed to parse OAuth response: ${xhr.responseText}`));
        } else {
          reject(new Error(`XHR request failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error during OAuth token exchange'));
      };
      
      xhr.send(JSON.stringify({
        client_id: GITHUB_CONFIG.clientId,
        client_secret: GITHUB_CONFIG.clientSecret,
        code,
        redirect_uri: redirectUri,
      }));
    });
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.octokit !== null && this.currentUser !== null;
  }

  // Get current user
  getCurrentUser(): GitHubUser | null {
    return this.currentUser;
  }

  // Clear stored authentication
  async clearStoredAuth(): Promise<void> {
    await LocalStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
    await LocalStorage.removeItem(STORAGE_KEYS.GITHUB_USER);
    await LocalStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);
    await LocalStorage.removeItem(STORAGE_KEYS.INSTALLATION_TOKEN);
    this.octokit = null;
    this.currentUser = null;
  }

  // Get user repositories
  async getUserRepositories(page = 1, perPage = 30): Promise<GitHubRepository[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      // Transform the data to match our interface
      return data.map(repo => ({
        ...repo,
        updated_at: repo.updated_at || new Date().toISOString(),
        owner: repo.owner || { login: 'unknown', avatar_url: '', type: 'User' }
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  // Search repositories
  async searchRepositories(query: string, page = 1, perPage = 30): Promise<GitHubRepository[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.rest.search.repos({
        q: `${query} user:${this.currentUser?.login}`,
        page,
        per_page: perPage,
        sort: 'updated',
        order: 'desc',
      });

      // Transform the data to match our interface
      return data.items.map(repo => ({
        ...repo,
        updated_at: repo.updated_at || new Date().toISOString(),
        owner: repo.owner || { login: 'unknown', avatar_url: '', type: 'User' }
      }));
    } catch (error) {
      console.error('Failed to search repositories:', error);
      throw new Error('Failed to search repositories');
    }
  }

  // Get repository details
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch repository:', error);
      throw new Error('Failed to fetch repository');
    }
  }

  // Get repository branches
  async getRepositoryBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      throw new Error('Failed to fetch branches');
    }
  }

  // Get repository pull requests
  async getRepositoryPullRequests(
    owner: string, 
    repo: string, 
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitHubPullRequest[]> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state,
        sort: 'updated',
        direction: 'desc',
      });

      // Transform the data to match our interface
      return data.map(pr => ({
        ...pr,
        user: pr.user || { login: 'unknown', avatar_url: '' }
      }));
    } catch (error) {
      console.error('Failed to fetch pull requests:', error);
      throw new Error('Failed to fetch pull requests');
    }
  }

  // Simulate webhook events for development
  async simulateWebhookEvent(event: GitHubWebhookEvent): Promise<void> {
    // In development mode, we'll simulate webhook events
    // In production, this would be handled by actual GitHub webhooks
    console.log('Simulated webhook event:', event);
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('github-webhook', {
      detail: event
    }));
  }

  // Create a webhook listener for development
  startWebhookListener(): void {
    // In development, we'll poll for changes periodically
    // This is a simplified approach - in production you'd use actual webhooks
    console.log('GitHub webhook listener started (development mode)');
  }

  // Stop webhook listener
  stopWebhookListener(): void {
    console.log('GitHub webhook listener stopped');
  }

  // Validate webhook signature (for production)
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!GITHUB_CONFIG.webhookSecret) {
      return false;
    }

    const expectedSignature = CryptoJS.HmacSHA256(payload, GITHUB_CONFIG.webhookSecret).toString();
    return signature === `sha256=${expectedSignature}`;
  }
}

// Singleton instance
let githubService: GitHubService | null = null;

export function getGitHubService(): GitHubService {
  if (!githubService) {
    githubService = new GitHubService();
  }
  return githubService;
}

// Reset service (useful for testing or re-authentication)
export function resetGitHubService(): void {
  githubService = null;
}
