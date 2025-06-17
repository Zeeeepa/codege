# GitHub Integration for Codegen Web

This document describes the GitHub integration implementation for the Codegen Web application.

## Overview

The GitHub integration provides a project management dashboard that allows users to:

1. **Connect GitHub Account** - OAuth authentication with GitHub
2. **Add Projects** - Select repositories from GitHub to manage
3. **Add Requirements** - Define features and functionality to implement
4. **Create Plans** - Generate AI-powered implementation plans using Codegen API
5. **Start Implementation** - Execute plans using Codegen agents
6. **Monitor Progress** - Track PR creation and implementation status

## Architecture

### Services
- **GitHubService** (`src/services/github.service.ts`) - Handles GitHub API interactions and OAuth
- **ProjectService** (`src/services/project.service.ts`) - Manages projects, requirements, and plans

### Components
- **ProjectDashboard** (`src/components/ProjectDashboard.tsx`) - Main dashboard interface
- **AddProjectDialog** (`src/components/AddProjectDialog.tsx`) - Repository selection dialog
- **RequirementsDialog** (`src/components/RequirementsDialog.tsx`) - Add requirements interface
- **PlanEditor** (`src/components/PlanEditor.tsx`) - Plan viewing and editing interface
- **GitHubCallback** (`src/components/GitHubCallback.tsx`) - OAuth callback handler

### Data Models
- **GitHub Types** (`src/types/github.ts`) - GitHub API response types
- **Project Types** (`src/types/project.ts`) - Project management data structures

## Features

### 1. GitHub Authentication
- OAuth 2.0 flow with GitHub
- Secure token storage with encryption
- User profile display
- Repository access permissions

### 2. Project Management
- Add projects from GitHub repositories
- Project cards with metadata
- Repository information display
- Project statistics

### 3. Requirements Management
- Add text-based requirements
- Example requirements for guidance
- Character count and validation
- Status tracking

### 4. AI Plan Generation
- Integration with Codegen "CreatePlan" template
- Comprehensive implementation plans
- Plan editing capabilities
- Original vs. edited plan tracking

### 5. Implementation Execution
- Integration with Codegen "ImplementPlan" template
- Real-time status monitoring
- PR creation tracking
- Implementation progress updates

### 6. Notifications
- PR creation notifications
- Implementation status updates
- Error handling and reporting
- Unread notification counts

## Configuration

### GitHub App Credentials
The integration uses the following GitHub App configuration:

```typescript
const GITHUB_CONFIG = {
  clientId: 'Ov23li1WIpEcbDjbqaRu',
  clientSecret: '96e3e06d7ffc4447b2b4e39d9302dfb4f06f1099',
  // Additional configuration...
};
```

### OAuth Callback URL
The OAuth callback URL is configured as:
```
http://localhost:3000/auth/callback
```

## Storage

The implementation uses **local storage** for data persistence:

- **Projects** - Project metadata and configuration
- **Requirements** - User-defined feature requirements
- **Plans** - AI-generated and user-edited implementation plans
- **Notifications** - System notifications and alerts
- **GitHub Tokens** - Encrypted OAuth tokens

## API Integration

### Codegen API Templates

#### CreatePlan Template
```typescript
{
  template: 'CreatePlan',
  variables: {
    UserRequirementsForFeatureInCodebase: string
  },
  organization_id: number
}
```

#### ImplementPlan Template
```typescript
{
  template: 'ImplementPlan',
  variables: {
    PlanContent: string,
    ProjectRepository: string,
    RequirementText: string
  },
  organization_id: number
}
```

## Development Mode

For local development, the integration includes:

- **Webhook Simulation** - Simulated GitHub webhook events
- **Development Polling** - Periodic status checks instead of real webhooks
- **Local Storage** - No database dependency
- **Error Handling** - Comprehensive error states and recovery

## Usage Flow

1. **Connect GitHub** - User authenticates with GitHub OAuth
2. **Add Project** - Select a repository from GitHub
3. **Add Requirements** - Define what features to implement
4. **Create Plan** - AI generates comprehensive implementation plan
5. **Edit Plan** (Optional) - User can modify the generated plan
6. **Start Implementation** - AI agent executes the plan
7. **Monitor Progress** - Track PR creation and status
8. **Review Results** - View created pull requests

## Styling

The integration includes comprehensive CSS styling in:
- `src/styles/github-integration.css` - All component styles
- Responsive design for mobile and desktop
- Consistent theme with existing application
- Interactive elements and animations

## Security

- **Token Encryption** - OAuth tokens encrypted with AES-256-GCM
- **CSRF Protection** - OAuth state parameter validation
- **Secure Storage** - Encrypted local storage for sensitive data
- **Input Validation** - Comprehensive input sanitization

## Error Handling

- **Network Errors** - Retry mechanisms and user feedback
- **Authentication Errors** - Clear error messages and re-auth flows
- **API Errors** - Graceful degradation and error reporting
- **Validation Errors** - Real-time form validation

## Future Enhancements

Potential improvements for the integration:

1. **Real Webhooks** - Replace polling with actual GitHub webhooks
2. **Database Storage** - Optional database backend for persistence
3. **Team Collaboration** - Multi-user project management
4. **Advanced Filtering** - Search and filter projects/requirements
5. **Analytics** - Implementation success metrics and reporting
6. **Templates** - Pre-defined requirement templates
7. **Integrations** - Additional version control systems

## Testing

The implementation includes:
- **Error State Testing** - Comprehensive error scenarios
- **OAuth Flow Testing** - Authentication flow validation
- **API Integration Testing** - Codegen API interaction testing
- **UI Component Testing** - Component behavior validation

## Deployment

For production deployment:

1. **Update GitHub App** - Configure production OAuth URLs
2. **Environment Variables** - Set production API endpoints
3. **HTTPS Required** - GitHub OAuth requires HTTPS in production
4. **Webhook Configuration** - Set up actual GitHub webhooks
5. **Database Migration** - Optional migration from local storage

This integration provides a solid foundation for AI-powered project management with GitHub integration, focusing on simplicity and user experience while maintaining extensibility for future enhancements.

