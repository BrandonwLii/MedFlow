# MedFlow

**Hospital Supply Delivery Optimizer** - basically a simulation tool for optimizing medical supply delivery logistics within hospital environments.

## Overview

MedFlow is an interactive simulation platform that helps visualize and optimize the flow of medical supplies through hospital facilities. It features a map editor for designing hospital layouts, fleet management for delivery agents, job queuing systems, and triage prioritization.

## Features

- **Map Editor** - Design hospital floor plans with rooms, corridors, and delivery points
- **Fleet Management** - Configure and monitor delivery agents
- **Job Queue** - Manage and prioritize delivery tasks
- **Triage Board** - Handle urgent delivery cases with priority sorting
- **Event Feed** - Real-time monitoring of simulation events
- **Metrics Panel** - Track performance and delivery statistics
- **Import/Export** - Save and load simulation scenarios as JSON files

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Radix UI components

lowk no thorough backend because of time, but with more development time a backend can be added.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) package manager

### Installing pnpm

If you don't have pnpm installed:

```bash
npm install -g pnpm
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/BrandonwLii/MedFlow.git
cd MedFlow
```

### 2. Install dependencies

```bash
cd frontend
pnpm install
```

### 3. Start the development server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

From the `frontend` directory:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run ESLint |

## Usage

1. **Design your hospital layout** using the Map Editor tab
2. **Add delivery agents** in the Fleet tab
3. **Create delivery jobs** in the Queue tab
4. **Set triage priorities** for urgent deliveries
5. **Run the simulation** using the controls in the header
6. **Monitor performance** via the Event Feed and Metrics Panel
7. **Export your scenario** to save your configuration

## Project Structure

```
MedFlow/
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state stores
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions
│   │   └── App.tsx        # Main application component
│   ├── package.json
│   └── vite.config.ts
└── backend/               # Backend (placeholder)
```

## License

MIT
