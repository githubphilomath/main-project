/**
 * Chat Panel Component
 * Left panel for user interaction and chat messages
 * Connects to SSE /events endpoint for real-time "thinking" updates
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { MessageBubble } from './MessageBubble';
import { ThinkingCard, type ThinkingCardProps } from './ThinkingCard';
import { ProjectHistory } from './ProjectHistory';
import { useStore } from '@/store/useStore';
import { projectsApi } from '@/services/api';
import type { Message } from '@/types';
import { AGENT_DISPLAY_NAMES } from '@/types';

export const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeThinking, setActiveThinking] = useState<ThinkingCardProps | null>(null);
  const [completedCards, setCompletedCards] = useState<ThinkingCardProps[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { messages, addMessage, currentProject, setCurrentProject, setLoading, setStreaming, setWorkflowState } = useStore();
  const isModifyMode = Boolean(currentProject);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeThinking, completedCards]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Persist messages to backend whenever they change
  const persistTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    const pid = currentProject?.id;
    if (!pid || messages.length === 0) return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = window.setTimeout(() => {
      const serializable = messages.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      projectsApi.saveMessages(pid, serializable).catch(() => {});
    }, 2000);
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [messages, currentProject?.id]);

  const connectToEvents = useCallback((projectId: string) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = projectsApi.events(projectId);
    eventSourceRef.current = es;
    setStreaming(true);

    // agent_start: show thinking card
    es.addEventListener('agent_start', (e) => {
      try {
        const data = JSON.parse(e.data);
        const agentName = data.agent;
        if (agentName === 'orchestrator') return;
        const thinkingText = data.thinking || data.message || `${AGENT_DISPLAY_NAMES[agentName] || agentName} is working...`;
        setActiveThinking({
          agentName,
          status: 'thinking',
          thinkingText,
        });
      } catch { /* ignore parse errors */ }
    });

    // agent_complete: finalize thinking card + move to completed
    es.addEventListener('agent_complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        const agentName = data.agent;
        if (agentName === 'orchestrator') return;
        const card: ThinkingCardProps = {
          agentName,
          status: 'complete',
          thinkingText: '',
          summary: data.summary || data.message,
          details: data.details,
          durationMs: data.duration_ms,
        };
        setCompletedCards((prev) => [...prev, card]);
        setActiveThinking(null);
      } catch { /* ignore parse errors */ }
    });

    // agent_error: show error card
    es.addEventListener('agent_error', (e) => {
      try {
        const data = JSON.parse(e.data);
        const agentName = data.agent;
        const card: ThinkingCardProps = {
          agentName,
          status: 'error',
          thinkingText: '',
          summary: data.message || 'Agent error: unknown',
          durationMs: data.duration_ms,
        };
        setCompletedCards((prev) => [...prev, card]);
        setActiveThinking(null);
      } catch { /* ignore parse errors */ }
    });

    // workflow_complete
    es.addEventListener('workflow_complete', async (e) => {
      setActiveThinking(null);
      setStreaming(false);
      setLoading(false);
      let isModifyCompletion = false;
      let changeSummary = '';
      try {
        const data = JSON.parse((e as MessageEvent).data);
        isModifyCompletion = data.phase === 'coding';
        const pid = data.project_id || projectId;
        if (pid) {
          const state = await projectsApi.getState(pid);
          if (state) setWorkflowState(state);
        }
        if (isModifyCompletion) {
          const parts: string[] = [];
          if (data.files_modified?.length) parts.push(`**Modified:** ${data.files_modified.join(', ')}`);
          if (data.files_added?.length) parts.push(`**Added:** ${data.files_added.join(', ')}`);
          if (data.files_removed?.length) parts.push(`**Removed:** ${data.files_removed.join(', ')}`);
          changeSummary = parts.length > 0
            ? parts.join('\n')
            : (data.change_summary || '');
        }
      } catch { /* ignore */ }

      let content: string;
      if (isModifyCompletion) {
        content = changeSummary
          ? `Modifications applied successfully!\n\n${changeSummary}`
          : 'Modifications applied successfully! Your changes have been updated in place.';
      } else {
        content = 'Workflow completed successfully! All agents have finished their work.';
      }

      const msg: Message = {
        id: `done-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        projectId,
      };
      addMessage(msg);
      es.close();
      eventSourceRef.current = null;
    });

    // workflow_error
    es.addEventListener('workflow_error', (e) => {
      setActiveThinking(null);
      setStreaming(false);
      setLoading(false);
      let errorMsg = 'Workflow failed';
      try {
        const data = JSON.parse(e.data);
        errorMsg = data.message || errorMsg;
      } catch { /* use default */ }
      const msg: Message = {
        id: `wf-error-${Date.now()}`,
        role: 'system',
        content: `Workflow error: ${errorMsg}`,
        timestamp: new Date(),
        projectId,
      };
      addMessage(msg);
      es.close();
      eventSourceRef.current = null;
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setActiveThinking(null);
        setStreaming(false);
        eventSourceRef.current = null;
      }
    };
  }, [addMessage, setLoading, setStreaming, setWorkflowState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      ...(currentProject && { projectId: currentProject.id }),
    };

    addMessage(userMessage);
    const messageText = input.trim();
    setInput('');
    setIsSubmitting(true);
    setLoading(true);
    setCompletedCards([]);
    setActiveThinking(null);

    try {
      if (isModifyMode && currentProject) {
        // Modification request for existing project
        connectToEvents(currentProject.id);
        await projectsApi.modify(currentProject.id, messageText);
      } else {
        // Create new project
        const lines = messageText.split('\n');
        const name = lines[0] || 'New Project';
        const description = lines.slice(1).join('\n') || messageText;

        const project = await projectsApi.create({
          name,
          description,
          requirements: messageText,
        });

        setCurrentProject(project);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Project "${project.name}" created successfully! Project ID: ${project.id}\n\nStarting workflow execution...`,
          timestamp: new Date(),
          projectId: project.id,
        };

        addMessage(assistantMessage);

        connectToEvents(project.id);
        await projectsApi.execute(project.id);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string | unknown[] } }; message?: string };
      const d = err.response?.data?.detail;
      const detail = typeof d === 'string' ? d : Array.isArray(d) ? ((d[0] as any)?.msg ?? JSON.stringify(d)) : undefined;
      const msg = detail || (err.message ?? 'Failed to create project');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${msg}`,
        timestamp: new Date(),
      };
      addMessage(errorMessage);
      setLoading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden relative">
      {/* Project History Overlay */}
      <ProjectHistory isOpen={showHistory} onClose={() => setShowHistory(false)} />

      <CardContent className="flex-1 min-h-0 flex flex-col p-0">
        {/* History toggle bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
          {currentProject && (
            <span className="text-xs text-muted-foreground truncate ml-2">
              {currentProject.name}
            </span>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  {isModifyMode ? 'Request Modifications' : 'Start a New Project'}
                </h3>
                <p className="text-sm">
                  {isModifyMode
                    ? 'Ask for changes to your existing app. Edits are applied in place (like Cursor).'
                    : 'Describe your software idea and our AI agents will build it for you.'}
                </p>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Completed agent thinking cards */}
          {completedCards.map((card, i) => (
            <ThinkingCard key={`${card.agentName}-${i}`} {...card} />
          ))}

          {/* Active thinking card */}
          {activeThinking && (
            <ThinkingCard {...activeThinking} />
          )}

          {isSubmitting && !activeThinking && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{isModifyMode ? 'Applying modifications...' : 'Creating project...'}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form id="chat-form" onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              id="chat-message-input"
              name="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isModifyMode ? "Request a modification (e.g. Add dark mode, change button color)..." : "Describe your software project idea..."}
              className="flex-1 min-h-[80px] max-h-[200px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              size="md"
              className="self-end"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

