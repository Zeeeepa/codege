import React, { useEffect, useState, useRef } from 'react';
import { createTokenExchangeDataUri } from '../services/github-proxy';
import { logDebug, logError, logInfo, logWarn } from '../utils/debug';

interface GitHubOAuthFallbackProps {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  onSuccess: (token: { access_token: string; token_type: string; scope: string }) => void;
  onError: (error: Error) => void;
}

/**
 * A fallback component for GitHub OAuth token exchange
 * 
 * This component uses an iframe to exchange the OAuth code for a token,
 * which helps avoid CORS issues that can occur with direct API calls.
 */
const GitHubOAuthFallback: React.FC<GitHubOAuthFallbackProps> = ({
  code,
  redirectUri,
  clientId,
  clientSecret,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    logInfo('GitHubOAuthFallback: Starting token exchange');
    
    // Create a data URI for the iframe
    const dataUri = createTokenExchangeDataUri(
      code,
      redirectUri,
      { clientId, clientSecret }
    );
    
    // Set up message listener
    const handleMessage = (event: MessageEvent) => {
      logDebug('GitHubOAuthFallback: Received message', event.data);
      
      // Clear timeout if it exists
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Check if the message contains an error
      if (event.data.error) {
        const errorObj = new Error(event.data.error);
        logError('GitHubOAuthFallback: Token exchange failed', errorObj);
        setError(errorObj);
        setIsLoading(false);
        onError(errorObj);
        return;
      }
      
      // Check if the message contains a token
      if (event.data.access_token) {
        logInfo('GitHubOAuthFallback: Token exchange successful');
        setIsLoading(false);
        onSuccess(event.data);
        return;
      }
      
      // If we get here, the message doesn't contain what we expect
      logWarn('GitHubOAuthFallback: Received unexpected message', event.data);
    };
    
    // Add message listener
    window.addEventListener('message', handleMessage);
    
    // Set timeout
    timeoutRef.current = window.setTimeout(() => {
      const timeoutError = new Error('Token exchange timed out after 30 seconds');
      logError('GitHubOAuthFallback: Token exchange timed out');
      setError(timeoutError);
      setIsLoading(false);
      onError(timeoutError);
    }, 30000);
    
    // Set iframe src
    if (iframeRef.current) {
      iframeRef.current.src = dataUri;
    }
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleMessage);
      
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [code, redirectUri, clientId, clientSecret, onSuccess, onError]);
  
  return (
    <div style={{ display: 'none' }}>
      <iframe
        ref={iframeRef}
        title="GitHub OAuth Token Exchange"
        sandbox="allow-scripts allow-same-origin"
        style={{ width: '1px', height: '1px', position: 'absolute', top: '-100px' }}
      />
      {isLoading && <span>Loading...</span>}
      {error && <span>Error: {error.message}</span>}
    </div>
  );
};

export default GitHubOAuthFallback;
