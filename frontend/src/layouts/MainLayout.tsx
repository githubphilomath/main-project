/**
 * Main Layout Component
 * Three-panel layout: Chat | Output | Agents
 */

import React from 'react';
import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OutputViewer } from '@/components/output/OutputViewer';
import { AgentExecutionPanel } from '@/components/agents/AgentExecutionPanel';

export const MainLayout: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 grid grid-cols-[400px_1fr_350px] gap-4 p-4 overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="h-full">
          <ChatPanel />
        </div>

        {/* Center Panel - Output Viewer */}
        <div className="h-full overflow-hidden">
          <OutputViewer />
        </div>

        {/* Right Panel - Agent Execution Monitor */}
        <div className="h-full overflow-hidden">
          <AgentExecutionPanel />
        </div>
      </div>
    </div>
  );
};

