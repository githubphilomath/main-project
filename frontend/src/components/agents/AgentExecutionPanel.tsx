/**
 * Agent Execution Monitor Panel
 * Right sidebar displaying real-time agent execution outputs
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentCard } from './AgentCard';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import { useStore } from '@/store/useStore';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/api';
import { AGENT_NAMES, AGENT_DISPLAY_NAMES, type AgentExecutionState, type AgentOutput } from '@/types';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';

export const AgentExecutionPanel: React.FC = () => {
  const { currentProject, workflowState, setProjectStatus } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [agentOutputs, setAgentOutputs] = useState<AgentExecutionState>({});

  // Initialize agent outputs state
  useEffect(() => {
    const initial: AgentExecutionState = {};
    AGENT_NAMES.forEach((name) => {
      initial[name] = {
        output: null,
        logs: [],
        status: 'pending',
        executionTime: null,
        retryCount: 0,
      };
    });
    setAgentOutputs(initial);
  }, [currentProject?.id]);

  // Poll for agent outputs if project is active
  const { data: status } = useQuery({
    queryKey: ['project-status', currentProject?.id],
    queryFn: () => projectsApi.getStatus(currentProject!.id),
    enabled: !!currentProject,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  // Sync polled status into the Zustand store so OutputViewer and
  // useWorkflowStream can react to it
  useEffect(() => {
    if (status) {
      setProjectStatus(status);
    }
  }, [status, setProjectStatus]);

  // Update agent outputs from workflow state
  useEffect(() => {
    if (!workflowState || !currentProject) return;

    setAgentOutputs((prev) => {
      const updated: AgentExecutionState = { ...prev };

    // Extract agent decisions and map to outputs
    workflowState.agent_decisions?.forEach((decision) => {
      const agentName = decision.agent_name;
      if (AGENT_NAMES.includes(agentName as any)) {
        updated[agentName] = {
          ...updated[agentName],
          output: {
            agent_name: agentName,
            input: {
              context: workflowState,
            },
            output: {
              summary: decision.decision,
              decisions: [{
                decision: decision.decision,
                rationale: decision.rationale,
                confidence: decision.confidence,
              }],
            },
            execution_time_ms: 0,
            status: 'completed',
            retry_count: 0,
            timestamp: decision.timestamp,
          },
          status: 'completed',
        };
      }
    });

    // Map artifacts to agent outputs
    if (workflowState.code_artifacts?.length > 0) {
      updated.coding = {
        ...updated.coding,
        output: {
          ...updated.coding.output,
          agent_name: 'coding',
          output: {
            summary: `Generated ${workflowState.code_artifacts.length} code files`,
            artifacts: workflowState.code_artifacts.map((artifact) => ({
              type: 'code',
              name: artifact.file_path,
              content: artifact.content,
              metadata: {
                language: artifact.language,
                agent: artifact.agent,
              },
            })),
          },
        } as AgentOutput,
      };
    }

    if (workflowState.test_artifacts?.length > 0) {
      updated.testing = {
        ...updated.testing,
        output: {
          ...updated.testing.output,
          agent_name: 'testing',
          output: {
            summary: `Generated ${workflowState.test_artifacts.length} test files`,
            artifacts: workflowState.test_artifacts.map((artifact) => ({
              type: 'test',
              name: artifact.file_path,
              content: artifact.content,
              metadata: {
                test_type: artifact.test_type,
                coverage: artifact.coverage,
              },
            })),
          },
        } as AgentOutput,
      };
    }

    if (workflowState.documentation_artifacts?.length > 0) {
      updated.documentation = {
        ...updated.documentation,
        output: {
          ...updated.documentation.output,
          agent_name: 'documentation',
          output: {
            summary: `Generated ${workflowState.documentation_artifacts.length} documentation files`,
            artifacts: workflowState.documentation_artifacts.map((artifact) => ({
              type: 'documentation',
              name: artifact.doc_type,
              content: artifact.content,
            })),
          },
        } as AgentOutput,
      };
    }

      return updated;
    });
  }, [workflowState, currentProject]);

  // Update agent statuses based on current phase
  useEffect(() => {
    if (!status) return;

    setAgentOutputs((prev) => {
      const updated = { ...prev };
      const currentPhase = status.current_phase;
      const projectStatus = status.status;
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

      const currentAgentName = phaseToAgent[currentPhase] || status.current_agent;
      const phaseOrder = AGENT_NAMES;

      // Handle terminal states: all agents completed or failed
      if (projectStatus === 'completed' || currentPhase === 'completed') {
        phaseOrder.forEach((name) => {
          updated[name] = {
            ...updated[name],
            status: 'completed',
          };
        });
        return updated;
      }

      if (projectStatus === 'failed' || currentPhase === 'failed') {
        const activeIndex = currentAgentName ? phaseOrder.indexOf(currentAgentName as any) : -1;
        phaseOrder.forEach((name) => {
          const idx = phaseOrder.indexOf(name);
          if (idx < activeIndex) {
            updated[name] = { ...updated[name], status: 'completed' };
          } else if (name === currentAgentName) {
            updated[name] = { ...updated[name], status: 'failed' };
          }
          // Leave others as pending
        });
        return updated;
      }

      // In-progress: mark agents before current as completed, current as running
      phaseOrder.forEach((name) => {
        const currentIndex = phaseOrder.indexOf(name);
        const activeIndex = currentAgentName ? phaseOrder.indexOf(currentAgentName as any) : -1;

        if (name === currentAgentName) {
          updated[name] = {
            ...updated[name],
            status: 'running',
          };
        } else if (currentIndex < activeIndex) {
          updated[name] = {
            ...updated[name],
            status: 'completed',
          };
        }
      });

      return updated;
    });
  }, [status]);

  const currentAgent = status?.current_agent || 
    (status?.current_phase ? 
      Object.entries({
        initialization: 'orchestrator',
        requirement_analysis: 'requirement_analysis',
        architecture_design: 'architecture',
        coding: 'coding',
        debugging: 'debugging',
        testing: 'testing',
        documentation: 'documentation',
        deployment: 'deployment',
      }).find(([phase]) => phase === status.current_phase)?.[1] : null);

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header - fixed */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold">Agent Execution Monitor</h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Workflow Progress - fixed */}
      {isExpanded && (
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <WorkflowProgressBar
            progress={status?.progress || 0}
            currentPhase={status?.current_phase}
          />
        </div>
      )}

      {/* Agent Cards List - scrollable */}
      {isExpanded && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          <AnimatePresence>
            {AGENT_NAMES.map((agentName, index) => {
              const agentData = agentOutputs[agentName];
              const isActive = currentAgent === agentName;
              
              return (
                <motion.div
                  key={agentName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AgentCard
                    agentName={agentName}
                    displayName={AGENT_DISPLAY_NAMES[agentName]}
                    output={agentData?.output || null}
                    logs={agentData?.logs || []}
                    status={agentData?.status || 'pending'}
                    executionTime={agentData?.executionTime || null}
                    retryCount={agentData?.retryCount || 0}
                    isActive={isActive}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

