"""Tests for agent modules."""

import pytest
from core.state import ProjectPhase


def test_project_phase_enum():
    """Test ProjectPhase enum."""
    assert ProjectPhase.INITIALIZATION.value == "initialization"
    assert ProjectPhase.COMPLETED.value == "completed"


def test_agent_state_structure():
    """Test agent state structure."""
    from core.state import AgentState

    state: AgentState = {
        "project_id": "test-123",
        "project_name": "Test Project",
        "project_description": "Test Description",
        "user_requirements": "Test Requirements",
        "current_phase": "initialization",
        "current_agent": "orchestrator",
        "next_agent": None,
        "phase_history": [],
        "requirements_analysis": None,
        "architecture_design": None,
        "code_artifacts": [],
        "test_artifacts": [],
        "documentation_artifacts": [],
        "deployment_config": None,
        "agent_decisions": [],
        "rag_context": {},
        "errors": [],
        "retry_count": 0,
        "max_retries": 3,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00",
        "completed": False,
    }

    assert state["project_id"] == "test-123"
    assert state["current_phase"] == "initialization"

