import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Job, JobState, PriorityTier } from '../types';

interface JobState_ {
  jobs: Job[];
}

interface JobActions {
  addJob: (job: Job) => void;
  removeJob: (jobId: string) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;

  // State transitions
  setJobState: (jobId: string, state: JobState, reason?: string) => void;
  assignAgent: (jobId: string, agentId: string) => void;
  unassignAgent: (jobId: string) => void;

  // Priority management
  setPriority: (jobId: string, priority: PriorityTier) => void;
  setDeadline: (jobId: string, deadline: number) => void;

  // Progress tracking
  markPickedUp: (jobId: string, time: number) => void;
  markDelivered: (jobId: string, time: number) => void;

  // ETA updates
  updateETAs: (jobId: string, startTime: number, deliveryTime: number, isLate: boolean) => void;

  // Bulk operations
  setJobs: (jobs: Job[]) => void;
  clearJobs: () => void;

  // Getters
  getJob: (jobId: string) => Job | undefined;
  getJobsByState: (state: JobState) => Job[];
  getJobsByPriority: (priority: PriorityTier) => Job[];
  getQueuedJobs: () => Job[];
  getSortedQueue: () => Job[];
  getJobsByAgent: (agentId: string) => Job[];
  getJobsByTriage: (triageCaseId: string) => Job[];
}

const PRIORITY_ORDER_MAP: Record<PriorityTier, number> = {
  'IMMEDIATE': 0,
  'EMERGENCY': 1,
  'URGENT': 2,
  'SEMI_URGENT': 3,
  'NON_URGENT': 4,
};

export const useJobStore = create<JobState_ & JobActions>()(
  immer((set, get) => ({
    jobs: [],

    addJob: (job) =>
      set((state) => {
        state.jobs.push(job);
      }),

    removeJob: (jobId) =>
      set((state) => {
        state.jobs = state.jobs.filter((j) => j.id !== jobId);
      }),

    updateJob: (jobId, updates) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          Object.assign(job, updates);
        }
      }),

    setJobState: (jobId, newState, reason) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          job.state = newState;
          if (newState === 'DELAYED') {
            job.delayReason = reason;
          } else if (newState === 'INFEASIBLE') {
            job.infeasibleReason = reason;
          }
        }
      }),

    assignAgent: (jobId, agentId) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          job.assignedAgentId = agentId;
          job.state = 'ASSIGNED';
        }
      }),

    unassignAgent: (jobId) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          job.assignedAgentId = undefined;
          job.state = 'QUEUED';
        }
      }),

    setPriority: (jobId, priority) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          job.priority = priority;
        }
      }),

    setDeadline: (jobId, deadline) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          job.deadline = deadline;
        }
      }),

    markPickedUp: (jobId, time) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          if (!job.progress) {
            job.progress = { pickedUp: false };
          }
          job.progress.pickedUp = true;
          job.progress.pickupTime = time;
          job.state = 'IN_PROGRESS';
        }
      }),

    markDelivered: (jobId, time) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          if (!job.progress) {
            job.progress = { pickedUp: true };
          }
          job.progress.deliveredTime = time;
          job.state = 'DELIVERED';
        }
      }),

    updateETAs: (jobId, startTime, deliveryTime, isLate) =>
      set((state) => {
        const job = state.jobs.find((j) => j.id === jobId);
        if (job) {
          job.estimatedStartTime = startTime;
          job.estimatedDeliveryTime = deliveryTime;
          job.isLikelyLate = isLate;
        }
      }),

    setJobs: (jobs) =>
      set((state) => {
        state.jobs = jobs;
      }),

    clearJobs: () =>
      set((state) => {
        state.jobs = [];
      }),

    getJob: (jobId) => get().jobs.find((j) => j.id === jobId),

    getJobsByState: (state) => get().jobs.filter((j) => j.state === state),

    getJobsByPriority: (priority) => get().jobs.filter((j) => j.priority === priority),

    getQueuedJobs: () => get().jobs.filter((j) => j.state === 'QUEUED'),

    getSortedQueue: () => {
      const jobs = get().jobs.filter(
        (j) => j.state === 'QUEUED' || j.state === 'ASSIGNED'
      );

      return jobs.sort((a, b) => {
        // 1. Priority tier (lower is more urgent)
        const priorityDiff =
          PRIORITY_ORDER_MAP[a.priority] - PRIORITY_ORDER_MAP[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // 2. Deadline (sooner is higher priority)
        const deadlineDiff = a.deadline - b.deadline;
        if (deadlineDiff !== 0) return deadlineDiff;

        // 3. Age (older jobs come first - starvation protection)
        return a.createdAt - b.createdAt;
      });
    },

    getJobsByAgent: (agentId) =>
      get().jobs.filter((j) => j.assignedAgentId === agentId),

    getJobsByTriage: (triageCaseId) =>
      get().jobs.filter((j) => j.triageCaseId === triageCaseId),
  }))
);
