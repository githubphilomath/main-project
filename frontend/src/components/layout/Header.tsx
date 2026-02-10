/**
 * Header Component
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';

export const Header: React.FC = () => {
  const { currentProject, projectStatus } = useStore();

  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-16 items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Multi-Agent Platform</h1>
        </div>

        {currentProject && projectStatus && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{currentProject.name}</span>
                <Badge
                  variant={
                    projectStatus.status === 'completed'
                      ? 'success'
                      : projectStatus.status === 'failed'
                      ? 'error'
                      : 'info'
                  }
                >
                  {projectStatus.status}
                </Badge>
              </div>
              <div className="w-48 mt-1">
                <Progress value={projectStatus.progress} showLabel />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

