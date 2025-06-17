import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getGitHubService } from '../services/github.service';
import { showToast, Toast_Style as Toast } from './WebToast';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const githubService = getGitHubService();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        throw new Error(`GitHub OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      const success = await githubService.handleOAuthCallback(code, state);
      
      if (success) {
        // Notify parent window if this is a popup
        if (window.opener) {
          window.opener.postMessage({ type: 'github-auth-success' }, '*');
          window.close();
        } else {
          // Redirect to projects page
          navigate('/projects');
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      
      await showToast({
        style: Toast.Failure,
        title: 'GitHub Authentication Failed',
        message: errorMessage,
      });

      // Redirect to projects page after a delay
      setTimeout(() => {
        if (window.opener) {
          window.close();
        } else {
          navigate('/projects');
        }
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="github-callback">
      <div className="callback-content">
        {processing ? (
          <div className="processing-state">
            <div className="loading-spinner"></div>
            <h2>Connecting to GitHub...</h2>
            <p>Please wait while we complete the authentication process.</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Authentication Failed</h2>
            <p>{error}</p>
            <p>This window will close automatically in a few seconds.</p>
          </div>
        ) : (
          <div className="success-state">
            <div className="success-icon">✅</div>
            <h2>Successfully Connected!</h2>
            <p>Your GitHub account has been connected successfully.</p>
            <p>You can now close this window and return to the application.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubCallback;

