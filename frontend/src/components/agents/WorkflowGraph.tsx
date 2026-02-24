/**
 * Workflow Graph Component
 * Visual pipeline diagram showing agent execution order
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AGENT_DISPLAY_NAMES } from '@/types';

interface WorkflowGraphProps {
  currentPhase: string;
}

const WORKFLOW_STEPS = [
  { phase: 'initialization', agent: 'orchestrator' },
  { phase: 'requirement_analysis', agent: 'requirement_analysis' },
  { phase: 'architecture_design', agent: 'architecture' },
  { phase: 'coding', agent: 'coding' },
  { phase: 'debugging', agent: 'debugging' },
  { phase: 'testing', agent: 'testing' },
  { phase: 'documentation', agent: 'documentation' },
  { phase: 'deployment', agent: 'deployment' },
];

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({ currentPhase }) => {
  const getStepStatus = (_phase: string, index: number) => {
    const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.phase === currentPhase);
    
    if (currentPhase === 'completed') return 'completed';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="flex flex-col gap-4">
      {WORKFLOW_STEPS.map((step, index) => {
        const status = getStepStatus(step.phase, index);
        const isLast = index === WORKFLOW_STEPS.length - 1;

        return (
          <React.Fragment key={step.phase}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all',
                status === 'active' && 'bg-primary/10 ring-2 ring-primary',
                status === 'completed' && 'bg-green-500/10',
                status === 'pending' && 'bg-muted/50'
              )}
            >
              <div className="flex-shrink-0">
                {status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : status === 'active' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Circle className="h-5 w-5 text-primary fill-primary" />
                  </motion.div>
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {AGENT_DISPLAY_NAMES[step.agent] || step.agent}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {step.phase.replace(/_/g, ' ')}
                </p>
              </div>
              {status === 'active' && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
              )}
            </motion.div>
            {!isLast && (
              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

