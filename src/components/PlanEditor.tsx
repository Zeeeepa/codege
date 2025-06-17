import React, { useState, useEffect } from 'react';
import { getProjectService } from '../services/project.service';
import { Requirement, Plan, ImplementationStatus } from '../types/project';
import { showToast, Toast_Style as Toast } from './WebToast';
import { showAlert } from './WebAlert';

interface PlanEditorProps {
  requirement: Requirement;
  onClose: () => void;
  onPlanUpdated: () => void;
}

const PlanEditor: React.FC<PlanEditorProps> = ({ requirement, onClose, onPlanUpdated }) => {
  const [planContent, setPlanContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const projectService = getProjectService();

  useEffect(() => {
    if (requirement.plan) {
      setPlanContent(requirement.plan.content);
      setOriginalContent(requirement.plan.original_content);
    }
  }, [requirement]);

  useEffect(() => {
    setHasChanges(planContent !== originalContent);
  }, [planContent, originalContent]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPlanContent(e.target.value);
    if (error) setError(null);
  };

  const handleSave = async () => {
    if (!requirement.plan) return;

    try {
      setSaving(true);
      setError(null);

      await projectService.updatePlan(requirement.plan.id, planContent);
      setOriginalContent(planContent);
      
      await showToast({
        style: Toast.Success,
        title: 'Plan Saved',
        message: 'Your implementation plan has been updated',
      });

      onPlanUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleStartImplementation = async () => {
    if (!requirement.plan) return;

    // Show confirmation dialog
    showAlert({
      title: 'Start Implementation',
      message: 'This will start the AI implementation process. The agent will create code changes and submit a pull request. Are you sure you want to continue?',
      primaryAction: {
        title: 'Start Implementation',
        onAction: async () => {
          try {
            setImplementing(true);
            setError(null);

            // Save any pending changes first
            if (hasChanges) {
              await projectService.updatePlan(requirement.plan!.id, planContent);
            }

            // Start implementation
            const organizationId = 1; // This should come from user preferences
            await projectService.startImplementation(requirement.plan!.id, organizationId);

            await showToast({
              style: Toast.Success,
              title: 'Implementation Started',
              message: 'AI agent is implementing your plan...',
            });

            onPlanUpdated();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start implementation');
          } finally {
            setImplementing(false);
          }
        },
      },
      dismissAction: {
        title: 'Cancel',
        onAction: () => {},
      },
    });
  };

  const handleResetToOriginal = () => {
    showAlert({
      title: 'Reset to Original',
      message: 'This will discard all your changes and reset the plan to the original AI-generated version. Are you sure?',
      primaryAction: {
        title: 'Reset',
        onAction: () => {
          setPlanContent(originalContent);
          setError(null);
        },
      },
      dismissAction: {
        title: 'Cancel',
        onAction: () => {},
      },
    });
  };

  const handleClose = () => {
    if (hasChanges) {
      showAlert({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save them before closing?',
        primaryAction: {
          title: 'Save & Close',
          onAction: async () => {
            await handleSave();
            onClose();
          },
        },
        dismissAction: {
          title: 'Discard Changes',
          onAction: onClose,
        },
      });
    } else {
      onClose();
    }
  };

  const getImplementationStatusText = (status: ImplementationStatus): string => {
    switch (status) {
      case ImplementationStatus.NOT_STARTED: return 'Ready to implement';
      case ImplementationStatus.IN_PROGRESS: return 'Implementation in progress...';
      case ImplementationStatus.PR_CREATED: return 'Pull request created';
      case ImplementationStatus.PR_MERGED: return 'Implementation completed';
      case ImplementationStatus.FAILED: return 'Implementation failed';
      default: return 'Unknown status';
    }
  };

  const getImplementationStatusColor = (status: ImplementationStatus): string => {
    switch (status) {
      case ImplementationStatus.NOT_STARTED: return '#6b7280';
      case ImplementationStatus.IN_PROGRESS: return '#f59e0b';
      case ImplementationStatus.PR_CREATED: return '#3b82f6';
      case ImplementationStatus.PR_MERGED: return '#10b981';
      case ImplementationStatus.FAILED: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const canStartImplementation = requirement.plan && 
    requirement.plan.implementation_status === ImplementationStatus.NOT_STARTED &&
    planContent.trim().length > 0;

  const isImplementationInProgress = requirement.plan &&
    requirement.plan.implementation_status === ImplementationStatus.IN_PROGRESS;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-content plan-editor-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="header-content">
            <h2>Implementation Plan</h2>
            {requirement.plan && (
              <div className="plan-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getImplementationStatusColor(requirement.plan.implementation_status) }}
                >
                  {getImplementationStatusText(requirement.plan.implementation_status)}
                </span>
                {requirement.plan.is_edited && <span className="edited-badge">Edited</span>}
              </div>
            )}
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="dialog-body">
          <div className="requirement-info">
            <h3>Requirement</h3>
            <p className="requirement-text">{requirement.text}</p>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="plan-editor">
            <div className="editor-header">
              <h3>Implementation Plan</h3>
              <div className="editor-actions">
                {hasChanges && (
                  <button 
                    className="reset-button"
                    onClick={handleResetToOriginal}
                    disabled={saving || implementing}
                  >
                    Reset to Original
                  </button>
                )}
                <div className="changes-indicator">
                  {hasChanges ? '● Unsaved changes' : '✓ Saved'}
                </div>
              </div>
            </div>

            <textarea
              value={planContent}
              onChange={handleContentChange}
              placeholder="Implementation plan will appear here..."
              className="plan-textarea"
              disabled={loading || implementing}
            />

            <div className="editor-footer">
              <div className="editor-stats">
                <span>{planContent.length} characters</span>
                <span>{planContent.split('\n').length} lines</span>
              </div>
              
              <div className="editor-help">
                <p>💡 <strong>Tip:</strong> You can edit this plan to add more details, modify steps, or adjust the implementation approach before starting.</p>
              </div>
            </div>
          </div>

          {requirement.plan?.pr_url && (
            <div className="pr-section">
              <h3>Pull Request</h3>
              <div className="pr-info">
                <a 
                  href={requirement.plan.pr_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="pr-link"
                >
                  View Pull Request →
                </a>
                <p>The implementation has been completed and a pull request has been created.</p>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <div className="footer-left">
            {isImplementationInProgress && (
              <div className="implementation-progress">
                <div className="progress-spinner"></div>
                <span>Implementation in progress...</span>
              </div>
            )}
          </div>
          
          <div className="footer-right">
            <button 
              className="cancel-button" 
              onClick={handleClose}
              disabled={saving || implementing}
            >
              Close
            </button>
            
            {hasChanges && (
              <button 
                className="save-button"
                onClick={handleSave}
                disabled={saving || implementing || !planContent.trim()}
              >
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            )}
            
            {canStartImplementation && (
              <button 
                className="implement-button"
                onClick={handleStartImplementation}
                disabled={saving || implementing || hasChanges}
              >
                {implementing ? 'Starting...' : 'Start Implementation'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanEditor;

