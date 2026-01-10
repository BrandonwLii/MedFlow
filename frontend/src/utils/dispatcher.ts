import type { Job, Agent, HospitalMap, PriorityTier, AgentPlan, RouteStep, Plan, PlanMetrics } from '../types';
import { findPath, getPathBatteryDrain } from './pathfinding';

const PRIORITY_ORDER: Record<PriorityTier, number> = {
  IMMEDIATE: 0,
  EMERGENCY: 1,
  URGENT: 2,
  SEMI_URGENT: 3,
  NON_URGENT: 4,
};

// Calculate effective priority score for queue ordering
export const calculateEffectivePriority = (
  job: Job,
  currentTime: number,
  starvationThreshold: number = 300
): number => {
  // Base priority from tier
  let score = PRIORITY_ORDER[job.priority] * 1000;

  // Deadline urgency (lower deadline = higher priority)
  const timeToDeadline = job.deadline - currentTime;
  score += Math.max(0, timeToDeadline);

  // Starvation protection (older jobs get higher priority)
  const waitTime = currentTime - job.createdAt;
  if (waitTime > starvationThreshold && job.priority !== 'IMMEDIATE') {
    // Reduce score for starvation, but never override IMMEDIATE
    score -= Math.min(waitTime - starvationThreshold, 500);
  }

  return score;
};

// Sort jobs by effective priority
export const sortJobsByPriority = (
  jobs: Job[],
  currentTime: number
): Job[] => {
  return [...jobs].sort(
    (a, b) =>
      calculateEffectivePriority(a, currentTime) -
      calculateEffectivePriority(b, currentTime)
  );
};

// Find best available agent for a job
export const findBestAgentForJob = (
  job: Job,
  agents: Agent[],
  map: HospitalMap
): Agent | null => {
  const availableAgents = agents.filter(
    (a) =>
      a.status === 'IDLE' &&
      !a.currentJobId &&
      a.battery > 20 // Minimum battery threshold
  );

  if (availableAgents.length === 0) return null;

  // Filter by pool
  const isUrgentJob = job.priority === 'IMMEDIATE' || job.priority === 'EMERGENCY';
  let poolAgents = availableAgents.filter(
    (a) => (isUrgentJob ? a.pool === 'URGENT' : a.pool === 'NON_URGENT')
  );

  // If no agents in preferred pool, try borrowing
  if (poolAgents.length === 0 && isUrgentJob) {
    poolAgents = availableAgents.filter((a) => a.pool === 'NON_URGENT');
  }

  if (poolAgents.length === 0) {
    poolAgents = availableAgents;
  }

  // Check payload capacity
  poolAgents = poolAgents.filter((a) => a.payloadLimit >= job.item.weight);

  if (poolAgents.length === 0) return null;

  // Find agent with best score (closest, has enough battery, right access)
  const floor = map.floors.find((f) => f.id === job.dropoff.floorId);
  if (!floor) return null;

  let bestAgent: Agent | null = null;
  let bestScore = Infinity;

  for (const agent of poolAgents) {
    if (agent.floorId !== job.dropoff.floorId) continue; // For now, same floor only

    // Check if agent has access to restricted areas in the path
    const pickupPos = job.pickup?.position || { x: 0, y: 0 };
    const pathToPickup = findPath(floor, agent.position, pickupPos, agent);
    if (!pathToPickup) continue;

    const pathToDropoff = findPath(floor, pickupPos, job.dropoff.position, agent);
    if (!pathToDropoff) continue;

    // Check battery
    const totalDrain = getPathBatteryDrain(pathToPickup, agent.batteryDrainRate) +
      getPathBatteryDrain(pathToDropoff, agent.batteryDrainRate);
    if (agent.battery - totalDrain < 10) continue;

    // Score based on distance
    const totalDistance = pathToPickup.length + pathToDropoff.length;
    if (totalDistance < bestScore) {
      bestScore = totalDistance;
      bestAgent = agent;
    }
  }

  return bestAgent;
};

// Create a plan for an agent to complete a job
export const createAgentPlan = (
  agent: Agent,
  job: Job,
  map: HospitalMap,
  currentTime: number
): AgentPlan | null => {
  const floor = map.floors.find((f) => f.id === agent.floorId);
  if (!floor) return null;

  const route: RouteStep[] = [];
  let time = currentTime;
  let totalEnergy = 0;

  // Path to pickup (if there's a pickup)
  if (job.pickup) {
    const pathToPickup = findPath(floor, agent.position, job.pickup.position, agent);
    if (!pathToPickup) return null;

    const energy = pathToPickup.length * 0.1; // Simplified energy calc

    // Add movement steps
    for (const pos of pathToPickup) {
      route.push({
        position: pos,
        floorId: floor.id,
        arrivalTime: time,
      });
      time += 1 / agent.speed;
    }

    // Add pickup action
    route.push({
      position: job.pickup.position,
      floorId: floor.id,
      arrivalTime: time,
      action: 'PICKUP',
      duration: job.pickupServiceTime,
    });
    time += job.pickupServiceTime;
    totalEnergy += energy;
  }

  // Path to dropoff
  const startPos = job.pickup?.position || agent.position;
  const pathToDropoff = findPath(floor, startPos, job.dropoff.position, agent);
  if (!pathToDropoff) return null;

  const dropoffEnergy = pathToDropoff.length * 0.1;

  for (const pos of pathToDropoff) {
    route.push({
      position: pos,
      floorId: floor.id,
      arrivalTime: time,
    });
    time += 1 / agent.speed;
  }

  // Add dropoff action
  route.push({
    position: job.dropoff.position,
    floorId: floor.id,
    arrivalTime: time,
    action: 'DROPOFF',
    duration: job.dropoffServiceTime,
  });
  time += job.dropoffServiceTime;
  totalEnergy += dropoffEnergy;

  return {
    agentId: agent.id,
    route,
    jobIds: [job.id],
    estimatedEnergy: totalEnergy,
    estimatedCO2: totalEnergy * 0.5, // CO2 per Wh
    conflicts: [],
  };
};

// Create a full plan from current state
export const createPlan = (
  jobs: Job[],
  agents: Agent[],
  map: HospitalMap,
  currentTime: number
): Plan => {
  const agentPlans: AgentPlan[] = [];
  const unassignedJobIds: string[] = [];
  const assignedJobs = new Set<string>();

  // Sort jobs by priority
  const sortedJobs = sortJobsByPriority(
    jobs.filter((j) => j.state === 'QUEUED'),
    currentTime
  );

  // Try to assign each job
  for (const job of sortedJobs) {
    const availableAgents = agents.filter(
      (a) => !agentPlans.some((p) => p.agentId === a.id)
    );

    const bestAgent = findBestAgentForJob(job, availableAgents, map);

    if (bestAgent) {
      const plan = createAgentPlan(bestAgent, job, map, currentTime);
      if (plan) {
        agentPlans.push(plan);
        assignedJobs.add(job.id);
        continue;
      }
    }

    unassignedJobIds.push(job.id);
  }

  // Calculate metrics
  const metrics: PlanMetrics = {
    totalEnergyWh: agentPlans.reduce((sum, p) => sum + p.estimatedEnergy, 0),
    totalCO2g: agentPlans.reduce((sum, p) => sum + p.estimatedCO2, 0),
    idleWaitingSeconds: 0,
    idleChargingSeconds: 0,
    onTimePercentage: 100,
    batchedDeliveries: 0,
    deadheadingPercentage: 0,
    energyPerItem: 0,
    lowEmissionChoicesPercentage: 0,
  };

  return {
    timestamp: currentTime,
    agentPlans,
    unassignedJobIds,
    metrics,
  };
};

// Check if a job can potentially be completed (feasibility check)
export const checkJobFeasibility = (
  job: Job,
  agents: Agent[],
  map: HospitalMap
): { feasible: boolean; reason?: string } => {
  const floor = map.floors.find((f) => f.id === job.dropoff.floorId);
  if (!floor) {
    return { feasible: false, reason: 'Floor not found' };
  }

  // Check if dropoff is walkable
  const dropoffCell = floor.grid[job.dropoff.position.y]?.[job.dropoff.position.x];
  if (!dropoffCell?.walkable) {
    return { feasible: false, reason: 'Dropoff location not walkable' };
  }

  // Check if any agent can handle the payload
  const canHandlePayload = agents.some((a) => a.payloadLimit >= job.item.weight);
  if (!canHandlePayload) {
    return { feasible: false, reason: 'No agent can handle payload weight' };
  }

  // Check if path exists
  if (job.pickup) {
    const pickupCell = floor.grid[job.pickup.position.y]?.[job.pickup.position.x];
    if (!pickupCell?.walkable) {
      return { feasible: false, reason: 'Pickup location not walkable' };
    }
  }

  return { feasible: true };
};
