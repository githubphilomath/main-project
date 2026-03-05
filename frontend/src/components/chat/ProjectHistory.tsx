/**
 * ProjectHistory — drawer/sidebar listing past projects.
 * Clicking a project restores its state + chat messages.
 */

import React, { useEffect, useState } from 'react';
import { History, Plus, ChevronLeft, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { projectsApi } from '@/services/api';
import type { Project, Message } from '@/types';
import { cn } from '@/utils/cn';

interface ProjectHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const ProjectHistory: React.FC<ProjectHistoryProps> = ({ isOpen, onClose }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentProject, setCurrentProject, setWorkflowState, setMessages, setProjectStatus } = useStore();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      projectsApi.list()
        .then(setProjects)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSelectProject = async (project: Project) => {
    try {
      setCurrentProject(project);

      const [state, savedMsgs, status] = await Promise.all([
        projectsApi.getState(project.id),
        projectsApi.getMessages(project.id),
        projectsApi.getStatus(project.id),
      ]);

      if (state) setWorkflowState(state);
      if (status) setProjectStatus(status);

      if (savedMsgs && savedMsgs.length > 0) {
        const restored: Message[] = savedMsgs.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      } else {
        setMessages([]);
      }

      onClose();
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  const handleNewProject = () => {
    const { reset } = useStore.getState();
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-card rounded-2xl border shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Project History</span>
      </div>

      {/* New project button */}
      <button
        onClick={handleNewProject}
        className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Project
      </button>

      {/* Project list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No projects yet
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelectProject(project)}
              className={cn(
                'w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors',
                currentProject?.id === project.id && 'bg-primary/5 border-l-2 border-l-primary',
              )}
            >
              <div className="flex items-center gap-2">
                {STATUS_ICONS[project.status] || STATUS_ICONS.pending}
                <span className="font-medium text-sm truncate flex-1">{project.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {project.updated_at ? timeAgo(project.updated_at) : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {project.description || project.requirements}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
