/**
 * Mock Agent Output Data
 * For development and testing purposes
 */

import type { AgentOutput, AgentExecutionLog } from '@/types';

export const mockAgentOutputs: Record<string, AgentOutput> = {
  orchestrator: {
    agent_name: 'orchestrator',
    input: {
      state: {
        project_id: 'test-123',
        user_requirements: 'Build a todo app',
      },
    },
    output: {
      summary: 'Workflow orchestration initiated',
      decisions: [
        {
          decision: 'Transitioning to requirement analysis',
          rationale: 'Initial requirements received, proceeding to analysis phase',
          confidence: 0.95,
        },
      ],
    },
    execution_time_ms: 250,
    status: 'completed',
    retry_count: 0,
    timestamp: new Date().toISOString(),
  },
  requirement_analysis: {
    agent_name: 'requirement_analysis',
    input: {
      requirements: 'Build a todo app',
    },
    output: {
      summary: 'Analyzed requirements and identified key features',
      decisions: [
        {
          decision: 'Identified core features: add, edit, delete, mark complete',
          rationale: 'Based on standard todo app patterns',
          confidence: 0.9,
        },
      ],
    },
    execution_time_ms: 1200,
    status: 'completed',
    retry_count: 0,
    timestamp: new Date().toISOString(),
  },
  architecture: {
    agent_name: 'architecture',
    input: {},
    output: {
      summary: 'Designed system architecture',
      decisions: [
        {
          decision: 'Selected React frontend with FastAPI backend',
          rationale: 'Modern stack with good developer experience',
          confidence: 0.85,
        },
      ],
    },
    execution_time_ms: 1800,
    status: 'completed',
    retry_count: 0,
    timestamp: new Date().toISOString(),
  },
  coding: {
    agent_name: 'coding',
    input: {},
    output: {
      summary: 'Generated 5 code files',
      artifacts: [
        {
          type: 'code',
          name: 'src/App.tsx',
          content: `import React from 'react';

function App() {
  return <div>Todo App</div>;
}

export default App;`,
          metadata: {
            language: 'typescript',
            agent: 'coding',
          },
        },
        {
          type: 'code',
          name: 'src/components/TodoList.tsx',
          content: `import React from 'react';

export const TodoList = () => {
  return <ul>Todo items</ul>;
};`,
          metadata: {
            language: 'typescript',
            agent: 'coding',
          },
        },
      ],
    },
    execution_time_ms: 3500,
    status: 'completed',
    retry_count: 0,
    timestamp: new Date().toISOString(),
  },
  debugging: {
    agent_name: 'debugging',
    input: {},
    output: {
      summary: 'Found and fixed 2 issues',
      decisions: [
        {
          decision: 'Fixed missing key prop in TodoList',
          rationale: 'React requires keys for list items',
          confidence: 0.95,
        },
      ],
    },
    execution_time_ms: 2100,
    status: 'running',
    retry_count: 0,
    timestamp: new Date().toISOString(),
  },
};

export const mockAgentLogs: Record<string, AgentExecutionLog[]> = {
  orchestrator: [
    {
      agent_name: 'orchestrator',
      level: 'info',
      message: 'Workflow orchestration started',
      timestamp: new Date().toISOString(),
    },
    {
      agent_name: 'orchestrator',
      level: 'info',
      message: 'Transitioning to requirement analysis phase',
      timestamp: new Date().toISOString(),
    },
  ],
  debugging: [
    {
      agent_name: 'debugging',
      level: 'info',
      message: 'Starting code analysis',
      timestamp: new Date().toISOString(),
    },
    {
      agent_name: 'debugging',
      level: 'warning',
      message: 'Found potential issue: missing key prop',
      timestamp: new Date().toISOString(),
      metadata: {
        file: 'src/components/TodoList.tsx',
        line: 3,
      },
    },
    {
      agent_name: 'debugging',
      level: 'info',
      message: 'Applying fix for missing key prop',
      timestamp: new Date().toISOString(),
    },
  ],
};

