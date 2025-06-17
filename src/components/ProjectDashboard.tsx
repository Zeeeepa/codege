import React, { useState, useEffect } from 'react';
import { getProjectService } from '../services/project.service';
import { getGitHubService } from '../services/github.service';
import { Project, RequirementStatus, ImplementationStatus } from '../types/project';
import { GitHubUser } from '../types/github';
import { showToast, Toast_Style as Toast } from './WebToast';
import { showAlert } from './WebAlert';
import AddProjectDialog from './AddProjectDialog';
import RequirementsDialog from './RequirementsDialog';
import PlanEditor from './PlanEditor';

const ProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);

  const projectService = getProjectService();
  const githubService = getGitHubService();

  useEffect(() => {
    loadProjects();
    checkGitHubAuth();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const checkGitHubAuth = () => {
    if (githubService.isAuthenticated()) {
      setGithubUser(githubService.getCurrentUser());
    }
  };

  const handleGitHubAuth = async () => {
    try {
      const authUrl = await githubService.startOAuthFlow();
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      // Listen for auth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'github-auth-success') {
          setGithubUser(githubService.getCurrentUser());
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: 'Authentication Failed',
        message: 'Failed to start GitHub authentication',
      });
    }
  };

  const handleAddProject = () => {
    if (!githubService.isAuthenticated()) {
      showAlert({
        title: 'GitHub Authentication Required',
        message: 'Please connect your GitHub account to add projects.',
        primaryAction: {
          title: 'Connect GitHub',
          onAction: handleGitHubAuth,
        },
        dismissAction: {
          title: 'Cancel',
          onAction: () => {},
        },
      });
      return;
    }
    setShowAddProjectDialog(true);
  };

  const handleProjectAdded = async (project: Project) => {
    setShowAddProjectDialog(false);
    await loadProjects();
  };

  const handleAddRequirements = (project: Project) => {
    setSelectedProject(project);
    setShowRequirementsDialog(true);
  };

  const handleRequirementAdded = async () => {
    setShowRequirementsDialog(false);
    setSelectedProject(null);
    await loadProjects();
  };

  const handleCreatePlan = async (requirement: any) => {
    try {
      // Get organization ID from stored preferences or default
      const organizationId = 1; // This should come from user preferences
      
      await projectService.createPlan(requirement.id, organizationId);
      await loadProjects();
      
      await showToast({
        style: Toast.Success,
        title: 'Plan Creation Started',
        message: 'AI is generating your implementation plan...',
      });
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: 'Plan Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create plan',
      });
    }
  };

  const handleEditPlan = (requirement: any) => {
    setSelectedRequirement(requirement);
    setShowPlanEditor(true);
  };

  const handlePlanUpdated = async () => {
    setShowPlanEditor(false);
    setSelectedRequirement(null);
    await loadProjects();
  };

  const handleStartImplementation = async (requirement: any) => {
    if (!requirement.plan) return;

    try {
      const organizationId = 1; // This should come from user preferences
      await projectService.startImplementation(requirement.plan.id, organizationId);
      await loadProjects();
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: 'Implementation Failed',
        message: error instanceof Error ? error.message : 'Failed to start implementation',
      });
    }
  };

  const getStatusColor = (status: RequirementStatus): string => {
    switch (status) {
      case RequirementStatus.DRAFT: return '#6b7280';
      case RequirementStatus.PLANNING: return '#f59e0b';
      case RequirementStatus.PLANNED: return '#3b82f6';
      case RequirementStatus.IMPLEMENTING: return '#8b5cf6';
      case RequirementStatus.COMPLETED: return '#10b981';
      case RequirementStatus.FAILED: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getImplementationStatusText = (status: ImplementationStatus): string => {
    switch (status) {
      case ImplementationStatus.NOT_STARTED: return 'Not Started';
      case ImplementationStatus.IN_PROGRESS: return 'In Progress';
      case ImplementationStatus.PR_CREATED: return 'PR Created';
      case ImplementationStatus.PR_MERGED: return 'PR Merged';
      case ImplementationStatus.FAILED: return 'Failed';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="project-dashboard loading">
        <div className="loading-spinner">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="project-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Project Dashboard</h1>
          <div className="header-actions">
            {githubUser ? (
              <div className="github-user">
                <img src={githubUser.avatar_url} alt={githubUser.login} className="user-avatar" />
                <span>{githubUser.login}</span>
              </div>
            ) : (
              <button className="auth-button" onClick={handleGitHubAuth}>
                Connect GitHub
              </button>
            )}
            <button className="add-project-button" onClick={handleAddProject}>
              Add Project
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={loadProjects}>Retry</button>
        </div>
      )}

      <div className="projects-grid">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No Projects Yet</h3>
            <p>Add your first project to get started with AI-powered development.</p>
            <button className="add-first-project" onClick={handleAddProject}>
              Add Your First Project
            </button>
          </div>
        ) : (
          projects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <h3 className="project-name">{project.name}</h3>
                <div className="project-meta">
                  <span className="repo-link">
                    <a href={project.repository.url} target="_blank" rel="noopener noreferrer">
                      {project.repository.full_name}
                    </a>
                  </span>
                </div>
              </div>

              {project.description && (
                <p className="project-description">{project.description}</p>
              )}

              <div className="project-stats">
                <div className="stat">
                  <span className="stat-label">Requirements:</span>
                  <span className="stat-value">{project.requirements.length}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Notifications:</span>
                  <span className="stat-value">
                    {projectService.getUnreadNotificationsCount(project.id)}
                  </span>
                </div>
              </div>

              <div className="requirements-section">
                <div className="requirements-header">
                  <h4>Requirements</h4>
                  <button 
                    className="add-requirement-button"
                    onClick={() => handleAddRequirements(project)}
                  >
                    Add Requirements
                  </button>
                </div>

                {project.requirements.length === 0 ? (
                  <p className="no-requirements">No requirements yet. Add some to get started!</p>
                ) : (
                  <div className="requirements-list">
                    {project.requirements.map(requirement => (
                      <div key={requirement.id} className="requirement-item">
                        <div className="requirement-header">
                          <span 
                            className="requirement-status"
                            style={{ backgroundColor: getStatusColor(requirement.status) }}
                          >
                            {requirement.status}
                          </span>
                        </div>
                        
                        <div className="requirement-text">
                          {requirement.text}
                        </div>

                        <div className="requirement-actions">
                          {!requirement.plan && requirement.status === RequirementStatus.DRAFT && (
                            <button 
                              className="create-plan-button"
                              onClick={() => handleCreatePlan(requirement)}
                            >
                              Create Plan
                            </button>
                          )}

                          {requirement.plan && (
                            <div className="plan-section">
                              <div className="plan-status">
                                <span>Implementation: {getImplementationStatusText(requirement.plan.implementation_status)}</span>
                                {requirement.plan.is_edited && <span className="edited-badge">Edited</span>}
                              </div>
                              
                              <div className="plan-actions">
                                <button 
                                  className="edit-plan-button"
                                  onClick={() => handleEditPlan(requirement)}
                                >
                                  Edit Plan
                                </button>
                                
                                {requirement.plan.implementation_status === ImplementationStatus.NOT_STARTED && (
                                  <button 
                                    className="start-implementation-button"
                                    onClick={() => handleStartImplementation(requirement)}
                                  >
                                    Start
                                  </button>
                                )}

                                {requirement.plan.pr_url && (
                                  <a 
                                    href={requirement.plan.pr_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="pr-link"
                                  >
                                    View PR
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {project.notifications.length > 0 && (
                <div className="notifications-section">
                  <h4>Recent Notifications</h4>
                  <div className="notifications-list">
                    {project.notifications.slice(0, 3).map(notification => (
                      <div 
                        key={notification.id} 
                        className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      >
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-message">{notification.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialogs */}
      {showAddProjectDialog && (
        <AddProjectDialog
          onClose={() => setShowAddProjectDialog(false)}
          onProjectAdded={handleProjectAdded}
        />
      )}

      {showRequirementsDialog && selectedProject && (
        <RequirementsDialog
          project={selectedProject}
          onClose={() => {
            setShowRequirementsDialog(false);
            setSelectedProject(null);
          }}
          onRequirementAdded={handleRequirementAdded}
        />
      )}

      {showPlanEditor && selectedRequirement && (
        <PlanEditor
          requirement={selectedRequirement}
          onClose={() => {
            setShowPlanEditor(false);
            setSelectedRequirement(null);
          }}
          onPlanUpdated={handlePlanUpdated}
        />
      )}
    </div>
  );
};

export default ProjectDashboard;

