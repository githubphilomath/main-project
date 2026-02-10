# Frontend - Multi-Agent Development Platform

Modern React frontend for the Multi-Agent Autonomous Software Development Platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **ShadCN UI** components (custom implementation)
- **TanStack Query** for data fetching and caching
- **Zustand** for state management
- **Framer Motion** for animations
- **React Markdown** for markdown rendering
- **Axios** for API calls

## Features

### Three-Panel Layout

1. **Left Panel - Chat Interface**
   - Submit project ideas
   - View conversation history
   - Real-time agent messages
   - Markdown and code syntax highlighting

2. **Center Panel - Output Viewer**
   - Generated code files
   - Test files
   - Documentation
   - File tree navigation
   - Code preview with syntax highlighting
   - Download functionality

3. **Right Panel - Agent Status**
   - Real-time agent execution status
   - Workflow visualization
   - Progress tracking
   - Execution logs

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running on `http://localhost:8000`

### Installation

```bash
cd frontend
npm install
```

### Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `VITE_API_URL` if your backend runs on a different port.

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── agents/     # Agent status components
│   │   ├── chat/       # Chat interface components
│   │   ├── output/     # Output viewer components
│   │   ├── layout/     # Layout components
│   │   └── ui/         # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── layouts/        # Layout components
│   ├── services/       # API service layer
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── styles/         # Global styles
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## API Integration

The frontend communicates with the backend via:

- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `GET /api/v1/projects/{id}/status` - Get project status
- `POST /api/v1/projects/{id}/execute` - Execute workflow
- `GET /api/v1/projects/{id}/stream` - Stream workflow updates (SSE)

## State Management

Global state is managed using Zustand in `src/store/useStore.ts`:

- Current project
- Project status
- Workflow state
- Chat messages
- Agent statuses
- UI state (loading, errors, streaming)

## Styling

- Tailwind CSS for utility-first styling
- Custom CSS variables for theming
- Dark mode support
- Responsive design
- Glassmorphism effects
- Smooth animations with Framer Motion

## Development Guidelines

- Use TypeScript strictly
- Follow React best practices
- Use custom hooks for reusable logic
- Keep components small and focused
- Use Tailwind utility classes
- Follow the existing component structure

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
