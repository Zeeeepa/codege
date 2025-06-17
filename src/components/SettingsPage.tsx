import React, { useState, useEffect } from 'react';
import { getCredentials } from '../utils/credentials';
import { getGitHubService } from '../services/github.service';
import { showToast, Toast_Style as Toast } from './WebToast';
import { getPreferenceValues } from '../utils/webPreferences';

interface EnvVariable {
  key: string;
  value: string | null;
  isSecret: boolean;
  isValid: boolean;
  description: string;
  category: 'api' | 'github' | 'app' | 'feature';
}

const SettingsPage: React.FC = () => {
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  const githubService = getGitHubService();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Check GitHub connection
        const isConnected = githubService.isAuthenticated();
        setGithubConnected(isConnected);
        
        if (isConnected) {
          const user = githubService.getCurrentUser();
          setGithubUser(user);
        }
        
        // Get all environment variables
        const credentials = getCredentials();
        const preferences = getPreferenceValues();
        
        // Define all expected environment variables with descriptions
        const envVarDefinitions: EnvVariable[] = [
          // API Credentials
          {
            key: 'REACT_APP_CODEGEN_API_TOKEN',
            value: process.env.REACT_APP_CODEGEN_API_TOKEN || credentials.apiToken || null,
            isSecret: true,
            isValid: Boolean(process.env.REACT_APP_CODEGEN_API_TOKEN || credentials.apiToken),
            description: 'API token for authenticating with the Codegen API',
            category: 'api'
          },
          {
            key: 'REACT_APP_CODEGEN_ORG_ID',
            value: process.env.REACT_APP_CODEGEN_ORG_ID || credentials.organizationId?.toString() || null,
            isSecret: false,
            isValid: Boolean(process.env.REACT_APP_CODEGEN_ORG_ID || credentials.organizationId),
            description: 'Organization ID for the Codegen API',
            category: 'api'
          },
          {
            key: 'REACT_APP_CODEGEN_API_BASE_URL',
            value: process.env.REACT_APP_CODEGEN_API_BASE_URL || credentials.apiBaseUrl || null,
            isSecret: false,
            isValid: Boolean(process.env.REACT_APP_CODEGEN_API_BASE_URL || credentials.apiBaseUrl),
            description: 'Base URL for the Codegen API',
            category: 'api'
          },
          
          // GitHub OAuth
          {
            key: 'REACT_APP_GITHUB_CLIENT_ID',
            value: process.env.REACT_APP_GITHUB_CLIENT_ID || null,
            isSecret: false,
            isValid: Boolean(process.env.REACT_APP_GITHUB_CLIENT_ID),
            description: 'GitHub OAuth Client ID',
            category: 'github'
          },
          {
            key: 'REACT_APP_GITHUB_CLIENT_SECRET',
            value: process.env.REACT_APP_GITHUB_CLIENT_SECRET || null,
            isSecret: true,
            isValid: Boolean(process.env.REACT_APP_GITHUB_CLIENT_SECRET),
            description: 'GitHub OAuth Client Secret',
            category: 'github'
          },
          
          // Application URLs
          {
            key: 'REACT_APP_HOMEPAGE_URL',
            value: process.env.REACT_APP_HOMEPAGE_URL || window.location.origin || null,
            isSecret: false,
            isValid: Boolean(process.env.REACT_APP_HOMEPAGE_URL || window.location.origin),
            description: 'Homepage URL for the application',
            category: 'app'
          },
          {
            key: 'REACT_APP_AUTHORIZATION_CALLBACK_URL',
            value: process.env.REACT_APP_AUTHORIZATION_CALLBACK_URL || `${window.location.origin}/auth/callback` || null,
            isSecret: false,
            isValid: Boolean(process.env.REACT_APP_AUTHORIZATION_CALLBACK_URL || window.location.origin),
            description: 'OAuth callback URL',
            category: 'app'
          },
          
          // Feature Flags
          {
            key: 'REACT_APP_ENABLE_DARK_MODE',
            value: process.env.REACT_APP_ENABLE_DARK_MODE || 'true',
            isSecret: false,
            isValid: true,
            description: 'Enable dark mode UI',
            category: 'feature'
          },
          {
            key: 'REACT_APP_ENABLE_OFFLINE_MODE',
            value: process.env.REACT_APP_ENABLE_OFFLINE_MODE || 'false',
            isSecret: false,
            isValid: true,
            description: 'Enable offline functionality',
            category: 'feature'
          }
        ];
        
        setEnvVariables(envVarDefinitions);
      } catch (error) {
        console.error('Failed to load settings:', error);
        await showToast({
          style: Toast.Failure,
          title: 'Failed to Load Settings',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [githubService]);

  const handleConnectGitHub = async () => {
    try {
      const authUrl = await githubService.startOAuthFlow();
      // Open in a popup window
      const width = 800;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrl,
        'github-oauth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );
      
      // Listen for message from popup
      window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'github-auth-success') {
          // Refresh GitHub status
          setGithubConnected(githubService.isAuthenticated());
          setGithubUser(githubService.getCurrentUser());
          
          await showToast({
            style: Toast.Success,
            title: 'GitHub Connected',
            message: 'Successfully connected to GitHub',
          });
        }
      }, { once: true });
    } catch (error) {
      console.error('Failed to start GitHub OAuth flow:', error);
      await showToast({
        style: Toast.Failure,
        title: 'GitHub Connection Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await githubService.clearStoredAuth();
      setGithubConnected(false);
      setGithubUser(null);
      
      await showToast({
        style: Toast.Success,
        title: 'GitHub Disconnected',
        message: 'Successfully disconnected from GitHub',
      });
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
      await showToast({
        style: Toast.Failure,
        title: 'GitHub Disconnection Failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  const renderApiCredentialsSection = () => {
    const apiVariables = envVariables.filter(v => v.category === 'api');
    
    return (
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">API Credentials</h2>
          <div className="settings-card-actions">
            <button 
              className="settings-button"
              onClick={() => setShowSecrets(!showSecrets)}
            >
              {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
            </button>
          </div>
        </div>
        <div className="settings-card-content">
          {apiVariables.length > 0 ? (
            <div className="settings-variables">
              {apiVariables.map((variable) => (
                <div key={variable.key} className="settings-variable-item">
                  <div className="settings-variable-header">
                    <div className="settings-variable-name">{variable.key}</div>
                    <div className={`settings-variable-status ${variable.isValid ? 'valid' : 'invalid'}`}>
                      {variable.isValid ? '✓ Valid' : '✗ Missing'}
                    </div>
                  </div>
                  <div className="settings-variable-value">
                    {variable.isSecret && !showSecrets 
                      ? (variable.value ? '••••••••••••••••' : 'Not set') 
                      : (variable.value || 'Not set')}
                  </div>
                  <div className="settings-variable-description">{variable.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <p>No API credentials configured.</p>
          )}
          
          <div className="settings-help">
            <p>
              API credentials can be configured in your <code>.env</code> file or through the preferences system.
              These credentials are required to interact with the Codegen API.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderGitHubSection = () => {
    const githubVariables = envVariables.filter(v => v.category === 'github');
    
    return (
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">GitHub Integration</h2>
          <div className="settings-card-actions">
            {githubConnected ? (
              <button 
                className="settings-button danger"
                onClick={handleDisconnectGitHub}
              >
                Disconnect
              </button>
            ) : (
              <button 
                className="settings-button primary"
                onClick={handleConnectGitHub}
              >
                Connect to GitHub
              </button>
            )}
          </div>
        </div>
        <div className="settings-card-content">
          <div className="settings-github-status">
            <div className="settings-status-header">
              <div className="settings-status-label">Connection Status:</div>
              <div className={`settings-status-value ${githubConnected ? 'connected' : 'disconnected'}`}>
                {githubConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            
            {githubConnected && githubUser && (
              <div className="settings-github-user">
                <div className="github-user-avatar">
                  {githubUser.avatar_url && (
                    <img 
                      src={githubUser.avatar_url} 
                      alt={githubUser.login} 
                      className="github-avatar"
                    />
                  )}
                </div>
                <div className="github-user-info">
                  <div className="github-username">@{githubUser.login}</div>
                  {githubUser.name && <div className="github-name">{githubUser.name}</div>}
                </div>
              </div>
            )}
          </div>
          
          <div className="settings-variables">
            {githubVariables.map((variable) => (
              <div key={variable.key} className="settings-variable-item">
                <div className="settings-variable-header">
                  <div className="settings-variable-name">{variable.key}</div>
                  <div className={`settings-variable-status ${variable.isValid ? 'valid' : 'invalid'}`}>
                    {variable.isValid ? '✓ Valid' : '✗ Missing'}
                  </div>
                </div>
                <div className="settings-variable-value">
                  {variable.isSecret && !showSecrets 
                    ? (variable.value ? '••••••••••••••••' : 'Not set') 
                    : (variable.value || 'Not set')}
                </div>
                <div className="settings-variable-description">{variable.description}</div>
              </div>
            ))}
          </div>
          
          <div className="settings-help">
            <p>
              GitHub integration allows you to connect your GitHub account to access repositories,
              create pull requests, and more. The OAuth credentials are required for authentication.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderApplicationSection = () => {
    const appVariables = envVariables.filter(v => v.category === 'app');
    const featureVariables = envVariables.filter(v => v.category === 'feature');
    
    return (
      <div className="settings-card">
        <div className="settings-card-header">
          <h2 className="settings-card-title">Application Settings</h2>
        </div>
        <div className="settings-card-content">
          <h3 className="settings-subheading">URLs</h3>
          <div className="settings-variables">
            {appVariables.map((variable) => (
              <div key={variable.key} className="settings-variable-item">
                <div className="settings-variable-header">
                  <div className="settings-variable-name">{variable.key}</div>
                  <div className={`settings-variable-status ${variable.isValid ? 'valid' : 'invalid'}`}>
                    {variable.isValid ? '✓ Valid' : '✗ Missing'}
                  </div>
                </div>
                <div className="settings-variable-value">{variable.value || 'Not set'}</div>
                <div className="settings-variable-description">{variable.description}</div>
              </div>
            ))}
          </div>
          
          <h3 className="settings-subheading">Feature Flags</h3>
          <div className="settings-variables">
            {featureVariables.map((variable) => (
              <div key={variable.key} className="settings-variable-item">
                <div className="settings-variable-header">
                  <div className="settings-variable-name">{variable.key}</div>
                  <div className="settings-variable-status valid">
                    {variable.value === 'true' ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div className="settings-variable-value">{variable.value}</div>
                <div className="settings-variable-description">{variable.description}</div>
              </div>
            ))}
          </div>
          
          <div className="settings-help">
            <p>
              Application settings control various aspects of the application behavior.
              These settings can be configured in your <code>.env</code> file.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-description">
          Manage your API credentials and application preferences.
        </p>
      </div>
      
      {renderApiCredentialsSection()}
      {renderGitHubSection()}
      {renderApplicationSection()}
    </div>
  );
};

export default SettingsPage;

