import type { Floor, GridCell, Position } from '../types';

// Generate unique IDs
let idCounter = 0;
export const generateId = (prefix: string = 'id'): string => {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
};

// Create an empty grid for a floor
export const createEmptyGrid = (
  width: number,
  height: number,
  gridSize: number,
  floorId: string
): GridCell[][] => {
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  const grid: GridCell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push({
        x,
        y,
        walkable: false,
        isObstacle: false,
        isQuarantine: false,
        isRestricted: false,
        isCharger: false,
        isStorage: false,
        isStaging: false,
        isConnector: false,
        floorId,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Create a new floor from an image
export const createFloorFromImage = (
  name: string,
  imageUrl: string,
  width: number,
  height: number,
  gridSize: number = 20
): Floor => {
  const id = generateId('floor');
  return {
    id,
    name,
    imageUrl,
    width,
    height,
    gridSize,
    grid: createEmptyGrid(width, height, gridSize, id),
  };
};

// Convert pixel position to grid coordinates
export const pixelToGrid = (
  pixelX: number,
  pixelY: number,
  gridSize: number
): Position => ({
  x: Math.floor(pixelX / gridSize),
  y: Math.floor(pixelY / gridSize),
});

// Convert grid coordinates to pixel position (center of cell)
export const gridToPixel = (
  gridX: number,
  gridY: number,
  gridSize: number
): Position => ({
  x: gridX * gridSize + gridSize / 2,
  y: gridY * gridSize + gridSize / 2,
});

// Calculate Manhattan distance between two positions
export const manhattanDistance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Calculate Euclidean distance between two positions
export const euclideanDistance = (a: Position, b: Position): number =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

// Format time in seconds to human-readable string
export const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
};

// Format energy in Wh
export const formatEnergy = (wh: number): string => {
  if (wh < 1000) {
    return `${wh.toFixed(1)} Wh`;
  } else {
    return `${(wh / 1000).toFixed(2)} kWh`;
  }
};

// Format CO2 in grams
export const formatCO2 = (grams: number): string => {
  if (grams < 1000) {
    return `${grams.toFixed(1)} g`;
  } else {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
};

// Clamp a number between min and max
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// Debounce function
export const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Priority tier colors
export const PRIORITY_COLORS: Record<string, string> = {
  IMMEDIATE: '#ef4444', // red-500
  EMERGENCY: '#f97316', // orange-500
  URGENT: '#eab308', // yellow-500
  SEMI_URGENT: '#22c55e', // green-500
  NON_URGENT: '#3b82f6', // blue-500
};

// Job state colors
export const JOB_STATE_COLORS: Record<string, string> = {
  QUEUED: '#6b7280', // gray-500
  ASSIGNED: '#8b5cf6', // violet-500
  IN_PROGRESS: '#3b82f6', // blue-500
  PAUSED: '#f59e0b', // amber-500
  DELAYED: '#ef4444', // red-500
  DELIVERED: '#22c55e', // green-500
  CANCELLED: '#9ca3af', // gray-400
  INFEASIBLE: '#dc2626', // red-600
};

// Agent status colors
export const AGENT_STATUS_COLORS: Record<string, string> = {
  IDLE: '#22c55e', // green-500
  MOVING: '#3b82f6', // blue-500
  PICKING_UP: '#8b5cf6', // violet-500
  DROPPING_OFF: '#8b5cf6', // violet-500
  CHARGING: '#f59e0b', // amber-500
  WAITING: '#6b7280', // gray-500
  FAILED: '#ef4444', // red-500
};
