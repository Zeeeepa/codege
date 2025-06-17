import { LocalStorage } from '../utils/webStorage';
import { showToast, Toast_Style as Toast } from '../components/WebToast';
import { getAPIClient } from '../api/client';
import {
  Project,
  Requirement,
  Plan,
  ProjectNotification,
  RequirementStatus,
  ImplementationStatus,
  NotificationType,

} from '../types/project';
import { GitHubRepository } from '../types/github';

// Storage keys
const STORAGE_KEYS = {
  PROJECTS: 'projects',
  REQUIREMENTS: 'requirements',
  PLANS: 'plans',
  NOTIFICATIONS: 'notifications'
};

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class ProjectService {
  private projects: Project[] = [];
  private requirements: Requirement[] = [];
  private plans: Plan[] = [];
  private notifications: ProjectNotification[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // Load data from local storage
  private async loadFromStorage(): Promise<void> {
    try {
      const [projectsData, requirementsData, plansData, notificationsData] = await Promise.all([
        LocalStorage.getItem(STORAGE_KEYS.PROJECTS),
        LocalStorage.getItem(STORAGE_KEYS.REQUIREMENTS),
        LocalStorage.getItem(STORAGE_KEYS.PLANS),
        LocalStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)
      ]);

      this.projects = projectsData ? JSON.parse(projectsData) : [];
      this.requirements = requirementsData ? JSON.parse(requirementsData) : [];
      this.plans = plansData ? JSON.parse(plansData) : [];
      this.notifications = notificationsData ? JSON.parse(notificationsData) : [];

      // Populate projects with their requirements and notifications
      this.populateProjectRelations();
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      // Initialize with empty arrays if loading fails
      this.projects = [];
      this.requirements = [];
      this.plans = [];
      this.notifications = [];
    }
  }

  // Save data to local storage
  private async saveToStorage(): Promise<void> {
    try {
      await Promise.all([
        LocalStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects)),
        LocalStorage.setItem(STORAGE_KEYS.REQUIREMENTS, JSON.stringify(this.requirements)),
        LocalStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(this.plans)),
        LocalStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications))
      ]);
    } catch (error) {
      console.error('Failed to save data to storage:', error);
      throw new Error('Failed to save data');
    }
  }

  // Populate projects with their related data
  private populateProjectRelations(): void {
    this.projects = this.projects.map(project => ({
      ...project,
      requirements: this.requirements
        .filter(req => req.project_id === project.id)
        .map(req => ({
          ...req,
          plan: this.plans.find(plan => plan.requirement_id === req.id)
        })),
      notifications: this.notifications.filter(notif => notif.project_id === project.id)
    }));
  }

  // Get all projects
  async getProjects(): Promise<Project[]> {
    await this.loadFromStorage();
    return this.projects;
  }

  // Get project by ID
  async getProject(id: string): Promise<Project | null> {
    await this.loadFromStorage();
    return this.projects.find(project => project.id === id) || null;
  }

  // Create new project from GitHub repository
  async createProject(repository: GitHubRepository, description?: string): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId(),
      name: repository.name,
      description: description || repository.description || undefined,
      repository: {
        full_name: repository.full_name,
        url: repository.html_url,
        default_branch: repository.default_branch
      },
      requirements: [],
      notifications: [],
      created_at: now,
      updated_at: now
    };

    this.projects.push(project);
    await this.saveToStorage();

    await showToast({
      style: Toast.Success,
      title: 'Project Added',
      message: `${repository.name} has been added to your dashboard`,
    });

    return project;
  }

  // Update project
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const projectIndex = this.projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    this.projects[projectIndex] = {
      ...this.projects[projectIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    await this.saveToStorage();
    return this.projects[projectIndex];
  }

  // Delete project
  async deleteProject(id: string): Promise<void> {
    const projectIndex = this.projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    // Remove related requirements, plans, and notifications
    this.requirements = this.requirements.filter(req => req.project_id !== id);
    this.plans = this.plans.filter(plan => {
      const requirement = this.requirements.find(req => req.id === plan.requirement_id);
      return requirement?.project_id !== id;
    });
    this.notifications = this.notifications.filter(notif => notif.project_id !== id);

    // Remove project
    this.projects.splice(projectIndex, 1);
    await this.saveToStorage();

    await showToast({
      style: Toast.Success,
      title: 'Project Deleted',
      message: 'Project and all related data have been removed',
    });
  }

  // Add requirement to project
  async addRequirement(projectId: string, text: string): Promise<Requirement> {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const now = new Date().toISOString();
    const requirement: Requirement = {
      id: generateId(),
      project_id: projectId,
      text,
      status: RequirementStatus.DRAFT,
      created_at: now,
      updated_at: now
    };

    this.requirements.push(requirement);
    await this.saveToStorage();

    await showToast({
      style: Toast.Success,
      title: 'Requirement Added',
      message: 'New requirement has been added to the project',
    });

    return requirement;
  }

  // Update requirement
  async updateRequirement(id: string, updates: Partial<Requirement>): Promise<Requirement> {
    const requirementIndex = this.requirements.findIndex(r => r.id === id);
    if (requirementIndex === -1) {
      throw new Error('Requirement not found');
    }

    this.requirements[requirementIndex] = {
      ...this.requirements[requirementIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    await this.saveToStorage();
    return this.requirements[requirementIndex];
  }

  // Create plan for requirement using Codegen API
  async createPlan(requirementId: string, organizationId: number): Promise<Plan> {
    const requirement = this.requirements.find(r => r.id === requirementId);
    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const project = this.projects.find(p => p.id === requirement.project_id);
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      // Update requirement status
      await this.updateRequirement(requirementId, { status: RequirementStatus.PLANNING });

      // Call Codegen API to create agent run with CreatePlan template
      const apiClient = getAPIClient();
      const agentRun = await apiClient.createAgentRun(organizationId, {
        prompt: this.buildCreatePlanPrompt(requirement.text)
      });

      // Create plan record
      const now = new Date().toISOString();
      const plan: Plan = {
        id: generateId(),
        requirement_id: requirementId,
        content: 'Plan is being generated... Please wait.',
        original_content: '',
        is_edited: false,
        implementation_status: ImplementationStatus.NOT_STARTED,
        agent_run_id: agentRun.id,
        created_at: now,
        updated_at: now
      };

      this.plans.push(plan);
      await this.updateRequirement(requirementId, { 
        status: RequirementStatus.PLANNING,
        plan 
      });
      await this.saveToStorage();

      // Start polling for plan completion
      this.pollForPlanCompletion(plan.id, agentRun.id, organizationId);

      await showToast({
        style: Toast.Success,
        title: 'Plan Creation Started',
        message: 'AI is generating your implementation plan...',
      });

      return plan;
    } catch (error) {
      await this.updateRequirement(requirementId, { status: RequirementStatus.DRAFT });
      console.error('Failed to create plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  // Build the comprehensive CreatePlan prompt
  private buildCreatePlanPrompt(requirementText: string): string {
    return `
🚀 Ultimate Codebase Feature Implementation Planner

ROLE: Master Codebase Feature Architect & Implementation Strategist
CORE MISSION: Transform user feature requirements into bulletproof, dependency-aware implementation plans.

INPUT PROCESSING FRAMEWORK
Phase 1: Requirements Intelligence Gathering
- Analyze {UserRequirementsForFeatureInCodebase} using progressive prompting methodology
- Extract functional requirements, non-functional requirements, and implicit assumptions
- Identify stakeholders, success criteria, and potential edge cases
- Map requirements to existing codebase architecture and constraints

Phase 2: Contextual Architecture Analysis
- Assess current codebase structure, patterns, and technical debt
- Identify integration points, dependencies, and potential conflicts
- Evaluate performance implications and scalability considerations
- Determine testing strategy and validation approaches

USER REQUIREMENTS FOR FEATURE IN CODEBASE:
${requirementText}

Please generate a comprehensive implementation plan following the JSON structure with all required sections including meta, requirements_analysis, architecture_blueprint, implementation_plan, quality_assurance, deployment_strategy, and post_implementation.

Focus on creating actionable, detailed steps that can be executed by a development team without requiring additional clarification.
`;
  }

  // Poll for plan completion
  private async pollForPlanCompletion(planId: string, agentRunId: number, organizationId: number): Promise<void> {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const apiClient = getAPIClient();
        const agentRun = await apiClient.getAgentRun(organizationId, agentRunId);

        if (agentRun.status === 'completed') {
          // Extract plan content from agent run logs or response
          const planContent = await this.extractPlanFromAgentRun(agentRun);
          
          // Update plan with generated content
          const planIndex = this.plans.findIndex(p => p.id === planId);
          if (planIndex !== -1) {
            this.plans[planIndex] = {
              ...this.plans[planIndex],
              content: planContent,
              original_content: planContent,
              updated_at: new Date().toISOString()
            };

            // Update requirement status
            const requirement = this.requirements.find(r => r.id === this.plans[planIndex].requirement_id);
            if (requirement) {
              await this.updateRequirement(requirement.id, { 
                status: RequirementStatus.PLANNED,
                plan: this.plans[planIndex]
              });
            }

            await this.saveToStorage();

            await showToast({
              style: Toast.Success,
              title: 'Plan Generated',
              message: 'Your implementation plan is ready for review',
            });
          }
        } else if (agentRun.status === 'failed') {
          throw new Error('Plan generation failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          throw new Error('Plan generation timed out');
        }
      } catch (error) {
        console.error('Error polling for plan completion:', error);
        
        // Update plan with error
        const planIndex = this.plans.findIndex(p => p.id === planId);
        if (planIndex !== -1) {
          this.plans[planIndex] = {
            ...this.plans[planIndex],
            content: 'Failed to generate plan. Please try again.',
            updated_at: new Date().toISOString()
          };

          const requirement = this.requirements.find(r => r.id === this.plans[planIndex].requirement_id);
          if (requirement) {
            await this.updateRequirement(requirement.id, { status: RequirementStatus.DRAFT });
          }

          await this.saveToStorage();
        }

        await showToast({
          style: Toast.Failure,
          title: 'Plan Generation Failed',
          message: 'Failed to generate implementation plan',
        });
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 5000);
  }

  // Extract plan content from agent run
  private async extractPlanFromAgentRun(agentRun: any): Promise<string> {
    // This would extract the actual plan content from the agent run
    // For now, we'll return a placeholder
    return `# Implementation Plan

## Overview
This is a generated implementation plan for your requirement.

## Steps
1. Analyze requirements
2. Design solution
3. Implement features
4. Test implementation
5. Deploy changes

## Next Steps
Review this plan and click "Start" to begin implementation.
`;
  }

  // Update plan content
  async updatePlan(id: string, content: string): Promise<Plan> {
    const planIndex = this.plans.findIndex(p => p.id === id);
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }

    const isEdited = content !== this.plans[planIndex].original_content;
    
    this.plans[planIndex] = {
      ...this.plans[planIndex],
      content,
      is_edited: isEdited,
      updated_at: new Date().toISOString()
    };

    await this.saveToStorage();
    return this.plans[planIndex];
  }

  // Start plan implementation
  async startImplementation(planId: string, organizationId: number): Promise<void> {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const requirement = this.requirements.find(r => r.id === plan.requirement_id);
    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const project = this.projects.find(p => p.id === requirement.project_id);
    if (!project) {
      throw new Error('Project not found');
    }

    try {
      // Update statuses
      await this.updatePlan(planId, plan.content);
      const planIndex = this.plans.findIndex(p => p.id === planId);
      this.plans[planIndex].implementation_status = ImplementationStatus.IN_PROGRESS;
      
      await this.updateRequirement(requirement.id, { status: RequirementStatus.IMPLEMENTING });

      // Create implementation request
      // Call Codegen API to start implementation
      const apiClient = getAPIClient();
      const agentRun = await apiClient.createAgentRun(organizationId, {
        prompt: this.buildImplementPlanPrompt(plan.content, project.repository.full_name, requirement.text)
      });

      // Update plan with agent run ID
      this.plans[planIndex].agent_run_id = agentRun.id;
      await this.saveToStorage();

      // Start polling for implementation completion
      this.pollForImplementationCompletion(planId, agentRun.id, organizationId);

      await showToast({
        style: Toast.Success,
        title: 'Implementation Started',
        message: 'AI agent is implementing your plan...',
      });

    } catch (error) {
      console.error('Failed to start implementation:', error);
      throw new Error('Failed to start implementation');
    }
  }

  // Build the ImplementPlan prompt
  private buildImplementPlanPrompt(planContent: string, repository: string, requirementText: string): string {
    return `
🚀 Implementation Agent - Execute Plan

MISSION: Implement the provided plan in the specified repository.

REPOSITORY: ${repository}
REQUIREMENT: ${requirementText}

IMPLEMENTATION PLAN:
${planContent}

Please implement this plan step by step, creating the necessary code changes, and submit a pull request when complete.
`;
  }

  // Poll for implementation completion
  private async pollForImplementationCompletion(planId: string, agentRunId: number, organizationId: number): Promise<void> {
    const maxAttempts = 60; // 10 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const apiClient = getAPIClient();
        const agentRun = await apiClient.getAgentRun(organizationId, agentRunId);

        if (agentRun.status === 'completed') {
          // Update plan status
          const planIndex = this.plans.findIndex(p => p.id === planId);
          if (planIndex !== -1) {
            this.plans[planIndex].implementation_status = ImplementationStatus.PR_CREATED;
            this.plans[planIndex].pr_url = 'https://github.com/example/repo/pull/123'; // This would be extracted from agent run
            
            const requirement = this.requirements.find(r => r.id === this.plans[planIndex].requirement_id);
            if (requirement) {
              await this.updateRequirement(requirement.id, { status: RequirementStatus.COMPLETED });
              
              // Add notification
              await this.addNotification(requirement.project_id, {
                type: NotificationType.IMPLEMENTATION_COMPLETED,
                title: 'Implementation Complete',
                message: `Implementation for "${requirement.text}" has been completed and a PR has been created.`,
                data: { pr_url: this.plans[planIndex].pr_url }
              });
            }

            await this.saveToStorage();

            await showToast({
              style: Toast.Success,
              title: 'Implementation Complete',
              message: 'Your feature has been implemented and a PR has been created',
            });
          }
        } else if (agentRun.status === 'failed') {
          throw new Error('Implementation failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          throw new Error('Implementation timed out');
        }
      } catch (error) {
        console.error('Error polling for implementation completion:', error);
        
        // Update plan with error
        const planIndex = this.plans.findIndex(p => p.id === planId);
        if (planIndex !== -1) {
          this.plans[planIndex].implementation_status = ImplementationStatus.FAILED;
          
          const requirement = this.requirements.find(r => r.id === this.plans[planIndex].requirement_id);
          if (requirement) {
            await this.updateRequirement(requirement.id, { status: RequirementStatus.FAILED });
            
            // Add notification
            await this.addNotification(requirement.project_id, {
              type: NotificationType.IMPLEMENTATION_FAILED,
              title: 'Implementation Failed',
              message: `Implementation for "${requirement.text}" has failed.`,
            });
          }

          await this.saveToStorage();
        }

        await showToast({
          style: Toast.Failure,
          title: 'Implementation Failed',
          message: 'Failed to implement the plan',
        });
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 5000);
  }

  // Add notification
  async addNotification(projectId: string, notification: Omit<ProjectNotification, 'id' | 'project_id' | 'read' | 'created_at'>): Promise<ProjectNotification> {
    const newNotification: ProjectNotification = {
      id: generateId(),
      project_id: projectId,
      read: false,
      created_at: new Date().toISOString(),
      ...notification
    };

    this.notifications.push(newNotification);
    await this.saveToStorage();

    return newNotification;
  }

  // Mark notification as read
  async markNotificationAsRead(id: string): Promise<void> {
    const notificationIndex = this.notifications.findIndex(n => n.id === id);
    if (notificationIndex !== -1) {
      this.notifications[notificationIndex].read = true;
      await this.saveToStorage();
    }
  }

  // Get unread notifications count for project
  getUnreadNotificationsCount(projectId: string): number {
    return this.notifications.filter(n => n.project_id === projectId && !n.read).length;
  }

  // Clear all data (for testing/reset)
  async clearAllData(): Promise<void> {
    this.projects = [];
    this.requirements = [];
    this.plans = [];
    this.notifications = [];
    await this.saveToStorage();
  }
}

// Singleton instance
let projectService: ProjectService | null = null;

export function getProjectService(): ProjectService {
  if (!projectService) {
    projectService = new ProjectService();
  }
  return projectService;
}

// Reset service (useful for testing)
export function resetProjectService(): void {
  projectService = null;
}
