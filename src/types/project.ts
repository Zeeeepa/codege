// Project Management Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  repository: {
    full_name: string;
    url: string;
    default_branch: string;
  };
  requirements: Requirement[];
  notifications: ProjectNotification[];
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  text: string;
  plan?: Plan;
  status: RequirementStatus;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  requirement_id: string;
  content: string;
  original_content: string; // Store original AI-generated plan
  is_edited: boolean;
  implementation_status: ImplementationStatus;
  agent_run_id?: number;
  pr_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectNotification {
  id: string;
  project_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

// Enums
export enum RequirementStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  PLANNED = 'planned',
  IMPLEMENTING = 'implementing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ImplementationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PR_CREATED = 'pr_created',
  PR_MERGED = 'pr_merged',
  FAILED = 'failed'
}

export enum NotificationType {
  PR_CREATED = 'pr_created',
  PR_UPDATED = 'pr_updated',
  PR_MERGED = 'pr_merged',
  PR_CLOSED = 'pr_closed',
  BRANCH_CREATED = 'branch_created',
  BRANCH_UPDATED = 'branch_updated',
  IMPLEMENTATION_STARTED = 'implementation_started',
  IMPLEMENTATION_COMPLETED = 'implementation_completed',
  IMPLEMENTATION_FAILED = 'implementation_failed'
}

// Codegen API Integration Types
export interface CreatePlanRequest {
  template: 'CreatePlan';
  variables: {
    UserRequirementsForFeatureInCodebase: string;
  };
  organization_id: number;
}

export interface ImplementPlanRequest {
  template: 'ImplementPlan';
  variables: {
    PlanContent: string;
    ProjectRepository: string;
    RequirementText: string;
  };
  organization_id: number;
}

export interface PlanResponse {
  meta: {
    plan_id: string;
    feature_name: string;
    complexity_level: 'simple' | 'moderate' | 'complex' | 'enterprise';
    estimated_duration: string;
    risk_assessment: 'low' | 'medium' | 'high';
    dependencies_count: string;
  };
  requirements_analysis: {
    functional_requirements: string[];
    non_functional_requirements: string[];
    acceptance_criteria: string[];
    assumptions: string[];
    constraints: string[];
    success_metrics: string[];
  };
  architecture_blueprint: {
    affected_components: string[];
    new_components: string[];
    integration_points: string[];
    data_flow: string;
    performance_impact: string;
  };
  implementation_plan: PlanStep[];
  quality_assurance: {
    code_review_checklist: string[];
    testing_strategy: string;
    performance_validation: string;
    documentation_requirements: string[];
  };
  deployment_strategy: {
    deployment_phases: string[];
    rollback_plan: string;
    monitoring_setup: string;
    feature_flags: string;
    user_communication: string;
  };
  post_implementation: {
    success_validation: string;
    performance_monitoring: string;
    maintenance_plan: string;
    iteration_opportunities: string[];
    lessons_learned: string;
  };
}

export interface PlanStep {
  step: string;
  phase: 'setup' | 'analysis' | 'design' | 'implementation' | 'testing' | 'deployment';
  title: string;
  need: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_effort: string;
  confidence_level: string;
  task_description: string;
  technical_context: {
    files_to_modify: string[];
    new_files_to_create: string[];
    apis_to_integrate: string[];
    database_changes: string[];
    configuration_updates: string[];
  };
  implementation_details: {
    approach: string;
    code_patterns: string[];
    libraries_frameworks: string[];
    error_handling: string;
    logging_monitoring: string;
  };
  validation_criteria: {
    unit_tests: string[];
    integration_tests: string[];
    acceptance_tests: string[];
    performance_benchmarks: string[];
  };
  deliverables: string[];
  potential_blockers: string[];
  mitigation_strategies: string[];
}

// UI State Types
export interface ProjectDashboardState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  selectedProject: Project | null;
  showAddProjectDialog: boolean;
  showRequirementsDialog: boolean;
  showPlanEditor: boolean;
  selectedRequirement: Requirement | null;
}

export interface AddProjectDialogState {
  repositories: GitHubRepository[];
  loading: boolean;
  error: string | null;
  selectedRepository: GitHubRepository | null;
  searchQuery: string;
}

export interface RequirementsDialogState {
  text: string;
  loading: boolean;
  error: string | null;
}

export interface PlanEditorState {
  plan: Plan | null;
  content: string;
  loading: boolean;
  error: string | null;
  isEdited: boolean;
  implementing: boolean;
}

