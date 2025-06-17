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
  clientId: process.env.REACT_APP_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.REACT_APP_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET || '',
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

// Proxy URL for GitHub OAuth (to avoid CORS issues)
// In production, you should use your own server-side proxy
const GITHUB_PROXY_URL = process.env.REACT_APP_GITHUB_PROXY_URL || '';

export class GitHubService {
  private octokit: Octokit | null = null;
  private currentUser: GitHubUser | null = null;
  private tokenExchangeInProgress: boolean = false;
  private tokenExchangeRetryCount: number = 0;
  private maxTokenExchangeRetries: number = 3;

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
        
        console.log('GitHub service initialized from storage');
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

      let storedState: GitHubOAuthState;
      try {
        storedState = JSON.parse(storedStateData);
      } catch (parseError) {
        console.error('Failed to parse stored OAuth state:', parseError);
        throw new Error('Invalid OAuth state format');
      }

      if (storedState.state !== state) {
        throw new Error('Invalid OAuth state');
      }

      // Check if state is not too old (5 minutes)
      if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
        throw new Error('OAuth state expired');
      }

      // Exchange code for token using a robust approach
      const tokenData = await this.exchangeCodeForToken(code, storedState.redirectUri);
      
      // Validate the token data
      if (!tokenData || !tokenData.access_token) {
        console.error('No access token in response:', tokenData);
        throw new Error('No access token received from GitHub');
      }

      console.log('Successfully obtained GitHub token with scopes:', tokenData.scope);

      // Initialize Octokit with the new token
      this.octokit = new Octokit({ auth: tokenData.access_token });

      try {
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
      } catch (userError) {
        console.error('Failed to get user information:', userError);
        // Even if we can't get user info, we still have a token
        // Store it and return success
        const encryptedToken = this.encryptToken(tokenData.access_token);
        await LocalStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, encryptedToken);
        
        await showToast({
          style: Toast.Success,
          title: 'GitHub Connected',
          message: 'Successfully connected to GitHub',
        });
        
        return true;
      }
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

  // Exchange code for token with multiple fallback strategies
  private async exchangeCodeForToken(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    if (this.tokenExchangeInProgress) {
      throw new Error('Token exchange already in progress');
    }

    this.tokenExchangeInProgress = true;
    this.tokenExchangeRetryCount = 0;

    try {
      // Try different approaches in sequence until one succeeds
      return await this.tryTokenExchangeWithRetries(code, redirectUri);
    } finally {
      this.tokenExchangeInProgress = false;
      this.tokenExchangeRetryCount = 0;
    }
  }

  // Try token exchange with multiple strategies and retries
  private async tryTokenExchangeWithRetries(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    const strategies = [
      this.exchangeTokenWithServerSide.bind(this),
      this.exchangeTokenWithFetch.bind(this),
      this.exchangeTokenWithXHR.bind(this),
      this.exchangeTokenWithFormData.bind(this)
    ];

    let lastError: Error | null = null;

    // Try each strategy
    for (const strategy of strategies) {
      try {
        const result = await strategy(code, redirectUri);
        if (result && result.access_token) {
          return result;
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If we've tried all strategies, increment retry count
        if (strategy === strategies[strategies.length - 1]) {
          this.tokenExchangeRetryCount++;
          
          // If we've reached max retries, throw the last error
          if (this.tokenExchangeRetryCount >= this.maxTokenExchangeRetries) {
            throw new Error(`Failed to exchange code for token after ${this.maxTokenExchangeRetries} retries: ${lastError.message}`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try again from the beginning
          return this.tryTokenExchangeWithRetries(code, redirectUri);
        }
      }
    }

    // If we get here, all strategies failed
    throw lastError || new Error('All token exchange strategies failed');
  }

  // Strategy 1: Use server-side proxy if available
  private async exchangeTokenWithServerSide(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    if (!GITHUB_PROXY_URL) {
      throw new Error('No proxy URL configured');
    }

    const response = await fetch(`${GITHUB_PROXY_URL}/github/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server proxy failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  // Strategy 2: Use fetch API directly
  private async exchangeTokenWithFetch(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    const requestBody = {
      client_id: GITHUB_CONFIG.clientId,
      client_secret: GITHUB_CONFIG.clientSecret,
      code,
      redirect_uri: redirectUri,
    };

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Clone the response to try different parsing methods
    const responseClone = response.clone();

    // Try to parse as JSON
    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'access_token' in data) {
        return data as GitHubOAuthToken;
      }
      throw new Error('Response missing access_token');
    } catch (jsonError) {
      console.warn('JSON parsing failed:', jsonError);
      
      // Try to parse as text
      try {
        const text = await responseClone.text();
        
        // Handle the "[object Object]" case
        if (text === "[object Object]") {
          throw new Error('Received "[object Object]" string instead of JSON');
        }
        
        // Try to parse as JSON again
        try {
          const data = JSON.parse(text);
          if (data && typeof data === 'object' && 'access_token' in data) {
            return data as GitHubOAuthToken;
          }
        } catch (innerJsonError) {
          // Ignore and continue to URL parsing
        }
        
        // Try to parse as URL-encoded
        const params = new URLSearchParams(text);
        const accessToken = params.get('access_token');
        if (accessToken) {
          return {
            access_token: accessToken,
            token_type: params.get('token_type') || 'bearer',
            scope: params.get('scope') || '',
          };
        }
        
        throw new Error(`Failed to extract access_token from response: ${text}`);
      } catch (textError) {
        throw new Error(`Text parsing failed: ${textError.message}`);
      }
    }
  }

  // Strategy 3: Use XMLHttpRequest
  private exchangeTokenWithXHR(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
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
            // Try to parse as URL-encoded
            try {
              const params = new URLSearchParams(xhr.responseText);
              const accessToken = params.get('access_token');
              if (accessToken) {
                resolve({
                  access_token: accessToken,
                  token_type: params.get('token_type') || 'bearer',
                  scope: params.get('scope') || '',
                });
                return;
              }
            } catch (urlError) {
              // Continue to rejection
            }
          }
          
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

  // Strategy 4: Use form data approach
  private async exchangeTokenWithFormData(code: string, redirectUri: string): Promise<GitHubOAuthToken> {
    const formData = new FormData();
    formData.append('client_id', GITHUB_CONFIG.clientId);
    formData.append('client_secret', GITHUB_CONFIG.clientSecret);
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FormData approach failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Try to parse as text first
    const text = await response.text();
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      if (data && typeof data === 'object' && 'access_token' in data) {
        return data as GitHubOAuthToken;
      }
    } catch (jsonError) {
      // Ignore and continue to URL parsing
    }
    
    // Try to parse as URL-encoded
    const params = new URLSearchParams(text);
    const accessToken = params.get('access_token');
    if (accessToken) {
      return {
        access_token: accessToken,
        token_type: params.get('token_type') || 'bearer',
        scope: params.get('scope') || '',
      };
    }
    
    throw new Error(`Failed to extract access_token from response: ${text}`);
  }

  // Initialize with token (for fallback methods)
  async initializeWithToken(token: string): Promise<boolean> {
    try {
      // Initialize Octokit with the token
      this.octokit = new Octokit({ auth: token });

      // Get user information
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.currentUser = user;

      // Store encrypted token and user info
      const encryptedToken = this.encryptToken(token);
      await LocalStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, encryptedToken);
      await LocalStorage.setItem(STORAGE_KEYS.GITHUB_USER, JSON.stringify(user));

      return true;
    } catch (error) {
      console.error('Failed to initialize with token:', error);
      this.octokit = null;
      this.currentUser = null;
      return false;
    }
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
