"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""

    name: str = Field(..., description="Project name")
    description: str = Field(..., description="Project description")
    requirements: str = Field(..., description="User requirements for the project")


class ProjectModify(BaseModel):
    """Schema for modification request (edit existing code in place)."""

    message: str = Field(..., description="User modification request, e.g. 'Add dark mode'")


class ProjectResponse(BaseModel):
    """Schema for project response."""

    id: str
    name: str
    description: str
    requirements: str
    status: str
    current_phase: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectStatus(BaseModel):
    """Schema for project status response."""

    project_id: str
    status: str
    current_phase: str
    current_agent: Optional[str]
    progress: float = Field(..., ge=0.0, le=100.0)
    artifacts_count: Dict[str, int]
    errors: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class AgentRunResponse(BaseModel):
    """Schema for agent run response."""

    id: str
    project_id: str
    agent_name: str
    status: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    error: Optional[str]
    execution_time: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True

