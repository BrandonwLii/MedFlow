# MedFlow 🏥

**Intelligent Hospital Supply Delivery Optimization Platform**

An AI-powered logistics simulation for autonomous hospital delivery carts. Optimize routes, reduce energy consumption, and ensure critical supplies arrive on time.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Problem

| Challenge | Impact |
|-----------|--------|
| **30%** of nurse time spent hunting for supplies | Reduced patient care time |
| **$25B** annually on supply chain inefficiencies | Wasted hospital resources |
| **4.4%** of global emissions from healthcare | Environmental impact |
| **Zero visibility** into delivery status | Missed deadlines, chaos |

## The Solution

MedFlow is an interactive simulation platform that demonstrates how AI-powered dispatch and A* pathfinding can optimize hospital logistics:

- **Smart Dispatching** — Automatically assigns the right cart to the right job based on location, battery, payload capacity, and access permissions
- **Priority Routing** — 5-tier priority system ensures emergency supplies always arrive first
- **Live Visualization** — Real-time map view of all carts, jobs, and deliveries
- **Sustainability Tracking** — Monitor energy consumption and CO2 emissions per delivery

---

## Features

### 🗺️ Interactive Map Editor
- Paint walkable corridors, obstacles, and special zones
- Define **restricted areas** (ICU, OR, Pharmacy) with access control
- Mark **quarantine zones** that block all agents
- Place chargers, storage points, staging areas, and elevators
- Hover over cells to see their properties

### 🤖 Fleet Management
- Configure delivery cart pools (Urgent vs Non-Urgent)
- Set **access profiles** per agent — control which areas each cart can enter
- Monitor battery levels, payload, and current assignments
- Real-time status tracking (Idle, Moving, Charging, Pickup, Dropoff)

### 📋 Job Queue System
- Create delivery jobs with pickup/dropoff locations
- 5 priority tiers: Immediate → Emergency → Urgent → Semi-Urgent → Non-Urgent
- Deadline tracking with starvation protection for older jobs
- Automatic assignment to best available agent

### 🚨 Triage Board
- Link medical cases to supply bundles (Trauma, Surgery, Crash Code Blue)
- Auto-generate jobs based on triage level
- Track case status and linked deliveries

### 📊 Metrics Dashboard
- **Energy consumption** (Wh) and **CO2 emissions** (g)
- On-time delivery percentage
- Deadheading rate (empty cart travel)
- Idle time breakdown (waiting vs charging)

### 📡 Event Feed
- Real-time log of all system events
- Job created, assigned, completed, delayed
- Agent battery warnings and failures
- Replan notifications with impact assessment

---

## Demo Scenarios

MedFlow includes 4 pre-built hospital scenarios:

| Scenario | Agents | Jobs | Complexity | Description |
|----------|--------|------|------------|-------------|
| **Hospital Rush Hour** | 6 | 10 | Simple | Standard floor with ICU, OR, wards, pharmacy. Includes restricted areas and quarantine zones. |
| **Emergency Department** | 8 | 14 | Complex | High-acuity ED with trauma bays and resuscitation rooms |
| **Multi-Wing Hospital** | 10 | 16 | Complex | Large facility with ICU wing, OR suite, pharmacy, and lab |
| **Surgical Center** | 10 | 16 | Medium | 8 operating rooms, pre-op, PACU, sterile supply |

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/BrandonwLii/MedFlow.git
cd MedFlow/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** and select a scenario to begin!

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## How It Works

### Dispatch Algorithm

```
Job Created → Priority Queue → Smart Dispatch → A* Pathfinding → Delivery
```

The dispatcher considers:
1. **Cart proximity** to pickup location
2. **Battery level** with reserve for return to charger
3. **Payload capacity** vs item weight
4. **Access permissions** for restricted areas
5. **Pool assignment** (urgent carts for emergency jobs)

### A* Pathfinding

Optimal pathfinding with Manhattan distance heuristic:
- Respects walkable/obstacle cells
- Enforces **restricted area access** — agents without ICU profile can't enter ICU
- Blocks **quarantine zones** — no agent can pass through
- Calculates energy cost per path

### Priority System

| Priority | Use Case | Queue Behavior |
|----------|----------|----------------|
| IMMEDIATE | Life-threatening | Always first |
| EMERGENCY | Critical but stable | High priority |
| URGENT | Time-sensitive | Standard priority |
| SEMI_URGENT | Scheduled needs | Can wait |
| NON_URGENT | Routine supplies | Lowest priority |

Starvation protection: Jobs waiting too long get priority boost.

---

## Architecture

```
MedFlow/
├── frontend/
│   ├── src/
│   │   ├── components/     # React UI components
│   │   │   ├── MapEditor.tsx       # Canvas-based map editor
│   │   │   ├── FleetPanel.tsx      # Agent management + access profiles
│   │   │   ├── JobQueue.tsx        # Job creation and monitoring
│   │   │   ├── TriageBoard.tsx     # Medical case management
│   │   │   ├── MetricsPanel.tsx    # Sustainability dashboard
│   │   │   └── EventFeed.tsx       # Real-time event log
│   │   ├── stores/         # Zustand state management
│   │   │   ├── mapStore.ts         # Floor plans, cells, chargers
│   │   │   ├── agentStore.ts       # Cart fleet state
│   │   │   ├── jobStore.ts         # Delivery jobs
│   │   │   └── simulationStore.ts  # Sim clock, plans, metrics
│   │   ├── hooks/
│   │   │   └── useSimulation.ts    # Core simulation loop
│   │   ├── utils/
│   │   │   ├── pathfinding.ts      # A* algorithm
│   │   │   ├── dispatcher.ts       # Job assignment logic
│   │   │   └── mockData.ts         # Demo scenarios
│   │   └── types/          # TypeScript definitions
│   └── package.json
├── slideshow.html          # Pitch deck presentation
└── README.md
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **Zustand** | State management |
| **Tailwind CSS** | Styling |
| **Radix UI** | Accessible components |
| **HTML5 Canvas** | Map rendering |

---

## Environmental Impact

MedFlow tracks sustainability metrics in real-time:

| Metric | Formula | Purpose |
|--------|---------|---------|
| Energy (Wh) | `distance × drainRate` | Track power consumption |
| CO2 (g) | `Wh × 0.4 g/Wh` | Carbon footprint |
| Deadheading % | `emptyDist / totalDist` | Identify waste |
| Energy per Item | `totalWh / itemsDelivered` | Efficiency KPI |

**Projected Impact:**
- 40% energy reduction vs naive dispatch
- 35% CO2 reduction
- 50% less deadheading

---

## Roadmap

### Phase 1: Core Platform ✅
- [x] Map editor with restricted areas
- [x] Fleet management with access profiles
- [x] A* pathfinding with access control
- [x] Priority-based job queue
- [x] Real-time simulation engine
- [x] Sustainability metrics

### Phase 2: Intelligence
- [ ] ML demand prediction
- [ ] Dynamic cart rebalancing
- [ ] Predictive maintenance alerts

### Phase 3: Integration
- [ ] EHR auto-ordering
- [ ] Real hardware via ROS
- [ ] Multi-floor elevator navigation

---

## References

- Health Care Without Harm. "Health Care Climate Footprint Report" (2019) — 4.4% global emissions
- Infor Healthcare Survey — 32% of nurses spend 20+ min/shift searching for supplies
- American Hospital Association — $25B annually on supply chain inefficiencies
- Hart, Nilsson, Raphael. "A Formal Basis for the Heuristic Determination of Minimum Cost Paths" (1968) — A* algorithm

---

## License

MIT © 2025

---

<p align="center">
  <strong>MedFlow</strong> — Every optimized delivery is a step toward greener healthcare.
</p>
