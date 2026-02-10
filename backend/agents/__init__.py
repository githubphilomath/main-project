"""Agent modules for the Multi-Agent Platform."""

from agents.base import BaseAgent
from agents.orchestrator import OrchestratorAgent
from agents.requirement_analysis import RequirementAnalysisAgent
from agents.architecture import ArchitectureAgent
from agents.coding import CodingAgent
from agents.debugging import DebuggingAgent
from agents.testing import TestingAgent
from agents.documentation import DocumentationAgent
from agents.deployment import DeploymentAgent

__all__ = [
    "BaseAgent",
    "OrchestratorAgent",
    "RequirementAnalysisAgent",
    "ArchitectureAgent",
    "CodingAgent",
    "DebuggingAgent",
    "TestingAgent",
    "DocumentationAgent",
    "DeploymentAgent",
]

