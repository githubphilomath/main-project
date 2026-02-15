/**
 * Main Layout Component
 * Three-panel layout: Chat | Output | Agents
 *
 * Uses a strict h-screen -> flex-col -> flex-1 -> grid pattern.
 * Every flex/grid child that needs to scroll must have min-h-0/min-w-0.
 */

import React from 'react';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OutputViewer } from '@/components/output/OutputViewer';
import { AgentExecutionPanel } from '@/components/agents/AgentExecutionPanel';

export const MainLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header - fixed height */}
      <Header />

      {/* Main content - fills remaining height */}
      <main className="flex-1 min-h-0 flex gap-3 p-3">
        {/* Left Panel - Chat (fixed width) */}
        <section className="w-[380px] flex-shrink-0 min-h-0">
          <ChatPanel />
        </section>

        {/* Center Panel - Output Viewer (fills remaining) */}
        <section className="flex-1 min-h-0 min-w-0">
          <OutputViewer />
        </section>

        {/* Right Panel - Agent Execution Monitor (fixed width) */}
        <section className="w-[320px] flex-shrink-0 min-h-0">
          <AgentExecutionPanel />
        </section>
      </main>
    </div>
  );
};
