import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getGitHubService } from '../services/github.service';
import { showToast, Toast_Style as Toast } from './WebToast';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

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
          setTimeout(() => window.close(), 1000);
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
      
      // Show toast notification
      await showToast({
        style: Toast.Failure,
        title: 'GitHub Authentication Failed',
        message: errorMessage,
      });

      // If we haven't exceeded max retries, try again
      if (retryCount < maxRetries) {
        console.log(`Retrying GitHub authentication (attempt ${retryCount + 1} of ${maxRetries})...`);
        setRetryCount(prev => prev + 1);
        // Wait a moment before retrying
        setTimeout(() => {
          setProcessing(true);
          setError(null);
          handleCallback();
        }, 2000);
      } else {
        // Redirect to projects page after a delay if max retries exceeded
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/projects');
          }
        }, 5000);
      }
    } finally {
      if (retryCount >= maxRetries || !error) {
        setProcessing(false);
      }
    }
  }, [searchParams, githubService, navigate, retryCount, error]);

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
      backgroundColor: '#121212' // Dark background
    }}>
      <div className="callback-content" style={{
        backgroundColor: '#1e1e1e', // Dark card background
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        color: '#e0e0e0' // Light text for dark background
      }}>
        {processing ? (
          <div className="processing-state">
            <div className="loading-spinner" style={{
              border: '4px solid #333333',
              borderTop: '4px solid #2563eb', // Blue spinner
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 2s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e0e0e0' }}>Connecting to GitHub...</h2>
            <p style={{ color: '#a0a0a0' }}>Please wait while we complete the authentication process.</p>
            {retryCount > 0 && (
              <p style={{ color: '#a0a0a0', marginTop: '10px' }}>
                Retry attempt {retryCount} of {maxRetries}...
              </p>
            )}
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e74c3c' }}>Authentication Failed</h2>
            <p style={{ color: '#a0a0a0', marginBottom: '16px' }}>{error}</p>
            
            {retryCount < maxRetries ? (
              <button 
                onClick={() => {
                  setProcessing(true);
                  setError(null);
                  setRetryCount(prev => prev + 1);
                  // Get the current URL parameters
                  const code = searchParams.get('code');
                  const state = searchParams.get('state');
                  if (code && state) {
                    githubService.handleOAuthCallback(code, state)
                      .then(success => {
                        if (success) {
                          if (window.opener) {
                            window.opener.postMessage({ type: 'github-auth-success' }, '*');
                            setTimeout(() => window.close(), 1000);
                          } else {
                            navigate('/projects');
                          }
                        } else {
                          throw new Error('Authentication failed on manual retry');
                        }
                      })
                      .catch(err => {
                        console.error('Manual retry failed:', err);
                        setError(err instanceof Error ? err.message : 'Retry failed');
                        setProcessing(false);
                      });
                  } else {
                    setError('Missing code or state parameters for retry');
                    setProcessing(false);
                  }
                }}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}
              >
                Try Again
              </button>
            ) : (
              <p style={{ color: '#707070', fontSize: '14px' }}>
                Maximum retry attempts reached. This window will close automatically in a few seconds.
              </p>
            )}
            
            <button 
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  navigate('/projects');
                }
              }}
              style={{
                backgroundColor: 'transparent',
                color: '#a0a0a0',
                border: '1px solid #333333',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginTop: '10px'
              }}
            >
              {window.opener ? 'Close Window' : 'Return to Projects'}
            </button>
          </div>
        ) : (
          <div className="success-state">
            <div className="success-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#2ecc71' }}>Successfully Connected!</h2>
            <p style={{ color: '#a0a0a0', marginBottom: '16px' }}>Your GitHub account has been connected successfully.</p>
            <p style={{ color: '#707070', fontSize: '14px' }}>You can now close this window and return to the application.</p>
            
            <button 
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  navigate('/projects');
                }
              }}
              style={{
                backgroundColor: '#2ecc71',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginTop: '20px'
              }}
            >
              {window.opener ? 'Close Window' : 'Go to Projects'}
            </button>
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
