"""SQLAlchemy database models."""

from datetime import datetime
from typing import Any, Dict

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Project(Base):
    """Project database model."""

    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    status = Column(String, default="pending")
    current_phase = Column(String, default="initialization")
    state_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AgentRun(Base):
    """Agent execution run database model."""

    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False, index=True)
    agent_name = Column(String, nullable=False)
    status = Column(String, default="pending")
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    error = Column(Text, nullable=True)
    execution_time = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())


class AgentDecision(Base):
    """Agent decision database model."""

    __tablename__ = "agent_decisions"

    id = Column(String, primary_key=True)
    project_id = Column(String, nullable=False, index=True)
    agent_name = Column(String, nullable=False)
    decision = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=func.now())

