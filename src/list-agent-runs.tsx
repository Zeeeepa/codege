import React from 'react';
import { AgentRun } from './types/dashboard';

interface ListAgentRunsProps {
  runs?: AgentRun[];
  limit?: number;
}

const ListAgentRuns: React.FC<ListAgentRunsProps> = ({ runs = [], limit }) => {
  const displayRuns = limit ? runs.slice(0, limit) : runs;
  
  if (displayRuns.length === 0) {
    return (
      <div className="empty-state">
        <p>No agent runs found.</p>
        <p>Agent runs will appear here once you start using Codegen.</p>
      </div>
    );
  }
  
  return (
    <div className="agent-runs-list">
      {displayRuns.map((run) => (
        <div key={run.id} className="agent-run-item">
          <div className="agent-run-header">
            <div className="agent-run-name">{run.name || 'Unnamed Run'}</div>
            <div className={`agent-run-status status-${run.status}`}>{run.status}</div>
          </div>
          <div className="agent-run-details">
            <div className="agent-run-timestamp">{new Date(run.createdAt).toLocaleString()}</div>
            <div className="agent-run-duration">{run.duration ? `${run.duration}s` : 'N/A'}</div>
          </div>
          {run.description && (
            <div className="agent-run-description">{run.description}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ListAgentRuns;

