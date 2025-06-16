#!/usr/bin/env python3
"""
Codegen API Client Library

A Python client library for interacting with the Codegen API.
"""

import os
import requests
import json
from typing import Dict, List, Optional, Union, Any


class CodegenClient:
    """
    Client for interacting with the Codegen API.
    """

    def __init__(self, org_id: str = None, token: str = None, base_url: str = "https://api.codegen.com/v1"):
        """
        Initialize the Codegen API client.

        Args:
            org_id (str, optional): The organization ID. Defaults to CODEGEN_ORG_ID environment variable.
            token (str, optional): The API token. Defaults to CODEGEN_TOKEN environment variable.
            base_url (str, optional): The base URL for the API. Defaults to "https://api.codegen.com/v1".
        """
        self.org_id = org_id or os.environ.get("CODEGEN_ORG_ID")
        self.token = token or os.environ.get("CODEGEN_TOKEN")
        self.base_url = base_url

        if not self.org_id:
            raise ValueError("Organization ID is required. Set CODEGEN_ORG_ID environment variable or pass org_id parameter.")
        
        if not self.token:
            raise ValueError("API token is required. Set CODEGEN_TOKEN environment variable or pass token parameter.")

        self.headers = {
            "authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """
        Make a request to the Codegen API.

        Args:
            method (str): The HTTP method (get, post, etc.).
            endpoint (str): The API endpoint.
            data (Dict, optional): The request data. Defaults to None.
            params (Dict, optional): The query parameters. Defaults to None.

        Returns:
            Dict: The API response.

        Raises:
            requests.exceptions.RequestException: If the request fails.
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.lower() == "get":
                response = requests.get(url, headers=self.headers, params=params)
            elif method.lower() == "post":
                response = requests.post(url, headers=self.headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check if the request was successful
            response.raise_for_status()
            
            # Return the JSON response
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error making request: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response status code: {e.response.status_code}")
                print(f"Response text: {e.response.text}")
            raise

    # User endpoints
    def get_current_user(self) -> Dict:
        """
        Get information about the currently authenticated user.

        Returns:
            Dict: The user information.
        """
        return self._make_request("get", "/users/me")

    def get_organizations(self, limit: int = 100, skip: int = 0) -> Dict:
        """
        Get a list of organizations the authenticated user belongs to.

        Args:
            limit (int, optional): Maximum number of organizations to return. Defaults to 100.
            skip (int, optional): Number of organizations to skip. Defaults to 0.

        Returns:
            Dict: The organizations information.
        """
        params = {
            "limit": limit,
            "skip": skip
        }
        return self._make_request("get", "/organizations", params=params)

    def get_users(self, limit: int = 100, skip: int = 0) -> Dict:
        """
        Get a paginated list of users for the organization.

        Args:
            limit (int, optional): Maximum number of users to return. Defaults to 100.
            skip (int, optional): Number of users to skip. Defaults to 0.

        Returns:
            Dict: The users information.
        """
        params = {
            "limit": limit,
            "skip": skip
        }
        return self._make_request("get", f"/organizations/{self.org_id}/users", params=params)

    def get_user(self, user_id: str) -> Dict:
        """
        Get information about a specific user.

        Args:
            user_id (str): The user ID.

        Returns:
            Dict: The user information.
        """
        return self._make_request("get", f"/organizations/{self.org_id}/users/{user_id}")

    # Agent endpoints
    def create_agent_run(self, prompt: str, images: List[str] = None) -> Dict:
        """
        Create a new agent run.

        Args:
            prompt (str): The prompt for the agent.
            images (List[str], optional): List of base64-encoded images. Defaults to None.

        Returns:
            Dict: The agent run information.
        """
        data = {
            "prompt": prompt,
            "images": images or []
        }
        return self._make_request("post", f"/organizations/{self.org_id}/agent/run", data=data)

    def get_agent_run(self, agent_run_id: str) -> Dict:
        """
        Get information about a specific agent run.

        Args:
            agent_run_id (str): The agent run ID.

        Returns:
            Dict: The agent run information.
        """
        return self._make_request("get", f"/organizations/{self.org_id}/agent/run/{agent_run_id}")

    def list_agent_runs(self, page: int = 1, size: int = 10) -> Dict:
        """
        Get a paginated list of agent runs.

        Args:
            page (int, optional): The page number. Defaults to 1.
            size (int, optional): The page size. Defaults to 10.

        Returns:
            Dict: The agent runs information.
        """
        params = {
            "page": page,
            "size": size
        }
        return self._make_request("get", f"/organizations/{self.org_id}/agent/runs", params=params)

    def get_agent_run_logs(self, agent_run_id: str, page: int = 1, size: int = 10) -> Dict:
        """
        Get logs for a specific agent run.

        Args:
            agent_run_id (str): The agent run ID.
            page (int, optional): The page number. Defaults to 1.
            size (int, optional): The page size. Defaults to 10.

        Returns:
            Dict: The agent run logs.
        """
        params = {
            "page": page,
            "size": size
        }
        return self._make_request("get", f"/organizations/{self.org_id}/agent/run/{agent_run_id}/logs", params=params)


# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Codegen API Client")
    parser.add_argument("--org-id", help="Organization ID")
    parser.add_argument("--token", help="API token")
    parser.add_argument("--action", choices=["user", "orgs", "users", "create-run", "get-run", "list-runs", "get-logs"], 
                        required=True, help="Action to perform")
    parser.add_argument("--prompt", help="Prompt for agent run")
    parser.add_argument("--run-id", help="Agent run ID")
    parser.add_argument("--user-id", help="User ID")
    parser.add_argument("--page", type=int, default=1, help="Page number")
    parser.add_argument("--size", type=int, default=10, help="Page size")
    
    args = parser.parse_args()
    
    try:
        client = CodegenClient(org_id=args.org_id, token=args.token)
        
        if args.action == "user":
            result = client.get_current_user()
            print(json.dumps(result, indent=2))
        elif args.action == "orgs":
            result = client.get_organizations()
            print(json.dumps(result, indent=2))
        elif args.action == "users":
            result = client.get_users()
            print(json.dumps(result, indent=2))
        elif args.action == "create-run":
            if not args.prompt:
                print("Error: --prompt is required for create-run action")
                exit(1)
            result = client.create_agent_run(args.prompt)
            print(json.dumps(result, indent=2))
        elif args.action == "get-run":
            if not args.run_id:
                print("Error: --run-id is required for get-run action")
                exit(1)
            result = client.get_agent_run(args.run_id)
            print(json.dumps(result, indent=2))
        elif args.action == "list-runs":
            result = client.list_agent_runs(page=args.page, size=args.size)
            print(json.dumps(result, indent=2))
        elif args.action == "get-logs":
            if not args.run_id:
                print("Error: --run-id is required for get-logs action")
                exit(1)
            result = client.get_agent_run_logs(args.run_id, page=args.page, size=args.size)
            print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")

