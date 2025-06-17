import { showToast, Toast_Style as Toast } from "../components/WebToast";

import { getCredentials, showCredentialsError, validateCredentials } from "../utils/credentials";
import { clearStoredUserInfo } from "../storage/userStorage";
import { API_ENDPOINTS, DEFAULT_API_BASE_URL } from "./constants";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import {
  AgentRunResponse,
  UserResponse,
  OrganizationResponse,
  CreateAgentRunRequest,
  ResumeAgentRunRequest,
  StopAgentRunRequest,
  PaginatedResponse,
  APIError,
  LogEntry,
} from "./types";

export class CodegenAPIClient {
  private baseUrl: string;
  private apiToken: string;
  private organizationId?: number;

  constructor() {
    const credentials = getCredentials();
    this.baseUrl = credentials.apiBaseUrl || DEFAULT_API_BASE_URL;
    this.apiToken = credentials.apiToken || '';
    this.organizationId = credentials.organizationId;
  }

  /**
   * Update client credentials
   * This is useful when credentials change during the application lifecycle
   */
  public updateCredentials(): void {
    const credentials = getCredentials();
    this.baseUrl = credentials.apiBaseUrl || DEFAULT_API_BASE_URL;
    this.apiToken = credentials.apiToken || '';
    this.organizationId = credentials.organizationId;
    console.log("🔄 API client credentials updated");
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if API token is available
    if (!this.apiToken) {
      throw new Error("API token is required. Please set it in extension preferences.");
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };

    try {
      console.log(`🌐 Making API request to: ${url}`);
      
      const response = await fetchWithRetry(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      }, {
        // Add longer timeout for potentially slow API endpoints
        timeout: 60000, // 60 seconds
      });

      if (!response.ok) {
        await this.handleAPIError(response);
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`❌ API request failed for ${endpoint}:`, error);
      
      // Enhance error message based on error type
      if (error instanceof Error) {
        // Check for network connectivity issues
        if (error.message.includes('No internet connection')) {
          throw new Error(`Network error: No internet connection. Please check your network and try again.`);
        }
        
        // Check for CORS issues
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          throw new Error(`CORS error: The API server at ${this.baseUrl} doesn't allow requests from this origin. Try using a different API URL or enable CORS on the server.`);
        }
        
        // Check for timeout
        if (error.message.includes('timed out') || error.message.includes('timeout')) {
          throw new Error(`Request timeout: The API server at ${this.baseUrl} is taking too long to respond. Please try again later.`);
        }
        
        throw error;
      }
      
      throw new Error(`Request failed: ${error}`);
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorData = await response.json() as APIError;
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If we can't parse the error response, use the default message
    }

    if (response.status === 401) {
      await showCredentialsError("Invalid API token. Please check your credentials in extension preferences.");
      throw new Error("Authentication failed");
    }

    if (response.status === 403) {
      await showCredentialsError("Access denied. Please ensure your API token has the required permissions.");
      throw new Error("Access denied");
    }

    if (response.status === 429) {
      await showToast({
        style: Toast.Failure,
        title: "Rate Limit Exceeded",
        message: "Please wait a moment before trying again.",
      });
      throw new Error("Rate limit exceeded");
    }

    await showToast({
      style: Toast.Failure,
      title: "API Error",
      message: errorMessage,
    });

    throw new Error(errorMessage);
  }

  // Agent Run Methods
  async createAgentRun(
    organizationId: number,
    request: CreateAgentRunRequest
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_CREATE(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async getAgentRun(
    organizationId: number,
    agentRunId: number
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_GET(organizationId, agentRunId)
    );
  }

  async resumeAgentRun(
    organizationId: number,
    request: ResumeAgentRunRequest
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_RESUME(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async stopAgentRun(
    organizationId: number,
    request: StopAgentRunRequest
  ): Promise<AgentRunResponse> {
    return this.makeRequest<AgentRunResponse>(
      API_ENDPOINTS.AGENT_RUN_STOP(organizationId),
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async listAgentRuns(
    organizationId: number,
    page = 1,
    size = 10
  ): Promise<PaginatedResponse<AgentRunResponse>> {
    return this.makeRequest<PaginatedResponse<AgentRunResponse>>(
      API_ENDPOINTS.AGENT_RUN_LIST(organizationId, page, size)
    );
  }

  async getAgentRunLogs(
    organizationId: number,
    agentRunId: number,
    page = 1,
    size = 10
  ): Promise<PaginatedResponse<LogEntry>> {
    return this.makeRequest<PaginatedResponse<LogEntry>>(
      API_ENDPOINTS.AGENT_RUN_LOGS(organizationId, agentRunId, page, size)
    );
  }

  // Organization Methods
  async getOrganizations(
    page = 1,
    size = 50
  ): Promise<PaginatedResponse<OrganizationResponse>> {
    return this.makeRequest<PaginatedResponse<OrganizationResponse>>(
      API_ENDPOINTS.ORGANIZATIONS_PAGINATED(page, size)
    );
  }

  // User Methods
  async getUsers(
    organizationId: number,
    page = 1,
    size = 50
  ): Promise<PaginatedResponse<UserResponse>> {
    return this.makeRequest<PaginatedResponse<UserResponse>>(
      API_ENDPOINTS.ORG_USERS(organizationId, page, size)
    );
  }

  async getUser(
    organizationId: number,
    userId: number
  ): Promise<UserResponse> {
    return this.makeRequest<UserResponse>(
      API_ENDPOINTS.ORG_USER(organizationId, userId)
    );
  }

  async getCurrentUser(
    organizationId: number,
    userId: number
  ): Promise<UserResponse> {
    return this.makeRequest<UserResponse>(
      API_ENDPOINTS.ORG_USER(organizationId, userId)
    );
  }

  // Get current user info from alpha /me endpoint
  async getMe(): Promise<UserResponse> {
    return this.makeRequest<UserResponse>(API_ENDPOINTS.USER_ME);
  }

  // Validation Method
  async validateConnection(): Promise<boolean> {
    try {
      const result = await validateCredentials();
      return result.isValid;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let apiClient: CodegenAPIClient | null = null;

export function getAPIClient(): CodegenAPIClient {
  if (!apiClient) {
    try {
      apiClient = new CodegenAPIClient();
    } catch (error) {
      // If credentials are missing, still create the client but it will fail on API calls
      console.warn("⚠️ API client created without valid credentials:", error);
      apiClient = new CodegenAPIClient();
    }
  }
  return apiClient;
}

// Reset the client (useful when credentials change)
export async function resetAPIClient(): Promise<void> {
  apiClient = null;
  // Clear stored user info when credentials change
  await clearStoredUserInfo();
}
