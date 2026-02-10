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
  const { currentProject, workflowState } = useStore();
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

    phaseOrder.forEach((name) => {
      const currentIndex = phaseOrder.indexOf(name);
      const activeIndex = currentAgentName ? phaseOrder.indexOf(currentAgentName as any) : -1;

      if (name === currentAgentName) {
        updated[name] = {
          ...updated[name],
          status: status.status === 'completed' ? 'completed' : 'running',
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Agent Execution Monitor
          </h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Workflow Progress */}
      {isExpanded && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <WorkflowProgressBar
            progress={status?.progress || 0}
            currentPhase={status?.current_phase}
          />
        </div>
      )}

      {/* Agent Cards List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

