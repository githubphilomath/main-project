/**
 * Type definitions for the Multi-Agent Platform Frontend
 */

export interface Project {
  id: string;
  name: string;
  description: string;
  requirements: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  current_phase: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectStatus {
  project_id: string;
  status: string;
  current_phase: string;
  current_agent: string | null;
  progress: number;
  artifacts_count: {
    code: number;
    tests: number;
    documentation: number;
  };
  errors: Array<{
    agent?: string;
    error?: string;
    phase?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description: string;
  requirements: string;
}

export interface AgentStatus {
  name: string;
  displayName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  logs: string[];
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  projectId?: string;
}

export interface CodeArtifact {
  file_path: string;
  content: string;
  language: string;
  agent: string;
  timestamp: string;
}

export interface TestArtifact {
  file_path: string;
  content: string;
  test_type: string;
  coverage?: number;
  agent: string;
  timestamp: string;
}

export interface DocumentationArtifact {
  doc_type: string;
  content: string;
  agent: string;
  timestamp: string;
}

export interface WorkflowState {
  project_id?: string;
  current_phase: string;
  current_agent: string | null;
  phase_history: string[];
  code_artifacts: CodeArtifact[];
  test_artifacts: TestArtifact[];
  documentation_artifacts: DocumentationArtifact[];
  agent_decisions: Array<{
    agent_name: string;
    decision: string;
    rationale: string;
    confidence: number;
    timestamp: string;
  }>;
  errors: Array<{
    agent?: string;
    error?: string;
    phase?: string;
  }>;
}

export const AGENT_NAMES = [
  'orchestrator',
  'requirement_analysis',
  'architecture',
  'coding',
  'debugging',
  'testing',
  'documentation',
  'deployment',
] as const;

export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  orchestrator: 'Orchestrator',
  requirement_analysis: 'Requirement Analysis',
  architecture: 'Architecture Design',
  coding: 'Code Generation',
  debugging: 'Debugging',
  testing: 'Testing',
  documentation: 'Documentation',
  deployment: 'Deployment',
};

export const PHASE_PROGRESS: Record<string, number> = {
  initialization: 0,
  requirement_analysis: 12.5,
  architecture_design: 25,
  coding: 37.5,
  debugging: 50,
  testing: 62.5,
  documentation: 75,
  deployment: 87.5,
  completed: 100,
  failed: 0,
};

/**
 * Agent Execution Output Types
 */
export interface AgentOutput {
  agent_name: string;
  input: {
    state?: any;
    requirements?: string;
    context?: any;
  };
  output: {
    summary: string;
    artifacts?: Array<{
      type: string;
      name: string;
      content?: string;
      metadata?: Record<string, any>;
    }>;
    decisions?: Array<{
      decision: string;
      rationale: string;
      confidence: number;
    }>;
  };
  execution_time_ms: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  retry_count: number;
  timestamp: string;
}

export interface AgentExecutionLog {
  agent_name: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentExecutionState {
  [agentName: string]: {
    output: AgentOutput | null;
    logs: AgentExecutionLog[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    executionTime: number | null;
    retryCount: number;
  };
}

