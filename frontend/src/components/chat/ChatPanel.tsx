/**
 * Chat Panel Component
 * Left panel for user interaction and chat messages
 * Connects to SSE /events endpoint for real-time "thinking" updates
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { MessageBubble } from './MessageBubble';
import { useStore } from '@/store/useStore';
import { projectsApi } from '@/services/api';
import type { Message } from '@/types';
import { AGENT_DISPLAY_NAMES } from '@/types';

export const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { messages, addMessage, currentProject, setCurrentProject, setLoading, setStreaming, setWorkflowState } = useStore();
  const isModifyMode = Boolean(currentProject);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingMessage]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connectToEvents = useCallback((projectId: string) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = projectsApi.events(projectId);
    eventSourceRef.current = es;
    setStreaming(true);

    // agent_start: show thinking message
    es.addEventListener('agent_start', (e) => {
      try {
        const data = JSON.parse(e.data);
        const agentName = data.agent;
        const displayName = AGENT_DISPLAY_NAMES[agentName] || agentName;
        const message = data.message || `${displayName} is working...`;
        setThinkingMessage(message);
      } catch { /* ignore parse errors */ }
    });

    // agent_complete: add verbose completion message to chat
    es.addEventListener('agent_complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        const agentName = data.agent;
        // Don't show orchestrator completions as they're internal routing decisions
        if (agentName !== 'orchestrator') {
          const msg: Message = {
            id: `agent-${agentName}-${Date.now()}`,
            role: 'assistant',
            content: data.message || `**${AGENT_DISPLAY_NAMES[agentName] || agentName}** completed.`,
            timestamp: new Date(),
            projectId,
          };
          addMessage(msg);
        }
        setThinkingMessage(null);
      } catch { /* ignore parse errors */ }
    });

    // agent_error: show error
    es.addEventListener('agent_error', (e) => {
      try {
        const data = JSON.parse(e.data);
        setThinkingMessage(null);
        const msg: Message = {
          id: `error-${data.agent}-${Date.now()}`,
          role: 'system',
          content: data.message || `Agent error: unknown`,
          timestamp: new Date(),
          projectId,
        };
        addMessage(msg);
      } catch { /* ignore parse errors */ }
    });

    // workflow_complete
    es.addEventListener('workflow_complete', async (e) => {
      setThinkingMessage(null);
      setStreaming(false);
      setLoading(false);
      let isModifyCompletion = false;
      try {
        const data = JSON.parse((e as MessageEvent).data);
        isModifyCompletion = data.phase === 'coding';
        const pid = data.project_id || projectId;
        if (pid) {
          const state = await projectsApi.getState(pid);
          if (state) setWorkflowState(state);
        }
      } catch { /* ignore */ }
      const msg: Message = {
        id: `done-${Date.now()}`,
        role: 'assistant',
        content: isModifyCompletion
          ? 'Modifications applied successfully! Your changes have been updated in place.'
          : 'Workflow completed successfully! All agents have finished their work.',
        timestamp: new Date(),
        projectId,
      };
      addMessage(msg);
      es.close();
      eventSourceRef.current = null;
    });

    // workflow_error
    es.addEventListener('workflow_error', (e) => {
      setThinkingMessage(null);
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

    // Handle connection errors
    es.onerror = () => {
      // EventSource will auto-reconnect on non-fatal errors.
      // On fatal close, just clean up.
      if (es.readyState === EventSource.CLOSED) {
        setThinkingMessage(null);
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
      const detail = typeof d === 'string' ? d : Array.isArray(d) ? (d[0]?.msg ?? JSON.stringify(d)) : undefined;
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
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="flex-1 min-h-0 flex flex-col p-0">
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

          {/* Thinking indicator - shows current agent activity */}
          {thinkingMessage && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">{thinkingMessage}</span>
            </div>
          )}

          {isSubmitting && !thinkingMessage && (
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

