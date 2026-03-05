/**
 * Main Layout Component
 * Three-panel layout: Chat | Output | Agents
 *
 * Uses a strict h-screen -> flex-col -> flex-1 -> grid pattern.
 * Every flex/grid child that needs to scroll must have min-h-0/min-w-0.
 */

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OutputViewer } from '@/components/output/OutputViewer';
import { AgentExecutionPanel } from '@/components/agents/AgentExecutionPanel';

export const MainLayout: React.FC = () => {
  const [agentPanelExpanded, setAgentPanelExpanded] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 min-h-0 flex gap-3 p-3">
        <section className="w-[380px] flex-shrink-0 min-h-0">
          <ChatPanel />
        </section>

        <section className="flex-1 min-h-0 min-w-0">
          <OutputViewer />
        </section>

        <section
          className={`flex-shrink-0 min-h-0 transition-[width] duration-300 ease-in-out ${
            agentPanelExpanded ? 'w-[320px]' : 'w-[44px]'
          }`}
        >
          <AgentExecutionPanel
            isExpanded={agentPanelExpanded}
            onToggle={() => setAgentPanelExpanded((v) => !v)}
          />
        </section>
      </main>
    </div>
  );
};
