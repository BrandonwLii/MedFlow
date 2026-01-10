import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  SimulationState,
  SimulationConfig,
  Plan,
  PlanMetrics,
  BaselineComparison,
  AgentPlan,
} from '../types';

interface SimState {
  state: SimulationState;
  currentTime: number; // simulation time in seconds
  config: SimulationConfig;
  currentPlan: Plan | null;
  baselineComparison: BaselineComparison | null;
  replanCount: number;
  lastReplanReason: string | null;
}

interface SimActions {
  // Simulation control
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;

  // Time management
  tick: (deltaSeconds: number) => void;
  setTime: (time: number) => void;

  // Speed control
  setSpeedMultiplier: (multiplier: number) => void;

  // Config
  setConfig: (config: Partial<SimulationConfig>) => void;

  // Plan management
  setPlan: (plan: Plan) => void;
  updateAgentPlan: (agentId: string, plan: AgentPlan) => void;
  clearPlan: () => void;

  // Replanning
  startReplan: (reason: string) => void;
  finishReplan: (newPlan: Plan) => void;

  // Baseline comparison
  setBaselineComparison: (comparison: BaselineComparison) => void;

  // Metrics
  updateMetrics: (metrics: Partial<PlanMetrics>) => void;
}

const defaultConfig: SimulationConfig = {
  speedMultiplier: 1,
  co2PerWh: 0.5, // g CO2 per Wh (approximate grid average)
  defaultPickupServiceTime: 15,
  defaultDropoffServiceTime: 20,
  starvationThresholdSeconds: 300, // 5 minutes
};

export const useSimulationStore = create<SimState & SimActions>()(
  immer((set) => ({
    state: 'STOPPED',
    currentTime: 0,
    config: defaultConfig,
    currentPlan: null,
    baselineComparison: null,
    replanCount: 0,
    lastReplanReason: null,

    start: () =>
      set((state) => {
        if (state.state !== 'REPLANNING') {
          state.state = 'RUNNING';
        }
      }),

    pause: () =>
      set((state) => {
        if (state.state === 'RUNNING') {
          state.state = 'PAUSED';
        }
      }),

    stop: () =>
      set((state) => {
        state.state = 'STOPPED';
      }),

    reset: () =>
      set((state) => {
        state.state = 'STOPPED';
        state.currentTime = 0;
        state.currentPlan = null;
        state.baselineComparison = null;
        state.replanCount = 0;
        state.lastReplanReason = null;
      }),

    tick: (deltaSeconds) =>
      set((state) => {
        if (state.state === 'RUNNING') {
          state.currentTime += deltaSeconds * state.config.speedMultiplier;
        }
      }),

    setTime: (time) =>
      set((state) => {
        state.currentTime = time;
      }),

    setSpeedMultiplier: (multiplier) =>
      set((state) => {
        state.config.speedMultiplier = Math.max(0.1, Math.min(100, multiplier));
      }),

    setConfig: (config) =>
      set((state) => {
        Object.assign(state.config, config);
      }),

    setPlan: (plan) =>
      set((state) => {
        state.currentPlan = plan;
      }),

    updateAgentPlan: (agentId, plan) =>
      set((state) => {
        if (state.currentPlan) {
          const index = state.currentPlan.agentPlans.findIndex(
            (p) => p.agentId === agentId
          );
          if (index >= 0) {
            state.currentPlan.agentPlans[index] = plan;
          } else {
            state.currentPlan.agentPlans.push(plan);
          }
        }
      }),

    clearPlan: () =>
      set((state) => {
        state.currentPlan = null;
      }),

    startReplan: (reason) =>
      set((state) => {
        state.state = 'REPLANNING';
        state.lastReplanReason = reason;
      }),

    finishReplan: (newPlan) =>
      set((state) => {
        state.currentPlan = newPlan;
        state.replanCount += 1;
        state.state = 'RUNNING';
      }),

    setBaselineComparison: (comparison) =>
      set((state) => {
        state.baselineComparison = comparison;
      }),

    updateMetrics: (metrics) =>
      set((state) => {
        if (state.currentPlan) {
          Object.assign(state.currentPlan.metrics, metrics);
        }
      }),
  }))
);
