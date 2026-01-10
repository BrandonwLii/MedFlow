import type { Position, Floor, GridCell, Agent } from '../types';

interface Node {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // total cost
  parent: Node | null;
}

// A* Pathfinding algorithm
export const findPath = (
  floor: Floor,
  start: Position,
  end: Position,
  agent?: Agent
): Position[] | null => {
  const { grid } = floor;
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  if (!isValidPosition(start, rows, cols) || !isValidPosition(end, rows, cols)) {
    return null;
  }

  const startCell = grid[start.y]?.[start.x];
  const endCell = grid[end.y]?.[end.x];

  if (!startCell || !endCell) return null;
  if (!isCellWalkable(endCell, agent)) return null;

  const openSet: Node[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  while (openSet.length > 0) {
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    // Check if we reached the goal
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current);
    }

    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors (4-directional)
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const neighbor of neighbors) {
      if (!isValidPosition(neighbor, rows, cols)) continue;
      if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

      const cell = grid[neighbor.y]?.[neighbor.x];
      if (!cell || !isCellWalkable(cell, agent)) continue;

      const g = current.g + 1;
      const h = heuristic(neighbor, end);
      const f = g + h;

      const existingNode = openSet.find(
        (n) => n.x === neighbor.x && n.y === neighbor.y
      );

      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openSet.push({
          x: neighbor.x,
          y: neighbor.y,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  return null; // No path found
};

const isValidPosition = (pos: Position, rows: number, cols: number): boolean => {
  return pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows;
};

const isCellWalkable = (cell: GridCell, agent?: Agent): boolean => {
  if (!cell.walkable) return false;
  if (cell.isObstacle) return false;
  if (cell.isQuarantine) return false;

  // Check access restrictions
  if (cell.isRestricted && agent) {
    const allowedProfiles = cell.restrictedAccessProfiles || [];
    if (allowedProfiles.length > 0) {
      const hasAccess = agent.accessProfiles.some((p) =>
        allowedProfiles.includes(p)
      );
      if (!hasAccess) return false;
    }
  }

  return true;
};

const heuristic = (a: Position, b: Position): number => {
  // Manhattan distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const reconstructPath = (node: Node): Position[] => {
  const path: Position[] = [];
  let current: Node | null = node;

  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }

  return path;
};

// Calculate path length in cells
export const getPathLength = (path: Position[]): number => {
  return path.length - 1;
};

// Calculate estimated travel time in seconds
export const getPathTravelTime = (path: Position[], speed: number): number => {
  return getPathLength(path) / speed;
};

// Calculate battery drain for a path
export const getPathBatteryDrain = (
  path: Position[],
  drainRate: number
): number => {
  return getPathLength(path) * drainRate;
};

// Check if agent can complete a path with current battery
export const canCompletePathWithBattery = (
  path: Position[],
  currentBattery: number,
  drainRate: number,
  minBatteryThreshold: number = 10
): boolean => {
  const drain = getPathBatteryDrain(path, drainRate);
  return currentBattery - drain >= minBatteryThreshold;
};

// Find nearest charger from a position
export const findNearestCharger = (
  floor: Floor,
  position: Position,
  chargers: { position: Position; floorId: string }[]
): { position: Position; distance: number } | null => {
  const floorChargers = chargers.filter((c) => c.floorId === floor.id);
  if (floorChargers.length === 0) return null;

  let nearest: { position: Position; distance: number } | null = null;

  for (const charger of floorChargers) {
    const path = findPath(floor, position, charger.position);
    if (path) {
      const distance = getPathLength(path);
      if (!nearest || distance < nearest.distance) {
        nearest = { position: charger.position, distance };
      }
    }
  }

  return nearest;
};

// Find nearest staging area from a position
export const findNearestStaging = (
  floor: Floor,
  position: Position,
  stagingAreas: { position: Position; floorId: string }[]
): { position: Position; distance: number } | null => {
  const floorStaging = stagingAreas.filter((s) => s.floorId === floor.id);
  if (floorStaging.length === 0) return null;

  let nearest: { position: Position; distance: number } | null = null;

  for (const staging of floorStaging) {
    const path = findPath(floor, position, staging.position);
    if (path) {
      const distance = getPathLength(path);
      if (!nearest || distance < nearest.distance) {
        nearest = { position: staging.position, distance };
      }
    }
  }

  return nearest;
};
