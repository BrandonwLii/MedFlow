import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Agent, AgentType, AgentStatus, Position } from '../types';

interface AgentState {
  agents: Agent[];
}

interface AgentActions {
  addAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;

  // Position & status
  setAgentPosition: (agentId: string, position: Position, floorId: string) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;

  // Battery
  drainBattery: (agentId: string, amount: number) => void;
  chargeBattery: (agentId: string, amount: number) => void;

  // Inventory
  addToInventory: (agentId: string, itemType: string, quantity: number) => void;
  removeFromInventory: (agentId: string, itemType: string, quantity: number) => void;

  // Job assignment
  assignJob: (agentId: string, jobId: string) => void;
  clearJob: (agentId: string) => void;

  // Payload
  setPayload: (agentId: string, payload: number) => void;

  // Pool management
  setAgentPool: (agentId: string, pool: 'URGENT' | 'NON_URGENT') => void;

  // Bulk operations
  setAgents: (agents: Agent[]) => void;
  clearAgents: () => void;

  // Getters
  getAgent: (agentId: string) => Agent | undefined;
  getAvailableAgents: () => Agent[];
  getAgentsByPool: (pool: 'URGENT' | 'NON_URGENT') => Agent[];
  getAgentsByFloor: (floorId: string) => Agent[];
}

const createDefaultAgent = (
  id: string,
  name: string,
  type: AgentType,
  position: Position,
  floorId: string
): Agent => ({
  id,
  name,
  type,
  position,
  floorId,
  speed: 1, // cells per second
  battery: 100,
  maxBattery: 100,
  batteryDrainRate: 0.2, // % per cell
  payloadLimit: 50, // kg
  currentPayload: 0,
  accessProfiles: ['GENERAL'],
  inventorySlots: [],
  status: 'IDLE',
  pool: 'NON_URGENT',
});

export const useAgentStore = create<AgentState & AgentActions>()(
  immer((set, get) => ({
    agents: [],

    addAgent: (agent) =>
      set((state) => {
        state.agents.push(agent);
      }),

    removeAgent: (agentId) =>
      set((state) => {
        state.agents = state.agents.filter((a) => a.id !== agentId);
      }),

    updateAgent: (agentId, updates) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          Object.assign(agent, updates);
        }
      }),

    setAgentPosition: (agentId, position, floorId) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.position = position;
          agent.floorId = floorId;
        }
      }),

    setAgentStatus: (agentId, status) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.status = status;
        }
      }),

    drainBattery: (agentId, amount) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.battery = Math.max(0, agent.battery - amount);
        }
      }),

    chargeBattery: (agentId, amount) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.battery = Math.min(agent.maxBattery, agent.battery + amount);
        }
      }),

    addToInventory: (agentId, itemType, quantity) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          const slot = agent.inventorySlots.find((s) => s.itemType === itemType);
          if (slot) {
            slot.quantity = Math.min(slot.maxQuantity, slot.quantity + quantity);
          } else {
            agent.inventorySlots.push({
              itemType,
              quantity,
              maxQuantity: quantity * 2,
            });
          }
        }
      }),

    removeFromInventory: (agentId, itemType, quantity) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          const slot = agent.inventorySlots.find((s) => s.itemType === itemType);
          if (slot) {
            slot.quantity = Math.max(0, slot.quantity - quantity);
            if (slot.quantity === 0) {
              agent.inventorySlots = agent.inventorySlots.filter(
                (s) => s.itemType !== itemType
              );
            }
          }
        }
      }),

    assignJob: (agentId, jobId) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.currentJobId = jobId;
          agent.status = 'MOVING';
        }
      }),

    clearJob: (agentId) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.currentJobId = undefined;
          agent.currentPayload = 0; // Reset payload when job cleared
          agent.status = 'IDLE';
        }
      }),

    setPayload: (agentId, payload) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.currentPayload = payload;
        }
      }),

    setAgentPool: (agentId, pool) =>
      set((state) => {
        const agent = state.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.pool = pool;
        }
      }),

    setAgents: (agents) =>
      set((state) => {
        state.agents = agents;
      }),

    clearAgents: () =>
      set((state) => {
        state.agents = [];
      }),

    getAgent: (agentId) => get().agents.find((a) => a.id === agentId),

    getAvailableAgents: () =>
      get().agents.filter(
        (a) => a.status === 'IDLE' && !a.currentJobId && a.battery > 10
      ),

    getAgentsByPool: (pool) => get().agents.filter((a) => a.pool === pool),

    getAgentsByFloor: (floorId) => get().agents.filter((a) => a.floorId === floorId),
  }))
);

export { createDefaultAgent };
