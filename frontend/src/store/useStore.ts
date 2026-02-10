/**
 * Global State Management using Zustand
 */

import { create } from 'zustand';
import type {
  Project,
  ProjectStatus,
  AgentStatus,
  Message,
  WorkflowState,
} from '@/types';

interface AppState {
  // Current project
  currentProject: Project | null;
  projectStatus: ProjectStatus | null;
  workflowState: WorkflowState | null;

  // Chat messages
  messages: Message[];
  
  // Agent statuses
  agents: Map<string, AgentStatus>;

  // UI state
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjectStatus: (status: ProjectStatus) => void;
  setWorkflowState: (state: WorkflowState) => void;
  addMessage: (message: Message) => void;
  updateAgentStatus: (name: string, status: Partial<AgentStatus>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  reset: () => void;
}

const initialAgentStatuses = (): Map<string, AgentStatus> => {
  const agents = new Map<string, AgentStatus>();
  const agentNames = [
    'orchestrator',
    'requirement_analysis',
    'architecture',
    'coding',
    'debugging',
    'testing',
    'documentation',
    'deployment',
  ];

  agentNames.forEach((name) => {
    agents.set(name, {
      name,
      displayName: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      status: 'pending',
      progress: 0,
      logs: [],
    });
  });

  return agents;
};

export const useStore = create<AppState>((set) => ({
  currentProject: null,
  projectStatus: null,
  workflowState: null,
  messages: [],
  agents: initialAgentStatuses(),
  isLoading: false,
  error: null,
  isStreaming: false,

  setCurrentProject: (project) => set({ currentProject: project }),
  
  setProjectStatus: (status) => 
    set((state) => {
      // Only update if status actually changed
      if (state.projectStatus?.project_id === status.project_id &&
          state.projectStatus?.current_phase === status.current_phase &&
          state.projectStatus?.status === status.status &&
          state.projectStatus?.progress === status.progress) {
        return state; // No change, return current state
      }
      return { projectStatus: status };
    }),
  
  setWorkflowState: (state) => set({ workflowState: state }),
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  
  updateAgentStatus: (name, updates) =>
    set((state) => {
      const newAgents = new Map(state.agents);
      const current = newAgents.get(name) || {
        name,
        displayName: name,
        status: 'pending' as const,
        progress: 0,
        logs: [],
      };
      newAgents.set(name, { ...current, ...updates });
      return { agents: newAgents };
    }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  
  reset: () =>
    set({
      currentProject: null,
      projectStatus: null,
      workflowState: null,
      messages: [],
      agents: initialAgentStatuses(),
      isLoading: false,
      error: null,
      isStreaming: false,
    }),
}));

