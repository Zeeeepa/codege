import React, { useState, useEffect } from 'react';
import { getGitHubService } from '../services/github.service';
import { getProjectService } from '../services/project.service';
import { GitHubRepository } from '../types/github';
import { Project } from '../types/project';
import { showToast, Toast_Style as Toast } from './WebToast';

interface AddProjectDialogProps {
  onClose: () => void;
  onProjectAdded: (project: Project) => void;
}

const AddProjectDialog: React.FC<AddProjectDialogProps> = ({ onClose, onProjectAdded }) => {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepository | null>(null);
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const githubService = getGitHubService();
  const projectService = getProjectService();

  useEffect(() => {
    loadRepositories();
  }, []);

  useEffect(() => {
    filterRepositories();
  }, [searchQuery, repositories]);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const repos = await githubService.getUserRepositories(1, 100);
      setRepositories(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const filterRepositories = () => {
    if (!searchQuery.trim()) {
      setFilteredRepositories(repositories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = repositories.filter(repo => 
      repo.name.toLowerCase().includes(query) ||
      repo.full_name.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );
    
    setFilteredRepositories(filtered);
  };

  const handleRepositorySelect = (repository: GitHubRepository) => {
    setSelectedRepository(repository);
    setDescription(repository.description || '');
  };

  const handleAddProject = async () => {
    if (!selectedRepository) return;

    try {
      setAdding(true);
      
      const project = await projectService.createProject(selectedRepository, description);
      onProjectAdded(project);
      
      await showToast({
        style: Toast.Success,
        title: 'Project Added',
        message: `${selectedRepository.name} has been added to your dashboard`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Failure,
        title: 'Failed to Add Project',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageColor = (language: string | null): string => {
    const colors: Record<string, string> = {
      'JavaScript': '#f1e05a',
      'TypeScript': '#2b7489',
      'Python': '#3572A5',
      'Java': '#b07219',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'C++': '#f34b7d',
      'C#': '#239120',
      'PHP': '#4F5D95',
      'Ruby': '#701516',
      'Swift': '#ffac45',
      'Kotlin': '#F18E33',
    };
    return colors[language || ''] || '#6b7280';
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content add-project-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Add Project</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner">Loading repositories...</div>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-message">
                <span>⚠️ {error}</span>
                <button onClick={loadRepositories}>Retry</button>
              </div>
            </div>
          ) : (
            <>
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <div className="search-results-count">
                  {filteredRepositories.length} of {repositories.length} repositories
                </div>
              </div>

              <div className="repositories-list">
                {filteredRepositories.length === 0 ? (
                  <div className="empty-results">
                    {searchQuery ? 'No repositories match your search.' : 'No repositories found.'}
                  </div>
                ) : (
                  filteredRepositories.map(repo => (
                    <div
                      key={repo.id}
                      className={`repository-item ${selectedRepository?.id === repo.id ? 'selected' : ''}`}
                      onClick={() => handleRepositorySelect(repo)}
                    >
                      <div className="repo-header">
                        <div className="repo-name">
                          <span className="name">{repo.name}</span>
                          {repo.private && <span className="private-badge">Private</span>}
                        </div>
                        <div className="repo-stats">
                          <span className="stars">⭐ {repo.stargazers_count}</span>
                          <span className="forks">🍴 {repo.forks_count}</span>
                        </div>
                      </div>

                      {repo.description && (
                        <div className="repo-description">{repo.description}</div>
                      )}

                      <div className="repo-meta">
                        {repo.language && (
                          <span className="language">
                            <span 
                              className="language-dot" 
                              style={{ backgroundColor: getLanguageColor(repo.language) }}
                            ></span>
                            {repo.language}
                          </span>
                        )}
                        <span className="updated">Updated {formatDate(repo.updated_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedRepository && (
                <div className="selected-project-section">
                  <h3>Project Details</h3>
                  <div className="project-form">
                    <div className="form-group">
                      <label htmlFor="project-name">Project Name</label>
                      <input
                        id="project-name"
                        type="text"
                        value={selectedRepository.name}
                        disabled
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="project-description">Description (Optional)</label>
                      <textarea
                        id="project-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a custom description for this project..."
                        className="form-textarea"
                        rows={3}
                      />
                    </div>

                    <div className="form-group">
                      <label>Repository</label>
                      <div className="repo-info">
                        <a 
                          href={selectedRepository.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="repo-link"
                        >
                          {selectedRepository.full_name}
                        </a>
                        <span className="default-branch">
                          Default branch: {selectedRepository.default_branch}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="dialog-footer">
          <button className="cancel-button" onClick={onClose} disabled={adding}>
            Cancel
          </button>
          <button 
            className="add-button" 
            onClick={handleAddProject}
            disabled={!selectedRepository || adding}
          >
            {adding ? 'Adding...' : 'Add Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectDialog;

