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

  // Simulation store
  const simState = useSimulationStore((s) => s.state);
  const currentTime = useSimulationStore((s) => s.currentTime);
  const config = useSimulationStore((s) => s.config);
  const currentPlan = useSimulationStore((s) => s.currentPlan);
  const tick = useSimulationStore((s) => s.tick);
  const finishReplan = useSimulationStore((s) => s.finishReplan);
  const startReplan = useSimulationStore((s) => s.startReplan);
  const updateMetrics = useSimulationStore((s) => s.updateMetrics);

  // Agent store
  const agents = useAgentStore((s) => s.agents);
  const setAgentPosition = useAgentStore((s) => s.setAgentPosition);
  const setAgentStatus = useAgentStore((s) => s.setAgentStatus);
  const drainBattery = useAgentStore((s) => s.drainBattery);
  const chargeBattery = useAgentStore((s) => s.chargeBattery);
  const assignJob = useAgentStore((s) => s.assignJob);
  const clearJob = useAgentStore((s) => s.clearJob);

  // Job store
  const jobs = useJobStore((s) => s.jobs);
  const setJobState = useJobStore((s) => s.setJobState);
  const assignAgent = useJobStore((s) => s.assignAgent);
  const markPickedUp = useJobStore((s) => s.markPickedUp);
  const markDelivered = useJobStore((s) => s.markDelivered);
  const updateETAs = useJobStore((s) => s.updateETAs);

  // Map store
  const map = useMapStore((s) => s.map);

  // Event store
  const addEvent = useEventStore((s) => s.addEvent);

  // Run replan
  const runReplan = useCallback(
    (reason: string) => {
      startReplan(reason);

      // Create new plan
      const newPlan = createPlan(jobs, agents, map, currentTime);

      // Update job assignments based on plan
      for (const agentPlan of newPlan.agentPlans) {
        const agent = agents.find((a) => a.id === agentPlan.agentId);
        if (!agent) continue;

        for (const jobId of agentPlan.jobIds) {
          const job = jobs.find((j) => j.id === jobId);
          if (job && job.state === 'QUEUED') {
            assignAgent(jobId, agentPlan.agentId);
            assignJob(agentPlan.agentId, jobId);
          }
        }
      }

      // Mark unassigned jobs
      for (const jobId of newPlan.unassignedJobIds) {
        const job = jobs.find((j) => j.id === jobId);
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
            const job = jobs.find((j) => j.id === id);
            return job && job.isLikelyLate;
          }),
        })
      );
    },
    [
      jobs,
      agents,
      map,
      currentTime,
      startReplan,
      finishReplan,
      assignAgent,
      assignJob,
      updateETAs,
      addEvent,
    ]
  );

  // Simulation tick
  const simulateTick = useCallback(() => {
    const deltaTime = SECONDS_PER_TICK * config.speedMultiplier;
    tick(SECONDS_PER_TICK);

    // Track metrics for this tick
    const metrics = metricsRef.current;

    // Process each agent
    for (const agent of agents) {
      const agentPlan = currentPlan?.agentPlans.find(
        (p) => p.agentId === agent.id
      );

      if (agent.status === 'CHARGING') {
        // Track charging time
        metrics.idleChargingSeconds += deltaTime;
        // Charge battery
        chargeBattery(agent.id, 1 * deltaTime);
        if (agent.battery >= 95) {
          setAgentStatus(agent.id, 'IDLE');
        }
        continue;
      }

      if (agent.status === 'WAITING' || (agent.status === 'IDLE' && !agent.currentJobId)) {
        // Track idle/waiting time
        metrics.idleWaitingSeconds += deltaTime;
      }

      if (!agentPlan || agentPlan.route.length === 0) {
        // No plan, check if needs charging
        if (agent.battery < 20) {
          // Find charger and go charge
          const charger = map.chargers.find(
            (c) => c.floorId === agent.floorId
          );
          if (charger) {
            setAgentStatus(agent.id, 'CHARGING');
          }
        }
        continue;
      }

      // Find current step in route
      const currentStepIndex = agentPlan.route.findIndex(
        (step) =>
          step.position.x === agent.position.x &&
          step.position.y === agent.position.y
      );

      if (currentStepIndex === -1) {
        // Agent not on route, need to get to first step
        const floor = map.floors.find((f) => f.id === agent.floorId);
        if (floor) {
          const path = findPath(
            floor,
            agent.position,
            agentPlan.route[0].position,
            agent
          );
          if (path && path.length > 1) {
            const nextPos = path[1];
            setAgentPosition(agent.id, nextPos, agent.floorId);
            drainBattery(agent.id, agent.batteryDrainRate);
            setAgentStatus(agent.id, 'MOVING');

            // Track energy and deadheading
            const energyUsed = agent.batteryDrainRate * 0.1; // Approximate Wh
            metrics.totalEnergyWh += energyUsed;
            if (agent.currentPayload === 0) {
              metrics.movingWithoutPayload += deltaTime;
            } else {
              metrics.movingWithPayload += deltaTime;
            }
          }
        }
        continue;
      }

      const currentStep = agentPlan.route[currentStepIndex];
      const nextStep = agentPlan.route[currentStepIndex + 1];

      // Handle current action
      if (currentStep.action === 'PICKUP') {
        setAgentStatus(agent.id, 'PICKING_UP');
        // Find job and mark picked up
        for (const jobId of agentPlan.jobIds) {
          const job = jobs.find((j) => j.id === jobId);
          if (job && !job.progress?.pickedUp) {
            markPickedUp(jobId, currentTime);
            setJobState(jobId, 'IN_PROGRESS');
          }
        }
      } else if (currentStep.action === 'DROPOFF') {
        setAgentStatus(agent.id, 'DROPPING_OFF');
        // Find job and mark delivered
        for (const jobId of agentPlan.jobIds) {
          const job = jobs.find((j) => j.id === jobId);
          if (job && job.progress?.pickedUp && !job.progress?.deliveredTime) {
            // Track delivery metrics
            metrics.deliveredCount += 1;
            if (currentTime <= job.deadline) {
              metrics.onTimeCount += 1;
            }
            markDelivered(jobId, currentTime);
            clearJob(agent.id);
            setAgentStatus(agent.id, 'IDLE');

            // Add delivery event
            addEvent(createEvent.jobCompleted(jobId, agent.id, currentTime));
          }
        }
      }

      // Move to next step if available
      if (nextStep && !currentStep.action) {
        setAgentPosition(agent.id, nextStep.position, agent.floorId);
        drainBattery(agent.id, agent.batteryDrainRate);
        setAgentStatus(agent.id, 'MOVING');

        // Track energy and deadheading
        const energyUsed = agent.batteryDrainRate * 0.1; // Approximate Wh
        metrics.totalEnergyWh += energyUsed;
        if (agent.currentPayload === 0) {
          metrics.movingWithoutPayload += deltaTime;
        } else {
          metrics.movingWithPayload += deltaTime;
        }
      }
    }

    // Update metrics in store (every tick for real-time display)
    const totalMoving = metrics.movingWithoutPayload + metrics.movingWithPayload;
    const deadheadingPercentage = totalMoving > 0
      ? (metrics.movingWithoutPayload / totalMoving) * 100
      : 0;
    const onTimePercentage = metrics.deliveredCount > 0
      ? (metrics.onTimeCount / metrics.deliveredCount) * 100
      : 100;

    updateMetrics({
      totalEnergyWh: metrics.totalEnergyWh,
      totalCO2g: metrics.totalEnergyWh * config.co2PerWh,
      idleWaitingSeconds: metrics.idleWaitingSeconds,
      idleChargingSeconds: metrics.idleChargingSeconds,
      deadheadingPercentage,
      onTimePercentage,
    });

    // Check for queued jobs that need assignment
    const queuedJobs = jobs.filter((j) => j.state === 'QUEUED');
    const idleAgents = agents.filter(
      (a) => a.status === 'IDLE' && !a.currentJobId
    );
    if (queuedJobs.length > 0 && idleAgents.length > 0 && !currentPlan) {
      runReplan('New jobs available');
    }
  }, [
    config,
    tick,
    agents,
    jobs,
    map,
    currentPlan,
    currentTime,
    setAgentPosition,
    setAgentStatus,
    drainBattery,
    chargeBattery,
    setJobState,
    markPickedUp,
    markDelivered,
    clearJob,
    runReplan,
    updateMetrics,
    addEvent,
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

  return {
    runReplan,
  };
};
