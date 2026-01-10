import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TriageCase,
  TriageLevel,
} from '../types';

interface TriageState {
  cases: TriageCase[];
}

interface TriageActions {
  addCase: (triageCase: TriageCase) => void;
  removeCase: (caseId: string) => void;
  updateCase: (caseId: string, updates: Partial<TriageCase>) => void;

  // Escalation
  escalate: (caseId: string) => TriageLevel;
  deescalate: (caseId: string) => TriageLevel;
  setLevel: (caseId: string, level: TriageLevel) => void;

  // Status
  resolveCase: (caseId: string) => void;
  reactivateCase: (caseId: string) => void;

  // Job linking
  linkJob: (caseId: string, jobId: string) => void;
  unlinkJob: (caseId: string, jobId: string) => void;

  // Bulk operations
  setCases: (cases: TriageCase[]) => void;
  clearCases: () => void;

  // Getters
  getCase: (caseId: string) => TriageCase | undefined;
  getActiveCases: () => TriageCase[];
  getCasesByLevel: (level: TriageLevel) => TriageCase[];
  getCasesByFloor: (floorId: string) => TriageCase[];
}

export const useTriageStore = create<TriageState & TriageActions>()(
  immer((set, get) => ({
    cases: [],

    addCase: (triageCase) =>
      set((state) => {
        state.cases.push(triageCase);
      }),

    removeCase: (caseId) =>
      set((state) => {
        state.cases = state.cases.filter((c) => c.id !== caseId);
      }),

    updateCase: (caseId, updates) =>
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase) {
          Object.assign(triageCase, updates);
        }
      }),

    escalate: (caseId) => {
      let newLevel: TriageLevel = 1;
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase && triageCase.level > 1) {
          triageCase.level = (triageCase.level - 1) as TriageLevel;
          newLevel = triageCase.level;
        }
      });
      return newLevel;
    },

    deescalate: (caseId) => {
      let newLevel: TriageLevel = 5;
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase && triageCase.level < 5) {
          triageCase.level = (triageCase.level + 1) as TriageLevel;
          newLevel = triageCase.level;
        }
      });
      return newLevel;
    },

    setLevel: (caseId, level) =>
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase) {
          triageCase.level = level;
        }
      }),

    resolveCase: (caseId) =>
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase) {
          triageCase.status = 'RESOLVED';
        }
      }),

    reactivateCase: (caseId) =>
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase) {
          triageCase.status = 'ACTIVE';
        }
      }),

    linkJob: (caseId, jobId) =>
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase && !triageCase.linkedJobIds.includes(jobId)) {
          triageCase.linkedJobIds.push(jobId);
        }
      }),

    unlinkJob: (caseId, jobId) =>
      set((state) => {
        const triageCase = state.cases.find((c) => c.id === caseId);
        if (triageCase) {
          triageCase.linkedJobIds = triageCase.linkedJobIds.filter((id) => id !== jobId);
        }
      }),

    setCases: (cases) =>
      set((state) => {
        state.cases = cases;
      }),

    clearCases: () =>
      set((state) => {
        state.cases = [];
      }),

    getCase: (caseId) => get().cases.find((c) => c.id === caseId),

    getActiveCases: () => get().cases.filter((c) => c.status === 'ACTIVE'),

    getCasesByLevel: (level) => get().cases.filter((c) => c.level === level),

    getCasesByFloor: (floorId) =>
      get().cases.filter((c) => c.location.floorId === floorId),
  }))
);
