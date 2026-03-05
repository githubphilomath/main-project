/**
 * ThinkingCard — expandable agent thinking/completion card in the chat.
 * Shows agent name, status, duration, thinking text, and structured details.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileCode,
  TestTube,
  FileText,
  Cpu,
  Wrench,
  Rocket,
  Search,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { AGENT_DISPLAY_NAMES } from '@/types';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <LayoutDashboard className="h-4 w-4" />,
  requirement_analysis: <Search className="h-4 w-4" />,
  architecture: <Cpu className="h-4 w-4" />,
  coding: <FileCode className="h-4 w-4" />,
  debugging: <Wrench className="h-4 w-4" />,
  testing: <TestTube className="h-4 w-4" />,
  documentation: <FileText className="h-4 w-4" />,
  deployment: <Rocket className="h-4 w-4" />,
};

export interface ThinkingCardProps {
  agentName: string;
  status: 'thinking' | 'complete' | 'error';
  thinkingText: string;
  summary?: string;
  details?: Record<string, any>;
  durationMs?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

function renderDetails(details: Record<string, any>) {
  const entries = Object.entries(details).filter(
    ([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="text-muted-foreground font-medium min-w-[100px] flex-shrink-0">
            {key.replace(/_/g, ' ')}:
          </span>
          <span className="text-foreground break-words min-w-0">
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export const ThinkingCard: React.FC<ThinkingCardProps> = ({
  agentName,
  status,
  thinkingText,
  summary,
  details,
  durationMs,
}) => {
  const [isExpanded, setIsExpanded] = useState(status === 'thinking');
  const displayName = AGENT_DISPLAY_NAMES[agentName] || agentName;
  const icon = AGENT_ICONS[agentName] || <Brain className="h-4 w-4" />;

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        status === 'thinking' && 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20',
        status === 'complete' && 'border-green-500/20 bg-green-50/30 dark:bg-green-950/10',
        status === 'error' && 'border-red-500/20 bg-red-50/30 dark:bg-red-950/10',
      )}
    >
      {/* Header — always visible, clickable to expand */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}

        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>

        <span className="font-medium text-sm truncate">{displayName}</span>

        <span className="ml-auto flex items-center gap-2 flex-shrink-0">
          {durationMs !== undefined && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(durationMs)}
            </span>
          )}
          {status === 'thinking' && (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          )}
          {status === 'complete' && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-inherit max-h-[300px] overflow-y-auto">
          {/* Thinking text */}
          {status === 'thinking' && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 animate-pulse whitespace-pre-wrap break-words">
              {thinkingText}
            </p>
          )}

          {/* Summary */}
          {summary && status !== 'thinking' && (
            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words">
              {summary}
            </p>
          )}

          {/* Structured details */}
          {details && Object.keys(details).length > 0 && renderDetails(details)}
        </div>
      )}
    </div>
  );
};
