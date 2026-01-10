import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SystemEvent, EventType, Position } from '../types';

interface EventState {
  events: SystemEvent[];
  unacknowledgedCount: number;
}

interface EventActions {
  addEvent: (event: Omit<SystemEvent, 'id' | 'acknowledged'>) => string;
  acknowledgeEvent: (eventId: string) => void;
  acknowledgeAll: () => void;
  removeEvent: (eventId: string) => void;
  clearEvents: () => void;

  // Getters
  getEvent: (eventId: string) => SystemEvent | undefined;
  getEventsByType: (type: EventType) => SystemEvent[];
  getUnacknowledgedEvents: () => SystemEvent[];
  getRecentEvents: (count: number) => SystemEvent[];
}

let eventIdCounter = 0;

const generateEventId = (): string => {
  eventIdCounter += 1;
  return `event-${Date.now()}-${eventIdCounter}`;
};

export const useEventStore = create<EventState & EventActions>()(
  immer((set, get) => ({
    events: [],
    unacknowledgedCount: 0,

    addEvent: (event) => {
      const id = generateEventId();
      set((state) => {
        const newEvent: SystemEvent = {
          ...event,
          id,
          acknowledged: false,
        };
        state.events.unshift(newEvent); // Add to beginning for most recent first
        state.unacknowledgedCount += 1;

        // Keep only last 1000 events to prevent memory issues
        if (state.events.length > 1000) {
          state.events = state.events.slice(0, 1000);
        }
      });
      return id;
    },

    acknowledgeEvent: (eventId) =>
      set((state) => {
        const event = state.events.find((e) => e.id === eventId);
        if (event && !event.acknowledged) {
          event.acknowledged = true;
          state.unacknowledgedCount = Math.max(0, state.unacknowledgedCount - 1);
        }
      }),

    acknowledgeAll: () =>
      set((state) => {
        for (const event of state.events) {
          event.acknowledged = true;
        }
        state.unacknowledgedCount = 0;
      }),

    removeEvent: (eventId) =>
      set((state) => {
        const event = state.events.find((e) => e.id === eventId);
        if (event && !event.acknowledged) {
          state.unacknowledgedCount = Math.max(0, state.unacknowledgedCount - 1);
        }
        state.events = state.events.filter((e) => e.id !== eventId);
      }),

    clearEvents: () =>
      set((state) => {
        state.events = [];
        state.unacknowledgedCount = 0;
      }),

    getEvent: (eventId) => get().events.find((e) => e.id === eventId),

    getEventsByType: (type) => get().events.filter((e) => e.type === type),

    getUnacknowledgedEvents: () => get().events.filter((e) => !e.acknowledged),

    getRecentEvents: (count) => get().events.slice(0, count),
  }))
);

// Helper function to create common events
export const createEvent = {
  jobCreated: (
    jobId: string,
    priority: string,
    timestamp: number
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'JOB_CREATED',
    timestamp,
    summary: `New ${priority} job created`,
    relatedJobId: jobId,
  }),

  triageCreated: (
    caseId: string,
    level: number,
    timestamp: number,
    position: Position,
    floorId: string
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'TRIAGE_CREATED',
    timestamp,
    summary: `Level ${level} triage case created`,
    relatedTriageCaseId: caseId,
    highlightPosition: position,
    highlightFloorId: floorId,
  }),

  triageEscalated: (
    caseId: string,
    oldLevel: number,
    newLevel: number,
    timestamp: number
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'TRIAGE_ESCALATED',
    timestamp,
    summary: `Triage escalated from Level ${oldLevel} to Level ${newLevel}`,
    relatedTriageCaseId: caseId,
  }),

  replanCompleted: (
    reason: string,
    timestamp: number,
    impact?: { timeDelta?: number; energyDelta?: number; co2Delta?: number; lateJobs?: string[] }
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'REPLAN_COMPLETED',
    timestamp,
    summary: `Replanned: ${reason}`,
    details: impact?.lateJobs?.length
      ? `${impact.lateJobs.length} jobs may be late`
      : undefined,
    impact,
  }),

  agentFailed: (
    agentId: string,
    agentName: string,
    reason: string,
    timestamp: number,
    position: Position,
    floorId: string
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'AGENT_FAILED',
    timestamp,
    summary: `Agent ${agentName} failed: ${reason}`,
    relatedAgentId: agentId,
    highlightPosition: position,
    highlightFloorId: floorId,
  }),

  zoneBlocked: (
    timestamp: number,
    position: Position,
    floorId: string
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'ZONE_BLOCKED',
    timestamp,
    summary: 'Zone marked as blocked',
    highlightPosition: position,
    highlightFloorId: floorId,
  }),

  jobInfeasible: (
    jobId: string,
    reason: string,
    timestamp: number
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'JOB_INFEASIBLE',
    timestamp,
    summary: `Job marked infeasible: ${reason}`,
    relatedJobId: jobId,
  }),

  jobCompleted: (
    jobId: string,
    agentId: string,
    timestamp: number
  ): Omit<SystemEvent, 'id' | 'acknowledged'> => ({
    type: 'JOB_COMPLETED',
    timestamp,
    summary: `Delivery completed`,
    details: `Job ${jobId.slice(0, 8)}... delivered by agent ${agentId.slice(0, 8)}...`,
    relatedJobId: jobId,
    relatedAgentId: agentId,
  }),
};
