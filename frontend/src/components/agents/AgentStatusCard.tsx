/**
 * Agent Status Card Component
 */

import React from 'react';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/utils/cn';
import type { AgentStatus } from '@/types';

interface AgentStatusCardProps {
  agent: AgentStatus;
}

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({ agent }) => {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'running':
        return <Badge variant="info">Running</Badge>;
      default:
        return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        agent.status === 'running' && 'ring-2 ring-primary shadow-lg',
        agent.status === 'completed' && 'opacity-75'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h4 className="font-semibold text-sm">{agent.displayName}</h4>
              {agent.status === 'running' && agent.startTime && (
                <p className="text-xs text-muted-foreground">
                  Started {new Date(agent.startTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {agent.status === 'running' && (
          <Progress value={agent.progress} className="mb-3" />
        )}

        {agent.logs.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Recent Logs:</p>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {agent.logs.slice(-3).map((log, idx) => (
                <p key={idx} className="text-xs text-muted-foreground font-mono">
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {agent.error && (
          <div className="mt-3 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-xs text-destructive">{agent.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

