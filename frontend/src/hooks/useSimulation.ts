import { useEffect, useRef, useCallback } from 'react';
import {
  useSimulationStore,
  useAgentStore,
  useJobStore,
  useMapStore,
  useEventStore,
  createEvent,
} from '../stores';
import { createPlan } from '../utils/dispatcher';
import { findPath } from '../utils/pathfinding';

const TICK_INTERVAL = 100; // ms between ticks
const SECONDS_PER_TICK = 0.1; // simulation seconds per tick

// Real-time metrics tracking
interface LiveMetrics {
  totalEnergyWh: number;
  idleWaitingSeconds: number;
  idleChargingSeconds: number;
  movingWithPayload: number;
  movingWithoutPayload: number;
  deliveredCount: number;
  onTimeCount: number;
}

// Track agent action state for duration timing
interface AgentActionState {
  currentStepIndex: number;
  actionStartTime: number | null;
  targetChargerPosition: { x: number; y: number } | null;
  routeCompleted: boolean;
}

export const useSimulation = () => {
  const intervalRef = useRef<number | null>(null);

  // Live metrics tracking ref (persists across renders)
  const metricsRef = useRef<LiveMetrics>({
    totalEnergyWh: 0,
    idleWaitingSeconds: 0,
    idleChargingSeconds: 0,
    movingWithPayload: 0,
    movingWithoutPayload: 0,
    deliveredCount: 0,
    onTimeCount: 0,
  });

  // Track agent action states (step index, action timing, charging target)
  const agentStatesRef = useRef<Map<string, AgentActionState>>(new Map());

  // Throttle counter to reduce store updates
  const tickCountRef = useRef(0);

  // Replan cooldown to prevent infinite loops when no assignments possible
  const lastReplanTimeRef = useRef<number>(-Infinity);
  const lastQueuedJobIdsRef = useRef<string>('');
  const REPLAN_COOLDOWN = 5; // seconds

  // Simulation store
  const simState = useSimulationStore((s) => s.state);
  const currentTime = useSimulationStore((s) => s.currentTime);
  const config = useSimulationStore((s) => s.config);
  // currentPlan accessed via getState() in simulateTick to avoid stale closures
  const tick = useSimulationStore((s) => s.tick);
  const finishReplan = useSimulationStore((s) => s.finishReplan);
  const startReplan = useSimulationStore((s) => s.startReplan);
  const updateMetrics = useSimulationStore((s) => s.updateMetrics);
  const clearPlan = useSimulationStore((s) => s.clearPlan);

  // Agent store (agents accessed via getState() in simulateTick to avoid stale closures)
  const setAgentPosition = useAgentStore((s) => s.setAgentPosition);
  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const drainBattery = useAgentStore((s) => s.drainBattery);
  const chargeBattery = useAgentStore((s) => s.chargeBattery);
  const assignJob = useAgentStore((s) => s.assignJob);
  const clearJob = useAgentStore((s) => s.clearJob);
  const setPayload = useAgentStore((s) => s.setPayload);

  // Job store (jobs accessed via getState() in simulateTick to avoid stale closures)
  const setJobState = useJobStore((s) => s.setJobState);
  const assignAgent = useJobStore((s) => s.assignAgent);
  const markPickedUp = useJobStore((s) => s.markPickedUp);
  const markDelivered = useJobStore((s) => s.markDelivered);
  const updateETAs = useJobStore((s) => s.updateETAs);

  // Map store (map accessed via getState() in simulateTick to avoid stale closures)

  // Event store
  const addEvent = useEventStore((s) => s.addEvent);

  // Run replan
  const runReplan = useCallback(
    (reason: string) => {
      startReplan(reason);

      // Get fresh state from stores to avoid stale closures
      const currentJobs = useJobStore.getState().jobs;
      const currentAgents = useAgentStore.getState().agents;
      const currentMap = useMapStore.getState().map;

      // Create new plan
      const newPlan = createPlan(currentJobs, currentAgents, currentMap, currentTime);

      // Reset agent states for ALL agents (not just those in new plan)
      // This ensures agents with routeCompleted=true get cleared
      agentStatesRef.current.clear();
      for (const agentPlan of newPlan.agentPlans) {
        agentStatesRef.current.set(agentPlan.agentId, {
          currentStepIndex: -1,
          actionStartTime: null,
          targetChargerPosition: null,
          routeCompleted: false,
        });
      }

      // Update job assignments based on plan
      for (const agentPlan of newPlan.agentPlans) {
        const agent = currentAgents.find((a) => a.id === agentPlan.agentId);
        if (!agent) continue;

        for (const jobId of agentPlan.jobIds) {
          const job = currentJobs.find((j) => j.id === jobId);
          if (job && job.state === 'QUEUED') {
            assignAgent(jobId, agentPlan.agentId);
            assignJob(agentPlan.agentId, jobId);
          }
        }
      }

      // Mark unassigned jobs
      for (const jobId of newPlan.unassignedJobIds) {
        const job = currentJobs.find((j) => j.id === jobId);
        if (job) {
          // Calculate if likely late
          const isLikelyLate = job.deadline < currentTime + 120; // 2 min buffer
          updateETAs(jobId, currentTime + 60, currentTime + 180, isLikelyLate);
        }
      }

      finishReplan(newPlan);
      addEvent(
        createEvent.replanCompleted(reason, currentTime, {
          lateJobs: newPlan.unassignedJobIds.filter((id) => {
            const job = currentJobs.find((j) => j.id === id);
            return job && job.isLikelyLate;
          }),
        })
      );
    },
    [
      currentTime,
      startReplan,
      finishReplan,
      assignAgent,
      assignJob,
      updateETAs,
      addEvent,
    ]
  );

  // Helper to get or create agent state
  const getAgentState = useCallback((agentId: string): AgentActionState => {
    let state = agentStatesRef.current.get(agentId);
    if (!state) {
      state = { currentStepIndex: -1, actionStartTime: null, targetChargerPosition: null, routeCompleted: false };
      agentStatesRef.current.set(agentId, state);
    }
    return state;
  }, []);

  // Simulation tick
  const simulateTick = useCallback(() => {
    const deltaTime = SECONDS_PER_TICK * config.speedMultiplier;
    tick(SECONDS_PER_TICK);

    // Get fresh state from stores to avoid stale closures
    const currentAgents = useAgentStore.getState().agents;
    const currentJobs = useJobStore.getState().jobs;
    const currentMap = useMapStore.getState().map;
    const simCurrentTime = useSimulationStore.getState().currentTime;
    const simCurrentPlan = useSimulationStore.getState().currentPlan;

    // Track metrics for this tick
    const metrics = metricsRef.current;

    // Process each agent
    for (const agent of currentAgents) {
      const agentPlan = simCurrentPlan?.agentPlans.find(
        (p) => p.agentId === agent.id
      );
      const agentState = getAgentState(agent.id);

      // Handle charging state
      if (agent.status === 'CHARGING') {
        metrics.idleChargingSeconds += deltaTime;
        // Find the charger at agent's position to get its charge rate
        const charger = currentMap.chargers.find(
          (c) => c.floorId === agent.floorId &&
                 c.position.x === agent.position.x &&
                 c.position.y === agent.position.y
        );
        const chargeRate = charger?.chargeRate || 5; // Default 5% per second if not found
        chargeBattery(agent.id, chargeRate * deltaTime);
        if (agent.battery >= 95) {
          setAgentStatus(agent.id, 'IDLE');
          agentState.targetChargerPosition = null;
        }
        continue;
      }

      // Check for critical battery level - agent must abort and seek charger
      // Note: CHARGING status is already handled above, so this catches other statuses
      if (agent.battery <= 5) {
        // If agent has a job, we need to handle the emergency
        if (agent.currentJobId) {
          // Clear the job - it will need to be reassigned
          clearJob(agent.id);
          addEvent({
            type: 'AGENT_LOW_BATTERY',
            timestamp: simCurrentTime,
            summary: `${agent.name} battery critical (${agent.battery.toFixed(0)}%)`,
            details: 'Job aborted, seeking charger',
          });
        }
        // Seek nearest charger
        const charger = currentMap.chargers.find((c) => c.floorId === agent.floorId);
        if (charger) {
          agentState.targetChargerPosition = charger.position;
          agentState.routeCompleted = true; // Mark route as done to allow replan
        }
        continue;
      }

      // Handle moving to charger
      if (agentState.targetChargerPosition) {
        const floor = currentMap.floors.find((f) => f.id === agent.floorId);
        if (floor) {
          // Check if at charger
          if (agent.position.x === agentState.targetChargerPosition.x &&
              agent.position.y === agentState.targetChargerPosition.y) {
            setAgentStatus(agent.id, 'CHARGING');
            continue;
          }
          // Path to charger
          const path = findPath(floor, agent.position, agentState.targetChargerPosition, agent);
          if (path && path.length > 1) {
            setAgentPosition(agent.id, path[1], agent.floorId);
            drainBattery(agent.id, agent.batteryDrainRate);
            setAgentStatus(agent.id, 'MOVING');
            metrics.totalEnergyWh += agent.batteryDrainRate * 0.1;
            metrics.movingWithoutPayload += deltaTime;
          }
        }
        continue;
      }

      // Track idle/waiting time
      if (agent.status === 'WAITING' || (agent.status === 'IDLE' && !agent.currentJobId)) {
        metrics.idleWaitingSeconds += deltaTime;
      }

      // No plan - check if needs charging
      if (!agentPlan || agentPlan.route.length === 0) {
        if (agent.battery < 20 && !agent.currentJobId) {
          const charger = currentMap.chargers.find((c) => c.floorId === agent.floorId);
          if (charger) {
            agentState.targetChargerPosition = charger.position;
          }
        }
        continue;
      }

      // Reset step index if we have a new plan and agent is at start
      if (agentState.currentStepIndex === -1) {
        // Check if agent is at first route position
        const firstStep = agentPlan.route[0];
        if (agent.position.x === firstStep.position.x &&
            agent.position.y === firstStep.position.y) {
          agentState.currentStepIndex = 0;
        }
      }

      const currentStepIndex = agentState.currentStepIndex;

      // Agent not on route yet, move to first step
      if (currentStepIndex === -1) {
        const floor = currentMap.floors.find((f) => f.id === agent.floorId);
        if (floor) {
          const path = findPath(floor, agent.position, agentPlan.route[0].position, agent);
          if (path && path.length > 1) {
            setAgentPosition(agent.id, path[1], agent.floorId);
            drainBattery(agent.id, agent.batteryDrainRate);
            setAgentStatus(agent.id, 'MOVING');
            metrics.totalEnergyWh += agent.batteryDrainRate * 0.1;
            if (agent.currentPayload === 0) {
              metrics.movingWithoutPayload += deltaTime;
            } else {
              metrics.movingWithPayload += deltaTime;
            }
          } else if (path && path.length === 1) {
            // Already at first step
            agentState.currentStepIndex = 0;
          }
        }
        continue;
      }

      // Bounds check
      if (currentStepIndex >= agentPlan.route.length) {
        // Route complete, reset
        agentState.currentStepIndex = -1;
        agentState.actionStartTime = null;
        agentState.routeCompleted = true;
        setAgentStatus(agent.id, 'IDLE');
        continue;
      }

      const currentStep = agentPlan.route[currentStepIndex];
      const nextStep = agentPlan.route[currentStepIndex + 1];

      // Handle actions with duration timing
      if (currentStep.action) {
        // Verify agent is at the action position before starting
        const atActionPosition =
          agent.position.x === currentStep.position.x &&
          agent.position.y === currentStep.position.y;

        if (!atActionPosition) {
          // Agent not at action position yet - need to move there first
          const floor = currentMap.floors.find((f) => f.id === agent.floorId);
          if (floor) {
            const path = findPath(floor, agent.position, currentStep.position, agent);
            if (path && path.length > 1) {
              setAgentPosition(agent.id, path[1], agent.floorId);
              drainBattery(agent.id, agent.batteryDrainRate);
              setAgentStatus(agent.id, 'MOVING');
              metrics.totalEnergyWh += agent.batteryDrainRate * 0.1;
            }
          }
          continue;
        }

        const actionDuration = currentStep.duration || 2; // Default 2 seconds

        // Start action if not started
        if (agentState.actionStartTime === null) {
          agentState.actionStartTime = simCurrentTime;

          if (currentStep.action === 'PICKUP') {
            setAgentStatus(agent.id, 'PICKING_UP');
          } else if (currentStep.action === 'DROPOFF') {
            setAgentStatus(agent.id, 'DROPPING_OFF');
          }
        }

        // Check if action duration elapsed
        const elapsed = simCurrentTime - agentState.actionStartTime;
        if (elapsed >= actionDuration) {
          // Complete action
          if (currentStep.action === 'PICKUP') {
            // Find first unpicked job
            for (const jobId of agentPlan.jobIds) {
              const job = currentJobs.find((j) => j.id === jobId);
              if (job && !job.progress?.pickedUp) {
                markPickedUp(jobId, simCurrentTime);
                setJobState(jobId, 'IN_PROGRESS');
                // Update agent payload
                setPayload(agent.id, agent.currentPayload + job.item.weight);
                break; // Only pick up one job at a time
              }
            }
          } else if (currentStep.action === 'DROPOFF') {
            // Find first picked-up job to deliver
            for (const jobId of agentPlan.jobIds) {
              const job = currentJobs.find((j) => j.id === jobId);
              if (job && job.progress?.pickedUp && !job.progress?.deliveredTime) {
                metrics.deliveredCount += 1;
                if (simCurrentTime <= job.deadline) {
                  metrics.onTimeCount += 1;
                }
                markDelivered(jobId, simCurrentTime);
                addEvent(createEvent.jobCompleted(jobId, agent.id, simCurrentTime));
                // Update agent payload
                setPayload(agent.id, Math.max(0, agent.currentPayload - job.item.weight));
                break; // Only deliver one job at a time
              }
            }

            // Check if all jobs delivered
            const allDelivered = agentPlan.jobIds.every((jobId) => {
              const job = currentJobs.find((j) => j.id === jobId);
              return job?.progress?.deliveredTime;
            });
            if (allDelivered) {
              clearJob(agent.id);
              setPayload(agent.id, 0); // Reset payload when all jobs done
            }
          }

          // Move to next step
          agentState.actionStartTime = null;
          agentState.currentStepIndex += 1;

          if (!nextStep) {
            setAgentStatus(agent.id, 'IDLE');
            agentState.currentStepIndex = -1;
            agentState.routeCompleted = true;
          }
        }
        continue;
      }

      // Current step has no action - check if we're at this position
      const atCurrentStep =
        agent.position.x === currentStep.position.x &&
        agent.position.y === currentStep.position.y;

      if (atCurrentStep) {
        // We're at the current step position with no action - advance to next step
        if (nextStep) {
          agentState.currentStepIndex += 1;
        } else {
          // No next step, route complete
          setAgentStatus(agent.id, 'IDLE');
          agentState.currentStepIndex = -1;
          agentState.routeCompleted = true;
        }
      } else {
        // Not at current step position - move toward it
        const floor = currentMap.floors.find((f) => f.id === agent.floorId);
        if (floor) {
          const path = findPath(floor, agent.position, currentStep.position, agent);
          if (path && path.length > 1) {
            setAgentPosition(agent.id, path[1], agent.floorId);
            drainBattery(agent.id, agent.batteryDrainRate);
            setAgentStatus(agent.id, 'MOVING');
            metrics.totalEnergyWh += agent.batteryDrainRate * 0.1;
            if (agent.currentPayload === 0) {
              metrics.movingWithoutPayload += deltaTime;
            } else {
              metrics.movingWithPayload += deltaTime;
            }
          } else if (path && path.length <= 1) {
            // Already at current step position (path length 1 means start = end)
            // This will be handled next tick when atCurrentStep is true
          } else {
            // No path found - this is a problem
            addEvent({
              type: 'AGENT_DELAYED',
              timestamp: simCurrentTime,
              summary: `${agent.name} cannot find path`,
              details: `Stuck at (${agent.position.x}, ${agent.position.y})`,
            });
          }
        }
      }
    }

    // Update metrics in store (throttled to every 10 ticks to reduce re-renders)
    tickCountRef.current += 1;
    if (tickCountRef.current >= 10) {
      tickCountRef.current = 0;
      const totalMoving = metrics.movingWithoutPayload + metrics.movingWithPayload;
      const deadheadingPercentage = totalMoving > 0
        ? (metrics.movingWithoutPayload / totalMoving) * 100
        : 0;
      const onTimePercentage = metrics.deliveredCount > 0
        ? (metrics.onTimeCount / metrics.deliveredCount) * 100
        : 100;

      // All metrics are cumulative for the session - no reset
      updateMetrics({
        totalEnergyWh: metrics.totalEnergyWh,
        totalCO2g: metrics.totalEnergyWh * config.co2PerWh,
        idleWaitingSeconds: metrics.idleWaitingSeconds,
        idleChargingSeconds: metrics.idleChargingSeconds,
        deadheadingPercentage,
        onTimePercentage,
      });
    }

    // Check for queued jobs that need assignment (use fresh state)
    const queuedJobs = currentJobs.filter((j) => j.state === 'QUEUED');
    const idleAgents = currentAgents.filter(
      (a) => a.status === 'IDLE' && !a.currentJobId
    );

    // Check if current plan has any active routes left
    const hasActiveRoutes = simCurrentPlan?.agentPlans.some((ap) => {
      if (ap.route.length === 0) return false;
      const agentState = agentStatesRef.current.get(ap.agentId);
      if (!agentState) return true; // Agent hasn't started yet, route is still pending
      // Route is active if not yet completed
      return !agentState.routeCompleted;
    });

    // Clear the plan if no active routes remain
    let planJustCleared = false;
    if (simCurrentPlan && !hasActiveRoutes) {
      clearPlan();
      planJustCleared = true;
    }

    // Trigger replan if there are queued jobs and idle agents available
    // Use cooldown to prevent infinite loops when dispatcher can't assign jobs
    const queuedJobIds = queuedJobs.map(j => j.id).sort().join(',');
    const timeSinceLastReplan = simCurrentTime - lastReplanTimeRef.current;
    const jobsChanged = queuedJobIds !== lastQueuedJobIdsRef.current;

    if (queuedJobs.length > 0 && idleAgents.length > 0 && !hasActiveRoutes) {
      // Replan immediately if:
      // - jobs changed (new jobs added/removed)
      // - plan just cleared (agents finished their routes, ready for more work)
      // - cooldown elapsed (fallback for edge cases)
      if (jobsChanged || planJustCleared || timeSinceLastReplan >= REPLAN_COOLDOWN) {
        lastReplanTimeRef.current = simCurrentTime;
        lastQueuedJobIdsRef.current = queuedJobIds;
        runReplan('New jobs available');
      }
    }
  }, [
    config,
    tick,
    setAgentPosition,
    setAgentStatus,
    drainBattery,
    chargeBattery,
    setJobState,
    markPickedUp,
    markDelivered,
    clearJob,
    setPayload,
    clearPlan,
    runReplan,
    updateMetrics,
    addEvent,
    getAgentState,
  ]);

  // Start/stop simulation loop
  useEffect(() => {
    if (simState === 'RUNNING') {
      intervalRef.current = window.setInterval(simulateTick, TICK_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simState, simulateTick]);

  // Reset metricsRef and agent states when simulation stops (user clicked reset or stop)
  const prevSimState = useRef(simState);
  useEffect(() => {
    // Reset metrics and agent states when transitioning to STOPPED
    if (simState === 'STOPPED' && prevSimState.current !== 'STOPPED') {
      metricsRef.current = {
        totalEnergyWh: 0,
        idleWaitingSeconds: 0,
        idleChargingSeconds: 0,
        movingWithPayload: 0,
        movingWithoutPayload: 0,
        deliveredCount: 0,
        onTimeCount: 0,
      };
      tickCountRef.current = 0;
      agentStatesRef.current.clear();
      lastReplanTimeRef.current = -Infinity;
      lastQueuedJobIdsRef.current = '';
    }
    prevSimState.current = simState;
  }, [simState]);

  return {
    runReplan,
  };
};
