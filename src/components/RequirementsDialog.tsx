import React, { useState } from 'react';
import { getProjectService } from '../services/project.service';
import { Project } from '../types/project';
import { showToast, Toast_Style as Toast } from './WebToast';

interface RequirementsDialogProps {
  project: Project;
  onClose: () => void;
  onRequirementAdded: () => void;
}

const RequirementsDialog: React.FC<RequirementsDialogProps> = ({ 
  project, 
  onClose, 
  onRequirementAdded 
}) => {
  const [requirementText, setRequirementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectService = getProjectService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requirementText.trim()) {
      setError('Please enter a requirement description');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await projectService.addRequirement(project.id, requirementText.trim());
      
      await showToast({
        style: Toast.Success,
        title: 'Requirement Added',
        message: 'New requirement has been added to the project',
      });

      onRequirementAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRequirementText(e.target.value);
    if (error) setError(null);
  };

  const exampleRequirements = [
    "Add user authentication with email and password",
    "Implement real-time chat functionality",
    "Create a dashboard with analytics charts",
    "Add file upload and storage capabilities",
    "Implement search functionality with filters",
    "Add email notification system",
    "Create responsive mobile design",
    "Implement data export to CSV/PDF"
  ];

  const insertExample = (example: string) => {
    setRequirementText(example);
    setError(null);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content requirements-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Add Requirements</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          <div className="project-info">
            <h3>{project.name}</h3>
            <p className="project-repo">
              <a href={project.repository.url} target="_blank" rel="noopener noreferrer">
                {project.repository.full_name}
              </a>
            </p>
            {project.description && (
              <p className="project-description">{project.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="requirements-form">
            <div className="form-group">
              <label htmlFor="requirement-text">
                Requirement Description
                <span className="required">*</span>
              </label>
              <textarea
                id="requirement-text"
                value={requirementText}
                onChange={handleTextareaChange}
                placeholder="Describe the feature or functionality you want to implement..."
                className={`form-textarea ${error ? 'error' : ''}`}
                rows={6}
                disabled={loading}
              />
              {error && <div className="error-message">{error}</div>}
              
              <div className="textarea-help">
                <p>Be specific about what you want to implement. Include:</p>
                <ul>
                  <li>What functionality should be added</li>
                  <li>How users should interact with it</li>
                  <li>Any specific requirements or constraints</li>
                  <li>Expected behavior and outcomes</li>
                </ul>
              </div>
            </div>

            <div className="examples-section">
              <h4>Example Requirements</h4>
              <p>Click on any example to use it as a starting point:</p>
              <div className="examples-grid">
                {exampleRequirements.map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    className="example-button"
                    onClick={() => insertExample(example)}
                    disabled={loading}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div className="character-count">
              {requirementText.length} characters
              {requirementText.length < 20 && requirementText.length > 0 && (
                <span className="warning"> (too short - be more specific)</span>
              )}
            </div>
          </form>
        </div>

        <div className="dialog-footer">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="add-button"
            onClick={handleSubmit}
            disabled={loading || !requirementText.trim() || requirementText.length < 20}
          >
            {loading ? 'Adding...' : 'Add Requirement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequirementsDialog;

