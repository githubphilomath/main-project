/**
 * Agent Card Component
 * Collapsible card displaying agent execution details
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { AgentOutputViewer } from './AgentOutputViewer';
import { AgentLogViewer } from './AgentLogViewer';
import type { AgentOutput, AgentExecutionLog } from '@/types';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface AgentCardProps {
  agentName: string;
  displayName: string;
  output: AgentOutput | null;
  logs: AgentExecutionLog[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionTime: number | null;
  retryCount: number;
  isActive: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-700',
    badge: 'default',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    badge: 'primary',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-300 dark:border-green-700',
    badge: 'success',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    badge: 'error',
  },
};

export const AgentCard: React.FC<AgentCardProps> = ({
  agentName: _agentName,
  displayName,
  output,
  logs,
  status,
  executionTime,
  retryCount,
  isActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'output' | 'logs' | null>(null);

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const formatExecutionTime = (ms: number | null): string => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.02 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`overflow-hidden transition-all ${
          isActive
            ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-lg'
            : 'shadow-sm'
        } ${config.bgColor} ${config.borderColor} border-2`}
      >
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </motion.div>

              <StatusIcon
                className={`w-5 h-5 ${config.color} ${
                  status === 'running' ? 'animate-spin' : ''
                }`}
              />

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {displayName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={config.badge as any}>{status}</Badge>
                  {executionTime !== null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatExecutionTime(executionTime)}
                    </span>
                  )}
                  {retryCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {retryCount} retries
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {status === 'running' && (
            <div className="mt-3">
              <Progress value={0} className="h-1" />
            </div>
          )}
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="pt-0 space-y-4">
                {/* Output Summary */}
                {output && (
                  <div>
                    <button
                      onClick={() =>
                        setExpandedSection(
                          expandedSection === 'output' ? null : 'output'
                        )
                      }
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Output Summary
                      </span>
                      {expandedSection === 'output' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSection === 'output' && (
                      <AgentOutputViewer output={output} />
                    )}
                  </div>
                )}

                {/* Logs */}
                {logs.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setExpandedSection(
                          expandedSection === 'logs' ? null : 'logs'
                        )
                      }
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        Logs ({logs.length})
                      </span>
                      {expandedSection === 'logs' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSection === 'logs' && (
                      <AgentLogViewer logs={logs} />
                    )}
                  </div>
                )}

                {/* Error Display */}
                {status === 'failed' && output?.error && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                          Error
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {output.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

