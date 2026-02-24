/**
 * Workflow Progress Bar Component
 * Visual progress indicator for overall workflow execution
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/Progress';
import { CheckCircle2, Circle } from 'lucide-react';
import { AGENT_DISPLAY_NAMES, PHASE_PROGRESS } from '@/types';

interface WorkflowProgressBarProps {
  progress: number;
  currentPhase?: string;
}

export const WorkflowProgressBar: React.FC<WorkflowProgressBarProps> = ({
  progress,
  currentPhase,
}) => {
  const phases = [
    'initialization',
    'requirement_analysis',
    'architecture_design',
    'coding',
    'debugging',
    'testing',
    'documentation',
    'deployment',
    'completed',
  ];

  const getPhaseStatus = (phase: string): 'completed' | 'active' | 'pending' => {
    const phaseProgress = PHASE_PROGRESS[phase] || 0;
    if (phaseProgress < progress) return 'completed';
    if (phaseProgress === Math.floor(progress / 12.5) * 12.5 && currentPhase === phase)
      return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Overall Progress
        </span>
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress value={progress} className="h-2" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '8px' }}
        />
      </div>

      {/* Phase Indicators */}
      <div className="flex items-center justify-between text-xs">
        {phases.slice(0, -1).map((phase, index) => {
          const status = getPhaseStatus(phase);
          const isLast = index === phases.length - 2;

          return (
            <div key={phase} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : status === 'active' ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
                  </motion.div>
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                )}
                <span
                  className={`mt-1 text-center ${
                    status === 'active'
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : status === 'completed'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                  style={{ fontSize: '10px', lineHeight: '1.2' }}
                >
                  {AGENT_DISPLAY_NAMES[
                    phase === 'initialization'
                      ? 'orchestrator'
                      : phase === 'requirement_analysis'
                      ? 'requirement_analysis'
                      : phase === 'architecture_design'
                      ? 'architecture'
                      : phase === 'coding'
                      ? 'coding'
                      : phase === 'debugging'
                      ? 'debugging'
                      : phase === 'testing'
                      ? 'testing'
                      : phase === 'documentation'
                      ? 'documentation'
                      : 'deployment'
                  ] || phase}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    status === 'completed'
                      ? 'bg-green-600 dark:bg-green-400'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

