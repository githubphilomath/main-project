/**
 * Agent Output Viewer Component
 * Displays agent execution outputs with syntax highlighting
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { AgentOutput } from '@/types';
// Code viewer will be inline
import { FileText, Code, CheckCircle2, FileCode } from 'lucide-react';

interface AgentOutputViewerProps {
  output: AgentOutput;
}

export const AgentOutputViewer: React.FC<AgentOutputViewerProps> = ({
  output,
}) => {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <Code className="w-4 h-4" />;
      case 'test':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'documentation':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  return (
    <div className="mt-2 space-y-3">
      {/* Output Summary */}
      <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {output.output.summary}
        </p>
      </div>

      {/* Decisions */}
      {output.output.decisions && output.output.decisions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
            Decisions
          </h4>
          {output.output.decisions.map((decision, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {decision.decision}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {decision.rationale}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Confidence: {(decision.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Artifacts */}
      {output.output.artifacts && output.output.artifacts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
            Generated Artifacts ({output.output.artifacts.length})
          </h4>
          <div className="space-y-1">
            {output.output.artifacts.map((artifact, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-2 rounded-md border cursor-pointer transition-colors ${
                  selectedArtifact === artifact.name
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() =>
                  setSelectedArtifact(
                    selectedArtifact === artifact.name ? null : artifact.name
                  )
                }
              >
                <div className="flex items-center gap-2">
                  {getArtifactIcon(artifact.type)}
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                    {artifact.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {artifact.type}
                  </span>
                </div>
                {artifact.metadata && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(artifact.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Artifact Content Viewer */}
          {selectedArtifact && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              {(() => {
                const artifact = output.output.artifacts?.find(
                  (a) => a.name === selectedArtifact
                );
                if (!artifact?.content) return null;

                const language =
                  artifact.metadata?.language ||
                  (artifact.name.endsWith('.ts') || artifact.name.endsWith('.tsx')
                    ? 'typescript'
                    : artifact.name.endsWith('.js') || artifact.name.endsWith('.jsx')
                    ? 'javascript'
                    : artifact.name.endsWith('.py')
                    ? 'python'
                    : artifact.name.endsWith('.md')
                    ? 'markdown'
                    : 'text');

                return (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-900">
                    <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-300">{artifact.name}</span>
                      <span className="text-xs text-gray-400">{language}</span>
                    </div>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <pre className="p-4 text-xs text-gray-100 font-mono">
                        <code>{artifact.content}</code>
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </div>
      )}

      {/* Execution Info */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Execution Time: {output.execution_time_ms}ms</span>
          <span>Status: {output.status}</span>
        </div>
      </div>
    </div>
  );
};

