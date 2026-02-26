/**
 * API Service Layer
 * Handles all backend API communication
 */

import axios from 'axios';
import type {
  Project,
  ProjectCreate,
  ProjectStatus,
  WorkflowState,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log 5xx errors so the real backend message is visible
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status >= 500) {
      const data = err.response?.data;
      const detail = typeof data?.detail === 'string' ? data.detail : JSON.stringify(data);
      console.error(`API ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${err.response?.status}:`, detail || err.message);
    }
    return Promise.reject(err);
  }
);

/**
 * Projects API
 */
export const projectsApi = {
  /**
   * Create a new project
   */
  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post<Project>('/projects', data);
    return response.data;
  },

  /**
   * Get project by ID
   */
  get: async (projectId: string): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Get project status
   */
  getStatus: async (projectId: string): Promise<ProjectStatus> => {
    const response = await api.get<ProjectStatus>(`/projects/${projectId}/status`);
    return response.data;
  },

  /**
   * Execute workflow for a project
   */
  execute: async (projectId: string): Promise<{
    project_id: string;
    status: string;
    phase: string;
    message: string;
  }> => {
    const response = await api.post(`/projects/${projectId}/execute`);
    return response.data;
  },

  /**
   * Apply modification request to existing project code (edit in place).
   */
  modify: async (projectId: string, message: string): Promise<{
    project_id: string;
    status: string;
    message: string;
  }> => {
    const response = await api.post(`/projects/${projectId}/modify`, { message });
    return response.data;
  },

  /**
   * Stream workflow execution (Server-Sent Events) - legacy
   */
  stream: (projectId: string): EventSource => {
    const url = `${API_BASE_URL}/projects/${projectId}/stream`;
    return new EventSource(url);
  },

  /**
   * Subscribe to real-time workflow events (SSE).
   * Returns an EventSource that emits agent_start, agent_complete,
   * step_complete, workflow_complete, and workflow_error events.
   */
  events: (projectId: string): EventSource => {
    const url = `${API_BASE_URL}/projects/${projectId}/events`;
    return new EventSource(url);
  },

  /**
   * Start full application preview (serves generated app as runnable).
   */
  startPreview: async (projectId: string): Promise<{ url: string; status: string; mode: string }> => {
    const response = await api.post(`/projects/${projectId}/preview/start`);
    return response.data;
  },

  /**
   * Stop full application preview.
   */
  stopPreview: async (projectId: string): Promise<{ stopped: boolean }> => {
    const response = await api.post(`/projects/${projectId}/preview/stop`);
    return response.data;
  },

  /**
   * Get preview status.
   */
  getPreviewStatus: async (projectId: string): Promise<{ status: string; url?: string }> => {
    const response = await api.get(`/projects/${projectId}/preview`);
    return response.data;
  },

  /**
   * Get full project workflow state including all artifacts.
   */
  getState: async (projectId: string): Promise<WorkflowState> => {
    const response = await api.get<WorkflowState>(`/projects/${projectId}/state`);
    return response.data;
  },
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`);
  return response.data;
};

export default api;

