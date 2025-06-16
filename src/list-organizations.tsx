import { useState, useEffect } from "react";
import {
  List,
  ListItem as List_Item,
  ListEmptyView as List_EmptyView,
} from "./components/WebList";
import {
  ActionPanel,
  Action,
  OpenAction,
  CopyAction,
} from "./components/WebActionPanel";
import { showToast, Toast_Style as Toast } from "./components/WebToast";
import { LocalStorage } from "./utils/webStorage";
import { getAPIClient } from "./api/client";
import { validateCredentials, hasCredentials } from "./utils/credentials";
import { OrganizationResponse } from "./api/types";
import { useCurrentUser } from "./hooks/useCurrentUser";

// Color constants for web UI
const Color = {
  Blue: '#007AFF',
  Green: '#34C759',
  Red: '#FF3B30',
  Orange: '#FF9500',
  Yellow: '#FFCC00',
  SecondaryText: '#8E8E93'
};

// Load environment variables first
try {
  require('dotenv').config();
} catch (error) {
  console.log("dotenv loading error:", error);
}

// Type for organizations from validation (simplified structure)
type BasicOrganization = {
  id: number;
  name: string;
};

export default function ListOrganizations() {
  const [organizations, setOrganizations] = useState<BasicOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultOrgId, setDefaultOrgId] = useState<number | null>(null);

  const apiClient = getAPIClient();
  const { displayName: userDisplayName } = useCurrentUser();

  // Load organizations and default org preference
  useEffect(() => {
    async function loadData() {
      if (!hasCredentials()) {
        setError("API token not configured. Please set it in extension preferences.");
        setIsLoading(false);
        return;
      }

      try {
        // Validate credentials and get organizations
        const validation = await validateCredentials();
        if (!validation.isValid) {
          setError(validation.error || "Invalid credentials");
          setIsLoading(false);
          return;
        }

        if (validation.organizations) {
          setOrganizations(validation.organizations);
        }

        // Load default organization preference
        const defaultOrg = await LocalStorage.getItem<string>("defaultOrganizationId");
        if (defaultOrg) {
          setDefaultOrgId(parseInt(defaultOrg, 10));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organizations");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Set default organization
  const setDefaultOrganization = async (orgId: number) => {
    try {
      const selectedOrg = organizations.find(org => org.id === orgId);
      
      // Store both the ID and the full organization data
      await LocalStorage.setItem("defaultOrganizationId", orgId.toString());
      if (selectedOrg) {
        await LocalStorage.setItem("defaultOrganization", JSON.stringify(selectedOrg));
      }
      
      setDefaultOrgId(orgId);
      
      await showToast({
        style: Toast.Success,
        title: "Default Organization Set",
        message: `${selectedOrg?.name || 'Organization'} will be used as default for new agent runs`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: "Failed to Set Default",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Clear default organization
  const clearDefaultOrganization = async () => {
    try {
      await LocalStorage.removeItem("defaultOrganizationId");
      await LocalStorage.removeItem("defaultOrganization");
      setDefaultOrgId(null);
      
      await showToast({
        style: Toast.Success,
        title: "Default Organization Cleared",
        message: "No default organization is set",
      });
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: "Failed to Clear Default",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Refresh organizations
  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const validation = await validateCredentials();
      if (validation.isValid && validation.organizations) {
        setOrganizations(validation.organizations);
      } else {
        setError(validation.error || "Failed to load organizations");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh organizations");
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !isLoading) {
    return (
      <List>
        <List_EmptyView
          
          title="Error Loading Organizations"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refresh} />
              <OpenAction
                title="Open Extension Preferences"
                target="https://codegen.com/settings"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const navigationTitle = userDisplayName ? `Organizations - ${userDisplayName}` : "Organizations";

  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder="Search organizations..."
    >
      {organizations.length === 0 && !isLoading ? (
        <List_EmptyView
          
          title="No Organizations Found"
          description="You don't have access to any organizations"
          actions={
            <ActionPanel>
              <Action title="Refresh"  onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        organizations.map((org) => {
          const isDefault = defaultOrgId === org.id;
          
          return (
            <List_Item
              key={org.id}
              title={org.name}
              subtitle={`Organization ID: ${org.id}`}
              
              accessories={[
                ...(isDefault ? [{ text: "Default", }] : []),
              ]}
              actions={
                <ActionPanel>
                  
                    {!isDefault ? (
                      <Action
                        title="Set as Default"
                        
                        onAction={() => setDefaultOrganization(org.id)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    ) : (
                      <Action
                        title="Clear Default"
                        
                        onAction={clearDefaultOrganization}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                    )}
                  

                  
                    <CopyAction
                      title="Copy Organization ID"
                      content={org.id.toString()}
                    />
                    <CopyAction
                      title="Copy Organization Name"
                      content={org.name}
                    />
                  

                  
                    <Action
                      title="Refresh"
                      
                      onAction={refresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
