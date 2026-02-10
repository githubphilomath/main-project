# Agent Execution Monitor

## Overview

The Agent Execution Monitor is a comprehensive real-time visualization dashboard for monitoring multi-agent AI platform execution. It displays execution progress, outputs, logs, and artifacts for all agents in the workflow.

## Components

### 1. AgentExecutionPanel
**Location:** `src/components/agents/AgentExecutionPanel.tsx`

Main container component that:
- Manages agent execution state
- Polls for real-time updates (every 2 seconds)
- Integrates with workflow state from Zustand store
- Displays workflow progress bar
- Renders agent cards in workflow order

**Features:**
- Real-time status updates
- Collapsible panel
- Automatic state synchronization
- Error handling

### 2. AgentCard
**Location:** `src/components/agents/AgentCard.tsx`

Collapsible card component for each agent displaying:
- Agent name and status indicator
- Execution time
- Retry count
- Output summary section
- Logs viewer section
- Error display

**Status Types:**
- `pending` - Gray, clock icon
- `running` - Blue, spinning loader icon
- `completed` - Green, checkmark icon
- `failed` - Red, X icon

**Features:**
- Smooth expand/collapse animations
- Active agent highlighting (ring border)
- Progress indicator for running agents
- Click to expand sections

### 3. AgentOutputViewer
**Location:** `src/components/agents/AgentOutputViewer.tsx`

Displays agent execution outputs:
- Output summary text
- Agent decisions with confidence scores
- Generated artifacts list
- Code preview with syntax highlighting
- Execution metadata

**Features:**
- Collapsible artifact sections
- Code syntax highlighting
- Metadata display
- File type icons

### 4. AgentLogViewer
**Location:** `src/components/agents/AgentLogViewer.tsx`

Scrollable log viewer displaying:
- Log level indicators (info, warning, error, debug)
- Timestamp formatting
- Log messages
- Metadata expansion

**Features:**
- Auto-scroll to latest logs
- Color-coded log levels
- Smooth animations
- Metadata expansion

### 5. WorkflowProgressBar
**Location:** `src/components/agents/WorkflowProgressBar.tsx`

Visual progress indicator showing:
- Overall workflow progress percentage
- Animated progress bar
- Phase completion indicators
- Current active phase highlighting

**Features:**
- Smooth progress animations
- Phase status indicators
- Responsive design

## State Management

### Types
Extended types in `src/types/index.ts`:
- `AgentOutput` - Complete agent output structure
- `AgentExecutionLog` - Log entry structure
- `AgentExecutionState` - State for all agents

### Store Integration
Uses Zustand store (`src/store/useStore.ts`) for:
- Current project
- Project status
- Workflow state
- Agent statuses

## API Integration

### Current Endpoints Used
- `GET /api/v1/projects/{id}/status` - Polls every 2 seconds
- Workflow state from Zustand store

### Future Endpoints (To Be Implemented)
- `GET /api/v1/agent-outputs` - Fetch agent outputs
- `GET /api/v1/agent-status` - Fetch agent statuses
- `GET /api/v1/agent-logs` - Fetch agent logs
- WebSocket streaming for real-time updates

## Real-Time Updates

### Polling Strategy
- Polls project status every 2 seconds when project is active
- Updates agent outputs from workflow state
- Updates agent statuses based on current phase

### State Synchronization
- Extracts agent decisions from workflow state
- Maps artifacts to agent outputs
- Updates agent statuses based on phase transitions

## Styling

### Design System
- **Tailwind CSS** - Utility-first styling
- **ShadCN UI** - Component library
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Color Scheme
- Pending: Gray
- Running: Blue
- Completed: Green
- Failed: Red

### Animations
- Card expand/collapse
- Progress bar fill
- Log entry appearance
- Active agent highlighting

## Usage

### Integration
The panel is integrated into `MainLayout.tsx` as the right sidebar:

```tsx
import { AgentExecutionPanel } from '@/components/agents/AgentExecutionPanel';

<AgentExecutionPanel />
```

### Mock Data
Mock data available in `src/utils/mockAgentData.ts` for development and testing.

## Future Enhancements

1. **WebSocket Streaming** - Replace polling with WebSocket for real-time updates
2. **Filtering** - Filter logs by level, agent, or time range
3. **Export** - Export logs and outputs
4. **Search** - Search within logs and outputs
5. **Performance Metrics** - Detailed performance analytics
6. **Error Recovery** - Retry failed agents from UI
7. **Artifact Download** - Download generated artifacts

## Dependencies

```json
{
  "framer-motion": "^10.x",
  "lucide-react": "^0.x",
  "@tanstack/react-query": "^5.x",
  "zustand": "^4.x"
}
```

## Notes

- Component is fully typed with TypeScript
- Responsive design for different screen sizes
- Dark mode support
- Accessible with ARIA labels
- Optimized for performance with React.memo where needed

