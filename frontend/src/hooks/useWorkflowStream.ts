/**
 * Hook for polling workflow state (artifacts) from the backend.
 *
 * Polls /state every few seconds while the workflow is in_progress,
 * and does a final fetch when it completes, so that the OutputViewer
 * middle panel always has up-to-date artifacts.
 */

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { projectsApi } from '@/services/api';

export const useWorkflowStream = (projectId: string | null) => {
  const { setWorkflowState, setStreaming, projectStatus } = useStore();
  const intervalRef = useRef<number | null>(null);
  const lastFetchedPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setStreaming(false);
      return;
    }

    const fetchState = async () => {
      try {
        const state = await projectsApi.getState(projectId);
        if (state) {
          setWorkflowState(state);
          lastFetchedPhaseRef.current = state.current_phase;
        }
      } catch (err) {
        console.error('Error fetching workflow state:', err);
      }
    };

    const status = projectStatus?.status;
    const isActive = status === 'in_progress';
    const isTerminal = status === 'completed' || status === 'failed';

    if (isActive) {
      // Poll every 3 seconds while in-progress
      setStreaming(true);
      fetchState(); // Fetch immediately
      intervalRef.current = window.setInterval(fetchState, 3000);
    } else if (isTerminal) {
      // Final fetch when workflow finishes
      setStreaming(false);
      fetchState();
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectId, projectStatus?.status, setWorkflowState, setStreaming]);
};

