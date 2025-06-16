import { useState } from "react";
import {
  List,
  ListItem as List_Item,
  ListSection as List_Section,
  ListEmptyView as List_EmptyView,
} from "./components/WebList";
import {
  ActionPanel,
  Action,
  OpenAction,
  CopyAction,
} from "./components/WebActionPanel";
import { showToast, Toast_Style as Toast } from "./components/WebToast";
import { confirmAlert, Alert } from "./components/WebAlert";
import { Clipboard } from "./utils/webClipboard";
import { useCachedAgentRuns } from "./hooks/useCachedAgentRuns";
import { getAPIClient } from "./api/client";
import { getAgentRunCache } from "./storage/agentRunCache";
import { AgentRunStatus, AgentRunFilters } from "./api/types";
import { getDateRanges, getStatusFilterOptions, hasActiveFilters, clearFilters } from "./utils/filtering";
import { SyncStatus } from "./storage/cacheTypes";

// Color constants for web UI
const Color = {
  Blue: '#007AFF',
  Green: '#34C759',
  Red: '#FF3B30',
  Orange: '#FF9500',
  Yellow: '#FFCC00',
  SecondaryText: '#8E8E93'
};

export default function ListAgentRuns() {
  const {
    filteredRuns,
    isLoading,
    isRefreshing,
    error,
    syncStatus,
    refresh,
    updateFilters,
    filters,
    organizationId,
  } = useCachedAgentRuns();

  const [searchText, setSearchText] = useState("");
  const apiClient = getAPIClient();
  const cache = getAgentRunCache();

  // Update search filter when search text changes
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    updateFilters({
      ...filters,
      searchQuery: text,
    });
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case AgentRunStatus.ACTIVE:
        return { color: Color.Blue };
      case AgentRunStatus.COMPLETE:
        return { color: Color.Green };
      case AgentRunStatus.ERROR:
        return { color: Color.Red };
      case AgentRunStatus.CANCELLED:
        return { color: Color.Orange };
      case AgentRunStatus.EVALUATION:
        return { color: Color.Yellow };
      case AgentRunStatus.TIMEOUT:
        return { color: Color.Red };
      case AgentRunStatus.MAX_ITERATIONS_REACHED:
        return { color: Color.Red };
      case AgentRunStatus.OUT_OF_TOKENS:
        return { color: Color.Red };
      default:
        return { color: Color.SecondaryText };
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Stop an agent run
  const stopAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    const confirmed = await confirmAlert({
      title: "Stop Agent Run",
      message: `Are you sure you want to stop agent run #${agentRunId}?`,
      confirmTitle: "Stop",
      cancelTitle: "Cancel",
    });

    if (!confirmed) return;

    try {
      await apiClient.stopAgentRun(organizationId, { agent_run_id: agentRunId });
      
      await showToast({
        style: Toast.Success,
        title: "Agent Run Stopped",
        message: `Agent run #${agentRunId} has been stopped`,
      });

      // Refresh to get updated status
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: "Failed to Stop Agent Run",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Resume an agent run
  const resumeAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    try {
      // For resume, we need a prompt - this is a simplified version
      // In a real implementation, you might want to show a form for the resume prompt
      await apiClient.resumeAgentRun(organizationId, {
        agent_run_id: agentRunId,
        prompt: "Continue with the previous task",
      });

      await showToast({
        style: Toast.Success,
        title: "Agent Run Resumed",
        message: `Agent run #${agentRunId} has been resumed`,
      });

      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: "Failed to Resume Agent Run",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Add an agent run to monitor by ID or URL
  const addAgentRunToMonitor = async () => {
    if (!organizationId) return;

    try {
      // Check clipboard for potential agent run ID or URL
      const clipboardText = await Clipboard.readText();
      let suggestedInput = "";
      
      if (clipboardText) {
        console.log("🔍 Checking clipboard for agent run:", clipboardText);
        
        // Try multiple URL patterns to extract agent run ID
        const urlPatterns = [
          /codegen\.com\/agent\/trace\/(\d+)/,           // Original pattern
          /chadcode\.sh\/agent\/trace\/(\d+)/,
        ];
        
        // Try each pattern
        for (const pattern of urlPatterns) {
          const match = clipboardText.match(pattern);
          if (match) {
            suggestedInput = match[1];
            console.log("✅ Extracted agent run ID from URL:", suggestedInput);
            break;
          }
        }
        
        // If no URL match, check if it's just a number
        if (!suggestedInput && /^\d+$/.test(clipboardText.trim())) {
          suggestedInput = clipboardText.trim();
          console.log("✅ Using direct agent run ID:", suggestedInput);
        }
      }

      // Show instructions based on whether we found something useful in clipboard
      const instructions = suggestedInput 
        ? `Found agent run ID ${suggestedInput} in clipboard. Press Enter to add it, or replace with a different ID/URL.`
        : "Copy an agent run ID or Codegen URL to your clipboard first, then try again.";

      await showToast({
        style: suggestedInput ? Toast.Success : Toast.Failure,
        title: suggestedInput ? `Add Agent Run #${suggestedInput}?` : "Copy Agent Run ID First",
        message: instructions,
      });

      if (!suggestedInput) return;

      // Parse the agent run ID
      const agentRunId = parseInt(suggestedInput, 10);

      await showToast({
        style: Toast.Animated,
        title: "Adding Agent Run",
        message: `Fetching details for agent run #${agentRunId}...`,
      });

      // Fetch the agent run from the API
      const agentRun = await apiClient.getAgentRun(organizationId, agentRunId);
      
      // Add to cache and tracking
      await cache.updateAgentRun(organizationId, agentRun);
      await cache.addToTracking(organizationId, agentRun);

      await showToast({
        style: Toast.Success,
        title: "Agent Run Added",
        message: `Now monitoring agent run #${agentRunId} - you'll get notifications for status changes`,
      });

      // Refresh to show the new agent run
      await refresh();

    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: "Failed to Add Agent Run",
        message: error instanceof Error ? error.message : "Could not fetch or add the agent run",
      });
    }
  };

  // Delete an agent run
  const deleteAgentRun = async (agentRunId: number) => {
    if (!organizationId) return;

    const confirmed = await confirmAlert({
      title: "Delete Agent Run",
      message: `Are you sure you want to delete agent run #${agentRunId}? This will remove it from your local cache.`,
      confirmTitle: "Delete",
      cancelTitle: "Cancel",
    });

    if (!confirmed) return;

    try {
      // Remove from cache
      await cache.removeAgentRun(organizationId, agentRunId);
      
      await showToast({
        style: Toast.Success,
        title: "Agent Run Deleted",
        message: `Agent run #${agentRunId} has been removed`,
      });

      // Refresh to update the list
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: "Failed to Delete Agent Run",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    updateFilters(clearFilters());
    setSearchText("");
  };

  // Filter by status
  const filterByStatus = (status: AgentRunStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    updateFilters({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  // Get sync status display
  const getSyncStatusAccessory = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return { tooltip: "Syncing..." };
      case SyncStatus.ERROR:
        return { tooltip: "Sync failed" };
      case SyncStatus.SUCCESS:
        return { tooltip: "Synced" };
      default:
        return undefined;
    }
  };

  if (error && !isLoading) {
    return (
      <List>
        <List_EmptyView
          
          title="Error Loading Agent Runs"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search agent runs..."
    >
      {filteredRuns.length === 0 && !isLoading ? (
        <List_EmptyView
          
          title={hasActiveFilters(filters) ? "No Matching Agent Runs" : "No Agent Runs"}
          description={
            hasActiveFilters(filters)
              ? "Try adjusting your search or filters"
              : "Create your first agent run to get started"
          }
          actions={
            <ActionPanel>
              <Action
                title="Add Agent Run to Monitor"
                
                onAction={addAgentRunToMonitor}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
              />
              <Action
                title="Create Agent Run"
                onAction={() => {
                  // Navigate to create form
                  console.log("Navigate to create agent run");
                }}
              />
              {hasActiveFilters(filters) && (
                <Action
                  title="Clear Filters"
                  
                  onAction={handleClearFilters}
                />
              )}
              <Action title="Refresh"  onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        filteredRuns.map((run) => {
          const statusDisplay = getStatusDisplay(run.status);
          const canStop = run.status === AgentRunStatus.ACTIVE;
          const canResume = run.status === AgentRunStatus.PAUSED;

          return (
            <List_Item
              key={run.id}
              title={`Agent Run #${run.id}`}
              subtitle={`Created ${formatDate(run.created_at)}`}
              icon="🔄"
              accessories={[
                { text: run.status },
              ]}
              actions={
                <ActionPanel>
                  
                    <Action
                      title="Add Agent Run to Monitor"
                      
                      onAction={addAgentRunToMonitor}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                    />
                    <OpenAction
                      title="Open in Browser"
                      target={run.web_url}
                    />
                    <CopyAction
                      title="Copy Web URL"
                      content={run.web_url}
                    />
                  

                  
                    {canStop && (
                      <Action
                        title="Stop Agent Run"
                        
                        style="destructive"
                        onAction={() => stopAgentRun(run.id)}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    )}
                    {canResume && (
                      <Action
                        title="Resume Agent Run"
                        
                        onAction={() => resumeAgentRun(run.id)}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    )}
                  

                  
                    <Action
                      title="Refresh"
                      
                      onAction={refresh}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                    {hasActiveFilters(filters) && (
                      <Action
                        title="Clear Filters"
                        
                        onAction={handleClearFilters}
                      />
                    )}
                    <Action
                      title="Delete Agent Run"
                      
                      style="destructive"
                      onAction={() => deleteAgentRun(run.id)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
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
