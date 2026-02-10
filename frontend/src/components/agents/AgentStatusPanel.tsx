/**
 * Agent Status Panel Component
 * Right panel showing all agent statuses
 */

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AgentStatusCard } from './AgentStatusCard';
import { WorkflowGraph } from './WorkflowGraph';
import { useStore } from '@/store/useStore';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/api';
import { AGENT_DISPLAY_NAMES, PHASE_PROGRESS } from '@/types';

export const AgentStatusPanel: React.FC = () => {
  const { currentProject, agents, setProjectStatus, updateAgentStatus } = useStore();
  const agentsRef = useRef(agents);
  
  // Keep ref updated with latest agents
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // Poll project status
  const { data: status } = useQuery({
    queryKey: ['project-status', currentProject?.id],
    queryFn: () => projectsApi.getStatus(currentProject!.id),
    enabled: !!currentProject,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  useEffect(() => {
    if (!status) return;

    // Only update project status if it actually changed
    setProjectStatus(status);
    
    // Update agent statuses based on current phase
    const phaseToAgent: Record<string, string> = {
      initialization: 'orchestrator',
      requirement_analysis: 'requirement_analysis',
      architecture_design: 'architecture',
      coding: 'coding',
      debugging: 'debugging',
      testing: 'testing',
      documentation: 'documentation',
      deployment: 'deployment',
    };

    const currentAgentName = phaseToAgent[status.current_phase] || status.current_agent;
    const phaseOrder = [
      'orchestrator',
      'requirement_analysis',
      'architecture',
      'coding',
      'debugging',
      'testing',
      'documentation',
      'deployment',
    ];
    const activeIndex = phaseOrder.indexOf(currentAgentName || '');
    
    // Update all agents - iterate over phaseOrder instead of agents Map
    phaseOrder.forEach((name) => {
      const currentIndex = phaseOrder.indexOf(name);
      const agent = agentsRef.current.get(name);
      
      if (name === currentAgentName) {
        // Update current agent
        if (agent?.status !== (status.status === 'completed' ? 'completed' : 'running') || 
            agent?.progress !== status.progress) {
          updateAgentStatus(name, {
            status: status.status === 'completed' ? 'completed' : 'running',
            progress: status.progress,
          });
        }
      } else if (currentIndex < activeIndex) {
        // Mark previous agents as completed
        if (agent?.status !== 'completed') {
          updateAgentStatus(name, { status: 'completed', progress: 100 });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.project_id, status?.current_phase, status?.status, status?.progress]);


  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Workflow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowGraph currentPhase={status?.current_phase || 'initialization'} />
        </CardContent>
      </Card>

      {/* Agent Statuses */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from(agents.values()).map((agent) => (
            <AgentStatusCard key={agent.name} agent={agent} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

