/**
 * Agent Log Viewer Component
 * Scrollable log viewer with syntax highlighting
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { AgentExecutionLog } from '@/types';
import { AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';

interface AgentLogViewerProps {
  logs: AgentExecutionLog[];
}

const logLevelConfig = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  debug: {
    icon: Bug,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
  },
};

export const AgentLogViewer: React.FC<AgentLogViewerProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        No logs available
      </div>
    );
  }

  return (
    <div
      ref={logContainerRef}
      className="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
    >
      <div className="p-2 space-y-1">
        {logs.map((log, index) => {
          const config = logLevelConfig[log.level] || logLevelConfig.info;
          const LogIcon = config.icon;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`p-2 rounded border ${config.bgColor} ${config.borderColor} text-xs`}
            >
              <div className="flex items-start gap-2">
                <LogIcon className={`w-3 h-3 ${config.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${config.color}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 break-words">
                    {log.message}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        Metadata
                      </summary>
                      <pre className="mt-1 p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

