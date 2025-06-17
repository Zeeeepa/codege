import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getGitHubService } from '../services/github.service';
import { showToast, Toast_Style as Toast } from './WebToast';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const githubService = getGitHubService();

  const handleCallback = useCallback(async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Log all parameters for debugging
      console.log('GitHub callback parameters:', {
        code: code ? `${code.substring(0, 5)}...` : null, // Only log part of the code for security
        state: state ? `${state.substring(0, 5)}...` : null,
        error: errorParam,
        errorDescription
      });

      if (errorParam) {
        throw new Error(`GitHub OAuth error: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ''}`);
      }

      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter');
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('GitHub authentication timed out after 30 seconds')), 30000);
      });

      // Race the authentication with a timeout
      const success = await Promise.race([
        githubService.handleOAuthCallback(code, state),
        timeoutPromise
      ]);
      
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
      console.error('GitHub callback error:', err);
      
      // Provide more detailed error message
      let errorMessage = 'Authentication failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        try {
          errorMessage = JSON.stringify(err);
        } catch (e) {
          errorMessage = 'Error object could not be stringified';
        }
      }
      
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
      }, 5000);
    } finally {
      setProcessing(false);
    }
  }, [searchParams, githubService, navigate]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  return (
    <div className="github-callback" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div className="callback-content" style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        {processing ? (
          <div className="processing-state">
            <div className="loading-spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 2s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Connecting to GitHub...</h2>
            <p style={{ color: '#666' }}>Please wait while we complete the authentication process.</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e74c3c' }}>Authentication Failed</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>{error}</p>
            <p style={{ color: '#999', fontSize: '14px' }}>This window will close automatically in a few seconds.</p>
          </div>
        ) : (
          <div className="success-state">
            <div className="success-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#2ecc71' }}>Successfully Connected!</h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>Your GitHub account has been connected successfully.</p>
            <p style={{ color: '#999', fontSize: '14px' }}>You can now close this window and return to the application.</p>
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default GitHubCallback;

