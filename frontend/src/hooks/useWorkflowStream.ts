/**
 * Hook for streaming workflow updates via SSE
 */

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { projectsApi } from '@/services/api';

export const useWorkflowStream = (projectId: string | null) => {
  const { setWorkflowState, setStreaming, updateAgentStatus, projectStatus } = useStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const shouldStream = !!projectId && projectStatus?.status === 'in_progress';

    if (!shouldStream) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      setStreaming(false);
      return;
    }

    setStreaming(true);
    const eventSource = projectsApi.stream(projectId);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update workflow state
        if (data) {
          const stateUpdate = Object.values(data)[0] as any;
          if (stateUpdate) {
            setWorkflowState(stateUpdate);
            
            // Update agent status
            if (stateUpdate.current_agent) {
              updateAgentStatus(stateUpdate.current_agent, {
                status: 'running',
                progress: stateUpdate.progress || 0,
                logs: stateUpdate.agent_decisions?.map((d: any) => d.decision) || [],
              });
            }
          }
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      // Close current stream and retry if workflow still running
      setStreaming(false);
      eventSource.close();
      eventSourceRef.current = null;

      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = window.setTimeout(() => {
        if (projectStatus?.status === 'in_progress' && projectId) {
          const retrySource = projectsApi.stream(projectId);
          eventSourceRef.current = retrySource;
        }
      }, 2000);
    };

    return () => {
      eventSource.close();
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      setStreaming(false);
    };
  }, [projectId, projectStatus?.status, setWorkflowState, setStreaming, updateAgentStatus]);
};

