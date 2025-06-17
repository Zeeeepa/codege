import React from 'react';
import { Organization } from './types/dashboard';

interface ListOrganizationsProps {
  organizations?: Organization[];
  limit?: number;
}

const ListOrganizations: React.FC<ListOrganizationsProps> = ({ organizations = [], limit }) => {
  const displayOrganizations = limit ? organizations.slice(0, limit) : organizations;
  
  if (displayOrganizations.length === 0) {
    return (
      <div className="empty-state">
        <p>No organizations found.</p>
        <p>Organizations will appear here once you connect your GitHub account.</p>
      </div>
    );
  }
  
  return (
    <div className="organizations-list">
      {displayOrganizations.map((org) => (
        <div key={org.id} className="organization-item">
          <div className="organization-header">
            <div className="organization-avatar">
              {org.avatarUrl ? (
                <img src={org.avatarUrl} alt={org.name} className="org-avatar" />
              ) : (
                <div className="org-avatar-placeholder">
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="organization-name">{org.name}</div>
          </div>
          <div className="organization-details">
            <div className="organization-type">{org.type}</div>
            <div className="organization-repos">{org.repoCount} repositories</div>
          </div>
          {org.description && (
            <div className="organization-description">{org.description}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ListOrganizations;

