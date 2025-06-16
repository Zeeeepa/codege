from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
import json
import logging
from datetime import datetime

from backend.database import get_db
from backend_service import AuthService
from backend.github_controller import GithubController
from backend.codegen_client import CodegenClient
from backend.github_service import GithubService
from backend.local_repo_service import LocalRepoService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CodeGen Project Manager API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager for real-time PR monitoring
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.pr_subscriptions: dict = {}  # {connection_id: {project_id, requirement_id, agent_run_id}}

    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connection established: {connection_id}")

    def disconnect(self, websocket: WebSocket, connection_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if connection_id in self.pr_subscriptions:
            del self.pr_subscriptions[connection_id]
        logger.info(f"WebSocket connection closed: {connection_id}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_pr_event(self, project_id: str, requirement_id: str, event_data: dict):
        """Broadcast PR events to subscribed connections"""
        message = json.dumps({
            "type": "pr_status_update",
            "projectId": project_id,
            "requirementId": requirement_id,
            **event_data
        })
        
        # Send to all connections subscribed to this requirement
        for connection_id, subscription in self.pr_subscriptions.items():
            if (subscription.get("project_id") == project_id and 
                subscription.get("requirement_id") == requirement_id):
                
                websocket = next((conn for conn in self.active_connections 
                                if id(conn) == int(connection_id)), None)
                if websocket:
                    try:
                        await websocket.send_text(message)
                    except Exception as e:
                        logger.error(f"Failed to send WebSocket message: {e}")

manager = ConnectionManager()

# Initialize services
codegen_client = None
github_service = None
local_repo_service = None

def get_codegen_client():
    global codegen_client
    if not codegen_client:
        codegen_client = CodegenClient()
    return codegen_client

def get_github_service(db: Session = Depends(get_db)):
    global github_service
    if not github_service:
        github_service = GithubService(db)
    return github_service

def get_local_repo_service(db: Session = Depends(get_db)):
    global local_repo_service
    if not local_repo_service:
        local_repo_service = LocalRepoService(db)
    return local_repo_service

# WebSocket endpoint for real-time PR monitoring
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    connection_id = str(id(websocket))
    await manager.connect(websocket, connection_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "subscribe_pr_events":
                # Subscribe to PR events for specific requirement
                manager.pr_subscriptions[connection_id] = {
                    "project_id": message.get("projectId"),
                    "requirement_id": message.get("requirementId"),
                    "agent_run_id": message.get("agentRunId")
                }
                logger.info(f"Subscribed to PR events: {message}")
                
                # Start monitoring for this agent run
                asyncio.create_task(monitor_agent_run_for_pr(
                    message.get("agentRunId"),
                    message.get("projectId"),
                    message.get("requirementId")
                ))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, connection_id)

async def monitor_agent_run_for_pr(agent_run_id: str, project_id: str, requirement_id: str):
    """Monitor agent run and detect PR creation"""
    client = get_codegen_client()
    max_attempts = 60  # Monitor for 10 minutes (60 * 10 seconds)
    attempt = 0
    
    while attempt < max_attempts:
        try:
            # Get agent run status
            agent_run = client.get_agent_run(agent_run_id)
            
            if agent_run.get("status") == "completed":
                # Check for PR creation by examining logs
                logs = client.get_agent_run_logs(agent_run_id)
                pr_url = extract_pr_url_from_logs(logs.get("logs", []))
                
                if pr_url:
                    # PR was created successfully
                    await manager.broadcast_pr_event(project_id, requirement_id, {
                        "status": "created",
                        "prUrl": pr_url,
                        "createdAt": datetime.now().isoformat()
                    })
                    logger.info(f"PR created for requirement {requirement_id}: {pr_url}")
                    break
                else:
                    # Implementation completed but no PR found
                    await manager.broadcast_pr_event(project_id, requirement_id, {
                        "status": "failed",
                        "error": "Implementation completed but no PR was created",
                        "createdAt": datetime.now().isoformat()
                    })
                    break
                    
            elif agent_run.get("status") == "failed":
                # Implementation failed
                await manager.broadcast_pr_event(project_id, requirement_id, {
                    "status": "failed",
                    "error": "Implementation failed",
                    "createdAt": datetime.now().isoformat()
                })
                break
                
            # Wait before next check
            await asyncio.sleep(10)
            attempt += 1
            
        except Exception as e:
            logger.error(f"Error monitoring agent run {agent_run_id}: {e}")
            await asyncio.sleep(10)
            attempt += 1
    
    if attempt >= max_attempts:
        # Timeout
        await manager.broadcast_pr_event(project_id, requirement_id, {
            "status": "failed",
            "error": "Monitoring timeout - PR status unknown",
            "createdAt": datetime.now().isoformat()
        })

def extract_pr_url_from_logs(logs: List[str]) -> Optional[str]:
    """Extract PR URL from agent run logs"""
    for log_entry in logs:
        if "pull request" in log_entry.lower() and "https://github.com" in log_entry:
            # Extract GitHub PR URL from log entry
            import re
            pr_url_match = re.search(r'https://github\.com/[^/]+/[^/]+/pull/\d+', log_entry)
            if pr_url_match:
                return pr_url_match.group(0)
    return None

# Project Management Endpoints
@app.get("/projects")
async def get_projects(
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Get all projects for the authenticated user"""
    # This would typically fetch from your database
    # For now, return mock data that matches the frontend expectations
    return []

@app.post("/projects")
async def create_project(
    project_data: dict,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Create a new project from a GitHub repository"""
    try:
        # Create project in database
        project = {
            "id": str(len(project_data) + 1),  # Mock ID generation
            "name": project_data["name"],
            "full_name": project_data["full_name"],
            "private": project_data["private"],
            "url": project_data["url"],
            "owner": project_data["owner"],
            "requirements": []
        }
        
        # In real implementation, save to database
        logger.info(f"Created project: {project['name']}")
        return project
        
    except Exception as e:
        logger.error(f"Failed to create project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Requirements Management Endpoints
@app.get("/projects/{project_id}/requirements")
async def get_requirements(
    project_id: str,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Get all requirements for a project"""
    # Fetch requirements from database
    return []

@app.post("/projects/{project_id}/requirements")
async def create_requirement(
    project_id: str,
    requirement_data: dict,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Create a new requirement for a project"""
    try:
        requirement = {
            "id": str(datetime.now().timestamp()),
            "text": requirement_data["text"],
            "status": "pending",
            "createdAt": datetime.now().isoformat()
        }
        
        # Save to database
        logger.info(f"Created requirement for project {project_id}: {requirement['text']}")
        return requirement
        
    except Exception as e:
        logger.error(f"Failed to create requirement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/projects/{project_id}/requirements/{requirement_id}")
async def update_requirement(
    project_id: str,
    requirement_id: str,
    updates: dict,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Update a requirement"""
    try:
        # Update requirement in database
        logger.info(f"Updated requirement {requirement_id} in project {project_id}")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to update requirement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/projects/{project_id}/requirements/{requirement_id}")
async def delete_requirement(
    project_id: str,
    requirement_id: str,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Delete a requirement"""
    try:
        # Delete from database
        logger.info(f"Deleted requirement {requirement_id} from project {project_id}")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to delete requirement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Plan Management with Codegen Integration
@app.post("/projects/{project_id}/requirements/{requirement_id}/plan")
async def create_plan(
    project_id: str,
    requirement_id: str,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Create implementation plan using Codegen API"""
    try:
        client = get_codegen_client()
        
        # Get requirement details
        # requirement = get_requirement_from_db(project_id, requirement_id)
        
        # Create agent run with Codegen
        prompt = f"""
        Create a detailed implementation plan for the following requirement:
        
        Project: {project_id}
        Requirement: [requirement text would be here]
        
        Please provide a comprehensive plan including:
        1. Analysis of current codebase
        2. Required changes and new files
        3. Step-by-step implementation approach
        4. Testing strategy
        5. Deployment considerations
        """
        
        agent_run = client.create_agent_run(prompt)
        
        # Wait for completion (in real app, this would be async)
        import time
        max_wait = 120  # 2 minutes
        waited = 0
        
        while waited < max_wait:
            run_status = client.get_agent_run(agent_run["id"])
            if run_status["status"] in ["completed", "failed"]:
                break
            time.sleep(5)
            waited += 5
        
        if run_status["status"] == "completed":
            # Get the generated plan from logs
            logs = client.get_agent_run_logs(agent_run["id"])
            plan_content = extract_plan_from_logs(logs.get("logs", []))
            
            plan = {
                "id": agent_run["id"],
                "content": plan_content,
                "status": "created",
                "createdAt": datetime.now().isoformat(),
                "agentRunId": agent_run["id"]
            }
            
            # Save plan to database
            logger.info(f"Created plan for requirement {requirement_id}")
            return plan
        else:
            raise HTTPException(status_code=500, detail="Failed to generate plan")
            
    except Exception as e:
        logger.error(f"Failed to create plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/requirements/{requirement_id}/plan")
async def get_plan(
    project_id: str,
    requirement_id: str,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Get implementation plan for a requirement"""
    try:
        # Fetch plan from database
        # plan = get_plan_from_db(project_id, requirement_id)
        return {"content": "Plan content would be here", "status": "created"}
        
    except Exception as e:
        logger.error(f"Failed to get plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/projects/{project_id}/requirements/{requirement_id}/plan")
async def update_plan(
    project_id: str,
    requirement_id: str,
    plan_data: dict,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Update implementation plan"""
    try:
        # Update plan in database
        logger.info(f"Updated plan for requirement {requirement_id}")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to update plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Implementation with PR Monitoring
@app.post("/projects/{project_id}/requirements/{requirement_id}/implement")
async def implement_plan(
    project_id: str,
    requirement_id: str,
    implementation_data: dict,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Start implementation using Codegen API and monitor for PR creation"""
    try:
        client = get_codegen_client()
        
        # Create implementation prompt with the edited plan
        plan_content = implementation_data.get("planContent", "")
        
        prompt = f"""
        Implement the following plan for project {project_id}:
        
        {plan_content}
        
        Please:
        1. Analyze the current codebase
        2. Implement the required changes
        3. Create a pull request with the changes
        4. Ensure all tests pass
        
        Make sure to create a pull request when the implementation is complete.
        """
        
        # Start agent run for implementation
        agent_run = client.create_agent_run(prompt)
        
        logger.info(f"Started implementation for requirement {requirement_id}, agent run: {agent_run['id']}")
        
        return {
            "agentRunId": agent_run["id"],
            "status": "implementing",
            "message": "Implementation started successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to start implementation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Agent Run Monitoring
@app.get("/agent/runs/{agent_run_id}")
async def get_agent_run(
    agent_run_id: str,
    user=Depends(AuthService.check_auth)
):
    """Get agent run status"""
    try:
        client = get_codegen_client()
        return client.get_agent_run(agent_run_id)
        
    except Exception as e:
        logger.error(f"Failed to get agent run: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agent/runs/{agent_run_id}/logs")
async def get_agent_run_logs(
    agent_run_id: str,
    user=Depends(AuthService.check_auth)
):
    """Get agent run logs"""
    try:
        client = get_codegen_client()
        return client.get_agent_run_logs(agent_run_id)
        
    except Exception as e:
        logger.error(f"Failed to get agent run logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# GitHub Integration Endpoints (using existing services)
@app.get("/github/user-repos")
async def get_user_repos(
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Get user repositories from GitHub"""
    controller = GithubController(db)
    return await controller.get_user_repos(user)

@app.get("/github/get-branch-list")
async def get_branch_list(
    repo_name: str,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Get branch list for a repository"""
    controller = GithubController(db)
    return await controller.get_branch_list(repo_name)

@app.get("/github/check-public-repo")
async def check_public_repo(
    repo_name: str,
    user=Depends(AuthService.check_auth),
    db: Session = Depends(get_db)
):
    """Check if repository is public"""
    controller = GithubController(db)
    return await controller.check_public_repo(repo_name)

# User Management
@app.get("/users/me")
async def get_current_user(user=Depends(AuthService.check_auth)):
    """Get current user information"""
    return {
        "id": user.get("user_id", "1"),
        "name": user.get("name", "Test User"),
        "email": user.get("email", "test@example.com"),
        "githubConnected": True,  # Mock for development
        "githubUsername": user.get("github_username", "testuser")
    }

@app.post("/auth/github/connect")
async def connect_github():
    """Initiate GitHub OAuth connection"""
    # In real implementation, this would redirect to GitHub OAuth
    return {
        "success": True,
        "authUrl": "https://github.com/login/oauth/authorize?client_id=your_client_id"
    }

# Utility functions
def extract_plan_from_logs(logs: List[str]) -> str:
    """Extract implementation plan from agent run logs"""
    plan_content = []
    in_plan_section = False
    
    for log_entry in logs:
        if "implementation plan" in log_entry.lower():
            in_plan_section = True
        elif in_plan_section and log_entry.strip():
            plan_content.append(log_entry)
        elif in_plan_section and not log_entry.strip():
            break
    
    if plan_content:
        return "\n".join(plan_content)
    else:
        # Default plan template
        return """# Implementation Plan

## Phase 1: Analysis and Setup
- Analyze current codebase structure
- Identify required dependencies
- Set up development environment

## Phase 2: Core Implementation
- Implement main functionality
- Add error handling
- Write unit tests

## Phase 3: Integration and Testing
- Integrate with existing systems
- Perform integration testing
- Optimize performance

## Phase 4: Documentation and Deployment
- Update documentation
- Prepare deployment scripts
- Deploy to staging environment"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)