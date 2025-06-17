import React from 'react';
import { Project } from './types/dashboard';

interface ListProjectsProps {
  projects?: Project[];
  limit?: number;
}

const ListProjects: React.FC<ListProjectsProps> = ({ projects = [], limit }) => {
  const displayProjects = limit ? projects.slice(0, limit) : projects;
  
  if (displayProjects.length === 0) {
    return (
      <div className="empty-state">
        <p>No projects found.</p>
        <p>Projects will appear here once you connect your GitHub account and repositories.</p>
      </div>
    );
  }
  
  return (
    <div className="projects-list">
      {displayProjects.map((project) => (
        <div key={project.id} className="project-item">
          <div className="project-header">
            <div className="project-name">{project.name}</div>
            <div className="project-visibility">{project.isPrivate ? 'Private' : 'Public'}</div>
          </div>
          <div className="project-details">
            <div className="project-repo">{project.repoFullName}</div>
            <div className="project-updated">Updated {new Date(project.updatedAt).toLocaleDateString()}</div>
          </div>
          {project.description && (
            <div className="project-description">{project.description}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ListProjects;

