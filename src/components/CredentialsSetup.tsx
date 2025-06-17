import React, { useState } from 'react';
import { setPreferenceValues } from '../utils/webPreferences';
import { showToast, Toast_Style as Toast } from './WebToast';

interface CredentialsSetupProps {
  onCredentialsSet?: () => void;
}

const CredentialsSetup: React.FC<CredentialsSetupProps> = ({ onCredentialsSet }) => {
  const [apiToken, setApiToken] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.codegen.com');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!apiToken.trim()) {
      await showToast({
        style: Toast.Failure,
        title: "Validation Error",
        message: "API token is required",
      });
      return;
    }

    setIsLoading(true);
    try {
      await setPreferenceValues({
        apiToken: apiToken.trim(),
        apiBaseUrl: apiBaseUrl.trim() || 'https://api.codegen.com',
      });

      await showToast({
        style: Toast.Success,
        title: "Credentials Saved",
        message: "API credentials have been saved successfully",
      });

      // Notify parent component
      if (onCredentialsSet) {
        onCredentialsSet();
      }

      // Reload the page to reinitialize with new credentials
      window.location.reload();
    } catch (error) {
      console.error('Failed to save credentials:', error);
      await showToast({
        style: Toast.Failure,
        title: "Save Failed",
        message: "Failed to save credentials. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#333',
            marginBottom: '8px'
          }}>
            🔧 Setup Required
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            Please configure your Codegen API credentials to continue
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            API Token *
          </label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="sk-..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace'
            }}
          />
          <p style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '4px' 
          }}>
            Get your API token from{' '}
            <a 
              href="https://codegen.com/settings" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#007bff' }}
            >
              codegen.com/settings
            </a>
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#333'
          }}>
            API Base URL
          </label>
          <input
            type="url"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://api.codegen.com"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <p style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '4px' 
          }}>
            Leave as default unless using a custom instance
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading || !apiToken.trim()}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isLoading || !apiToken.trim() ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading || !apiToken.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Saving...' : 'Save Credentials'}
        </button>

        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>💡 Environment Variables:</strong>
          <br />
          You can also set credentials via environment variables:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><code>CODEGEN_API_TOKEN</code></li>
            <li><code>CODEGEN_API_BASE_URL</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CredentialsSetup;
