/**
 * GitHub OAuth Proxy Service
 * 
 * This service provides a client-side implementation of a proxy for GitHub OAuth token exchange.
 * In a production environment, you should use a server-side proxy to avoid exposing client secrets.
 */

// GitHub OAuth token exchange endpoint
const GITHUB_OAUTH_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// GitHub OAuth configuration
interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
}

// GitHub OAuth token response
interface GitHubOAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * Exchange OAuth code for token
 * 
 * @param code The authorization code from GitHub
 * @param redirectUri The redirect URI used in the authorization request
 * @param config GitHub OAuth configuration
 * @returns Promise resolving to the token response
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  config: GitHubOAuthConfig
): Promise<GitHubOAuthTokenResponse> {
  try {
    // Create request body
    const requestBody = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    };

    // Make request to GitHub
    const response = await fetch(GITHUB_OAUTH_TOKEN_URL, {
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
      throw new Error(`GitHub OAuth token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Parse response
    const data = await response.json();

    // Validate response
    if (!data.access_token) {
      throw new Error('GitHub OAuth token exchange response missing access_token');
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      scope: data.scope || '',
    };
  } catch (error) {
    console.error('GitHub OAuth token exchange failed:', error);
    throw error;
  }
}

/**
 * Create a CORS-friendly URL for GitHub OAuth token exchange
 * 
 * This is a workaround for CORS issues when exchanging the code for a token.
 * In a production environment, you should use a server-side proxy.
 * 
 * @param code The authorization code from GitHub
 * @param redirectUri The redirect URI used in the authorization request
 * @param config GitHub OAuth configuration
 * @returns URL for token exchange
 */
export function createTokenExchangeUrl(
  code: string,
  redirectUri: string,
  config: GitHubOAuthConfig
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  return `${GITHUB_OAUTH_TOKEN_URL}?${params.toString()}`;
}

/**
 * Create a data URI containing the token exchange response
 * 
 * This is a workaround for CORS issues when exchanging the code for a token.
 * The data URI can be loaded in an iframe to avoid CORS restrictions.
 * 
 * @param code The authorization code from GitHub
 * @param redirectUri The redirect URI used in the authorization request
 * @param config GitHub OAuth configuration
 * @returns Data URI containing the token exchange response
 */
export function createTokenExchangeDataUri(
  code: string,
  redirectUri: string,
  config: GitHubOAuthConfig
): string {
  const url = createTokenExchangeUrl(code, redirectUri, config);
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GitHub OAuth Token Exchange</title>
        <script>
          fetch('${url}', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
            },
          })
            .then(response => response.json())
            .then(data => {
              window.parent.postMessage(data, '*');
            })
            .catch(error => {
              window.parent.postMessage({ error: error.message }, '*');
            });
        </script>
      </head>
      <body>
        <p>Exchanging code for token...</p>
      </body>
    </html>
  `;
  
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

