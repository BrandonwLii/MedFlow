# MedFlow - Hackathon Pitch Deck

---

## Slide 1: Title

**MedFlow**
*Intelligent Hospital Supply Delivery Optimization*

Team: [Your Team Name]

---

## Slide 2: The Problem

**Hospital supply delivery is broken**

- Nurses spend **20-30%** of their time hunting for supplies
- Critical deliveries delayed due to inefficient routing
- No visibility into delivery status or ETAs
- Manual dispatch leads to:
  - Missed deadlines for urgent supplies
  - Wasted energy from inefficient routes
  - Understaffed areas waiting while carts sit idle

**Result:** Worse patient outcomes, burned-out staff, higher costs

---

## Slide 3: Our Solution

**MedFlow: AI-Powered Hospital Logistics**

A real-time simulation and optimization platform for autonomous hospital delivery carts

- **Smart Dispatching** - Automatically assigns the right cart to the right job
- **Priority-Based Routing** - Emergency supplies get there first
- **Live Visualization** - See every cart, job, and delivery in real-time
- **Sustainability Tracking** - Monitor energy usage and CO2 emissions

---

## Slide 4: Key Features

| Feature | Description |
|---------|-------------|
| **Priority Queuing** | 5-tier system: Immediate, Emergency, Urgent, Semi-Urgent, Non-Urgent |
| **Triage Integration** | Bundle supplies for trauma, cardiac, respiratory cases |
| **Fleet Management** | Track battery, payload, and status of every cart |
| **A* Pathfinding** | Optimal routes avoiding obstacles and restricted zones |
| **Real-Time Metrics** | Energy, CO2, idle time, on-time delivery rate |

---

## Slide 5: Demo Scenarios

**4 Hospital Environments**

1. **Hospital Rush Hour** - Standard floor with ICU, OR, wards (6 agents, 10 jobs)

2. **Emergency Department** - High-acuity ED with trauma bays, resus rooms, triage (8 agents, 14 jobs)

3. **Multi-Wing Hospital** - Large facility with ICU wing, OR suite, pharmacy, lab (10 agents, 16 jobs)

4. **Surgical Center** - 8 operating rooms, pre-op, PACU, sterile supply (10 agents, 16 jobs)

---

## Slide 6: How It Works

```
[Job Created] → [Priority Queue] → [Dispatcher] → [Cart Assigned]
                                        ↓
                              [A* Pathfinding]
                                        ↓
                              [Real-Time Tracking]
                                        ↓
                              [Delivery Complete]
```

**Smart Assignment Considers:**
- Cart proximity to pickup
- Battery level and payload capacity
- Access permissions (ICU, OR, restricted areas)
- Urgent vs. non-urgent pool separation

---

## Slide 7: Live Dashboard

**What You See:**

- **Map View** - Real-time cart positions, walkable paths, chargers, storage
- **Job Queue** - All pending deliveries with priorities and ETAs
- **Fleet Panel** - Cart status, battery levels, current assignments
- **Triage Board** - Active medical cases and linked supply needs
- **Metrics Panel** - Energy, CO2, idle time, on-time percentage
- **Event Feed** - Live log of all system activities

---

## Slide 8: Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| State Management | Zustand with Immer |
| Styling | Tailwind CSS + shadcn/ui |
| Pathfinding | A* Algorithm |
| Visualization | HTML5 Canvas |
| Build | Vite |

**Why This Stack:**
- Fast iteration and hot reload
- Type safety for complex simulation logic
- Lightweight, no heavy dependencies

---

## Slide 9: Impact & Metrics

**What MedFlow Tracks:**

- **On-Time Delivery %** - Are critical supplies arriving before deadlines?
- **Energy Consumption (Wh)** - Total fleet energy usage
- **CO2 Emissions (g)** - Environmental impact
- **Deadheading %** - Carts moving without payload (waste)
- **Idle Time** - Waiting vs. charging breakdown
- **Batched Deliveries** - Efficiency from combining jobs

**Baseline Comparison** - See improvement vs. naive dispatching

---

## Slide 10: Future Vision

**Phase 2: Intelligence**
- Machine learning for demand prediction
- Dynamic rebalancing of cart positions
- Predictive maintenance alerts

**Phase 3: Integration**
- EHR integration for automatic supply ordering
- Real hardware cart control via ROS
- Multi-floor elevator coordination

**Phase 4: Scale**
- Multi-hospital fleet management
- Supply chain integration
- Analytics dashboard for administrators

---

## Slide 11: Why Now?

- **Labor shortage** - Hospitals can't hire enough staff
- **Autonomous tech ready** - AMRs are mature and affordable
- **Sustainability pressure** - Healthcare must reduce emissions
- **Post-COVID awareness** - Supply chain resilience is critical

**MedFlow bridges the gap between autonomous hardware and intelligent software**

---

## Slide 12: Call to Action

**Try It Now**

```bash
git clone https://github.com/BrandonwLii/MedFlow
cd MedFlow/frontend
npm install
npm run dev
```

Open http://localhost:5173 and click a scenario to see it in action!

---

**Questions?**

GitHub: github.com/BrandonwLii/MedFlow
