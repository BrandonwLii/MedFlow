import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  HospitalMap,
  Floor,
  Room,
  Connector,
  Charger,
  StoragePoint,
  StagingArea,
  GridCell,
  Position,
} from '../types';

interface MapState {
  map: HospitalMap;
  activeFloorId: string | null;
  selectedTool: MapTool;
  isLoading: boolean;
  highlightPosition: Position | null;
  highlightFloorId: string | null;
}

export type MapTool =
  | 'SELECT'
  | 'WALKABLE'
  | 'OBSTACLE'
  | 'QUARANTINE'
  | 'RESTRICTED'
  | 'CHARGER'
  | 'STORAGE'
  | 'STAGING'
  | 'CONNECTOR'
  | 'ROOM';

interface MapActions {
  // Floor management
  addFloor: (floor: Floor) => void;
  removeFloor: (floorId: string) => void;
  setActiveFloor: (floorId: string) => void;
  updateFloorImage: (floorId: string, imageUrl: string) => void;

  // Grid editing
  setCellType: (floorId: string, x: number, y: number, updates: Partial<GridCell>) => void;
  paintCells: (floorId: string, cells: Position[], updates: Partial<GridCell>) => void;

  // Special locations
  addRoom: (room: Room) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;

  addConnector: (connector: Connector) => void;
  updateConnector: (connectorId: string, updates: Partial<Connector>) => void;
  removeConnector: (connectorId: string) => void;

  addCharger: (charger: Charger) => void;
  removeCharger: (chargerId: string) => void;

  addStoragePoint: (storage: StoragePoint) => void;
  removeStoragePoint: (storageId: string) => void;

  addStagingArea: (staging: StagingArea) => void;
  removeStagingArea: (stagingId: string) => void;

  // Tool selection
  setSelectedTool: (tool: MapTool) => void;

  // Bulk operations
  setMap: (map: HospitalMap) => void;
  clearMap: () => void;

  // Utility
  getFloor: (floorId: string) => Floor | undefined;
  getCellAt: (floorId: string, x: number, y: number) => GridCell | undefined;

  // Highlight
  setHighlight: (position: Position, floorId: string) => void;
  clearHighlight: () => void;
}

const createEmptyMap = (): HospitalMap => ({
  floors: [],
  rooms: [],
  connectors: [],
  chargers: [],
  storagePoints: [],
  stagingAreas: [],
});

export const useMapStore = create<MapState & MapActions>()(
  immer((set, get) => ({
    map: createEmptyMap(),
    activeFloorId: null,
    selectedTool: 'SELECT',
    isLoading: false,
    highlightPosition: null,
    highlightFloorId: null,

    // Floor management
    addFloor: (floor) =>
      set((state) => {
        state.map.floors.push(floor);
        if (!state.activeFloorId) {
          state.activeFloorId = floor.id;
        }
      }),

    removeFloor: (floorId) =>
      set((state) => {
        state.map.floors = state.map.floors.filter((f) => f.id !== floorId);
        state.map.rooms = state.map.rooms.filter((r) => r.floorId !== floorId);
        state.map.chargers = state.map.chargers.filter((c) => c.floorId !== floorId);
        state.map.storagePoints = state.map.storagePoints.filter((s) => s.floorId !== floorId);
        state.map.stagingAreas = state.map.stagingAreas.filter((s) => s.floorId !== floorId);
        if (state.activeFloorId === floorId) {
          state.activeFloorId = state.map.floors[0]?.id || null;
        }
      }),

    setActiveFloor: (floorId) =>
      set((state) => {
        state.activeFloorId = floorId;
      }),

    updateFloorImage: (floorId, imageUrl) =>
      set((state) => {
        const floor = state.map.floors.find((f) => f.id === floorId);
        if (floor) {
          floor.imageUrl = imageUrl;
        }
      }),

    // Grid editing
    setCellType: (floorId, x, y, updates) =>
      set((state) => {
        const floor = state.map.floors.find((f) => f.id === floorId);
        if (floor && floor.grid[y] && floor.grid[y][x]) {
          Object.assign(floor.grid[y][x], updates);
        }
      }),

    paintCells: (floorId, cells, updates) =>
      set((state) => {
        const floor = state.map.floors.find((f) => f.id === floorId);
        if (floor) {
          for (const { x, y } of cells) {
            if (floor.grid[y] && floor.grid[y][x]) {
              Object.assign(floor.grid[y][x], updates);
            }
          }
        }
      }),

    // Room management
    addRoom: (room) =>
      set((state) => {
        state.map.rooms.push(room);
      }),

    updateRoom: (roomId, updates) =>
      set((state) => {
        const room = state.map.rooms.find((r) => r.id === roomId);
        if (room) {
          Object.assign(room, updates);
        }
      }),

    removeRoom: (roomId) =>
      set((state) => {
        state.map.rooms = state.map.rooms.filter((r) => r.id !== roomId);
      }),

    // Connector management
    addConnector: (connector) =>
      set((state) => {
        state.map.connectors.push(connector);
      }),

    updateConnector: (connectorId, updates) =>
      set((state) => {
        const connector = state.map.connectors.find((c) => c.id === connectorId);
        if (connector) {
          Object.assign(connector, updates);
        }
      }),

    removeConnector: (connectorId) =>
      set((state) => {
        state.map.connectors = state.map.connectors.filter((c) => c.id !== connectorId);
      }),

    // Charger management
    addCharger: (charger) =>
      set((state) => {
        state.map.chargers.push(charger);
      }),

    removeCharger: (chargerId) =>
      set((state) => {
        state.map.chargers = state.map.chargers.filter((c) => c.id !== chargerId);
      }),

    // Storage point management
    addStoragePoint: (storage) =>
      set((state) => {
        state.map.storagePoints.push(storage);
      }),

    removeStoragePoint: (storageId) =>
      set((state) => {
        state.map.storagePoints = state.map.storagePoints.filter((s) => s.id !== storageId);
      }),

    // Staging area management
    addStagingArea: (staging) =>
      set((state) => {
        state.map.stagingAreas.push(staging);
      }),

    removeStagingArea: (stagingId) =>
      set((state) => {
        state.map.stagingAreas = state.map.stagingAreas.filter((s) => s.id !== stagingId);
      }),

    // Tool selection
    setSelectedTool: (tool) =>
      set((state) => {
        state.selectedTool = tool;
      }),

    // Bulk operations
    setMap: (map) =>
      set((state) => {
        state.map = map;
        state.activeFloorId = map.floors[0]?.id || null;
      }),

    clearMap: () =>
      set((state) => {
        state.map = createEmptyMap();
        state.activeFloorId = null;
      }),

    // Utility functions (non-mutating)
    getFloor: (floorId) => get().map.floors.find((f) => f.id === floorId),

    getCellAt: (floorId, x, y) => {
      const floor = get().map.floors.find((f) => f.id === floorId);
      return floor?.grid[y]?.[x];
    },

    // Highlight
    setHighlight: (position, floorId) =>
      set((state) => {
        state.highlightPosition = position;
        state.highlightFloorId = floorId;
        state.activeFloorId = floorId;
      }),

    clearHighlight: () =>
      set((state) => {
        state.highlightPosition = null;
        state.highlightFloorId = null;
      }),
  }))
);
