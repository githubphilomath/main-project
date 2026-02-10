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
   * Stream workflow execution (Server-Sent Events)
   */
  stream: (projectId: string): EventSource => {
    const url = `${API_BASE_URL}/projects/${projectId}/stream`;
    return new EventSource(url);
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

