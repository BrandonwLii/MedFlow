import type {
  HospitalMap,
  Floor,
  Agent,
  Job,
  TriageCase,
  GridCell,
  Room,
  Charger,
  StoragePoint,
  StagingArea,
  Scenario,
  SimulationConfig,
} from '../types';
import { generateId } from './index';

// Create a simple mock floor with walkable corridors
const createMockFloor = (): Floor => {
  const id = generateId('floor');
  const width = 800;
  const height = 600;
  const gridSize = 20;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  const grid: GridCell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < cols; x++) {
      // Create corridors (walkable areas)
      const isMainCorridor = (y >= 12 && y <= 17) || (x >= 18 && x <= 22);
      const isRoom = (x >= 2 && x <= 8 && y >= 2 && y <= 10) ||
                     (x >= 12 && x <= 16 && y >= 2 && y <= 10) ||
                     (x >= 26 && x <= 36 && y >= 2 && y <= 10) ||
                     (x >= 2 && x <= 8 && y >= 20 && y <= 27) ||
                     (x >= 12 && x <= 16 && y >= 20 && y <= 27) ||
                     (x >= 26 && x <= 36 && y >= 20 && y <= 27);
      const isRoomEntrance = ((y === 12 || y === 17) && (x === 5 || x === 14 || x === 31)) ||
                             ((x === 18 || x === 22) && (y === 5 || y === 24));

      row.push({
        x,
        y,
        walkable: isMainCorridor || isRoomEntrance,
        isObstacle: !isMainCorridor && !isRoomEntrance && !isRoom,
        isQuarantine: false,
        isRestricted: false,
        isCharger: false,
        isStorage: false,
        isStaging: false,
        isConnector: false,
        floorId: id,
        roomId: isRoom ? `room-${Math.floor(x / 10)}-${Math.floor(y / 10)}` : undefined,
      });
    }
    grid.push(row);
  }

  // Mark specific cells
  // Chargers
  grid[15][2].isCharger = true;
  grid[15][2].walkable = true;
  grid[15][37].isCharger = true;
  grid[15][37].walkable = true;

  // Storage points
  grid[5][20].isStorage = true;
  grid[5][20].walkable = true;

  // Staging areas
  grid[14][10].isStaging = true;
  grid[14][10].walkable = true;
  grid[16][30].isStaging = true;
  grid[16][30].walkable = true;

  return {
    id,
    name: 'Floor 1',
    width,
    height,
    gridSize,
    grid,
  };
};

const createMockRooms = (floorId: string): Room[] => [
  {
    id: generateId('room'),
    name: 'ICU Bay 1',
    type: 'ICU',
    floorId,
    cells: [{ x: 5, y: 5 }],
    serviceCapacity: 1,
  },
  {
    id: generateId('room'),
    name: 'OR Suite A',
    type: 'OR',
    floorId,
    cells: [{ x: 14, y: 5 }],
    serviceCapacity: 1,
  },
  {
    id: generateId('room'),
    name: 'Supply Room',
    type: 'SUPPLY',
    floorId,
    cells: [{ x: 20, y: 5 }],
    serviceCapacity: 2,
  },
  {
    id: generateId('room'),
    name: 'Ward A',
    type: 'WARD',
    floorId,
    cells: [{ x: 31, y: 5 }],
    serviceCapacity: 1,
  },
  {
    id: generateId('room'),
    name: 'Ward B',
    type: 'WARD',
    floorId,
    cells: [{ x: 5, y: 24 }],
    serviceCapacity: 1,
  },
  {
    id: generateId('room'),
    name: 'Pharmacy',
    type: 'PHARMACY',
    floorId,
    cells: [{ x: 14, y: 24 }],
    serviceCapacity: 1,
  },
];

const createMockChargers = (floorId: string): Charger[] => [
  {
    id: generateId('charger'),
    position: { x: 2, y: 15 },
    floorId,
    chargeRate: 1,
    capacity: 1,
  },
  {
    id: generateId('charger'),
    position: { x: 37, y: 15 },
    floorId,
    chargeRate: 1,
    capacity: 1,
  },
];

const createMockStoragePoints = (floorId: string): StoragePoint[] => [
  {
    id: generateId('storage'),
    name: 'Central Supply',
    position: { x: 20, y: 5 },
    floorId,
    serviceTime: 30,
    capacity: 2,
    availableItems: [
      { itemType: 'Masks', quantity: 100 },
      { itemType: 'IV Fluids', quantity: 50 },
      { itemType: 'Surgical Tools', quantity: 20 },
      { itemType: 'Medications', quantity: 200 },
    ],
  },
];

const createMockStagingAreas = (floorId: string): StagingArea[] => [
  {
    id: generateId('staging'),
    position: { x: 10, y: 14 },
    floorId,
    capacity: 3,
  },
  {
    id: generateId('staging'),
    position: { x: 30, y: 16 },
    floorId,
    capacity: 3,
  },
];

const createMockAgents = (floorId: string): Agent[] => [
  {
    id: generateId('agent'),
    name: 'Cart Alpha',
    type: 'CART',
    position: { x: 10, y: 15 },
    floorId,
    speed: 1,
    battery: 100,
    maxBattery: 100,
    batteryDrainRate: 0.2,
    payloadLimit: 50,
    currentPayload: 0,
    accessProfiles: ['GENERAL', 'WARD'],
    inventorySlots: [
      { itemType: 'Masks', quantity: 20, maxQuantity: 50 },
      { itemType: 'IV Fluids', quantity: 5, maxQuantity: 10 },
    ],
    status: 'IDLE',
    pool: 'NON_URGENT',
  },
  {
    id: generateId('agent'),
    name: 'Cart Beta',
    type: 'CART',
    position: { x: 30, y: 15 },
    floorId,
    speed: 1,
    battery: 85,
    maxBattery: 100,
    batteryDrainRate: 0.2,
    payloadLimit: 50,
    currentPayload: 0,
    accessProfiles: ['GENERAL', 'WARD', 'ICU'],
    inventorySlots: [],
    status: 'IDLE',
    pool: 'NON_URGENT',
  },
  {
    id: generateId('agent'),
    name: 'Cart Gamma',
    type: 'CART',
    position: { x: 20, y: 14 },
    floorId,
    speed: 1,
    battery: 95,
    maxBattery: 100,
    batteryDrainRate: 0.2,
    payloadLimit: 50,
    currentPayload: 0,
    accessProfiles: ['GENERAL', 'ICU', 'OR'],
    inventorySlots: [],
    status: 'IDLE',
    pool: 'URGENT',
  },
];

const createMockJobs = (floorId: string): Job[] => [
  {
    id: generateId('job'),
    pickup: { position: { x: 20, y: 5 }, floorId },
    dropoff: { position: { x: 5, y: 5 }, floorId },
    item: { type: 'IV Fluids', quantity: 2, weight: 2 },
    priority: 'URGENT',
    deadline: 300,
    createdAt: 0,
    state: 'QUEUED',
    pickupServiceTime: 15,
    dropoffServiceTime: 20,
  },
  {
    id: generateId('job'),
    pickup: { position: { x: 20, y: 5 }, floorId },
    dropoff: { position: { x: 31, y: 5 }, floorId },
    item: { type: 'Masks', quantity: 10, weight: 0.5 },
    priority: 'NON_URGENT',
    deadline: 600,
    createdAt: 0,
    state: 'QUEUED',
    pickupServiceTime: 15,
    dropoffServiceTime: 20,
  },
  {
    id: generateId('job'),
    pickup: { position: { x: 14, y: 24 }, floorId },
    dropoff: { position: { x: 14, y: 5 }, floorId },
    item: { type: 'Medications', quantity: 5, weight: 1 },
    priority: 'EMERGENCY',
    deadline: 180,
    createdAt: 0,
    state: 'QUEUED',
    pickupServiceTime: 15,
    dropoffServiceTime: 20,
  },
  {
    id: generateId('job'),
    pickup: { position: { x: 20, y: 5 }, floorId },
    dropoff: { position: { x: 5, y: 24 }, floorId },
    item: { type: 'Surgical Tools', quantity: 1, weight: 3 },
    priority: 'SEMI_URGENT',
    deadline: 450,
    createdAt: 0,
    state: 'QUEUED',
    pickupServiceTime: 15,
    dropoffServiceTime: 20,
  },
];

const createMockTriageCases = (floorId: string): TriageCase[] => [
  {
    id: generateId('triage'),
    level: 2,
    location: { position: { x: 5, y: 5 }, floorId },
    bundle: 'TRAUMA',
    linkedJobIds: [],
    status: 'ACTIVE',
    createdAt: 0,
    notes: 'Patient in ICU Bay 1 requires immediate trauma supplies',
  },
];

export const generateMockScenario = (): Scenario => {
  const floor = createMockFloor();

  const map: HospitalMap = {
    floors: [floor],
    rooms: createMockRooms(floor.id),
    connectors: [],
    chargers: createMockChargers(floor.id),
    storagePoints: createMockStoragePoints(floor.id),
    stagingAreas: createMockStagingAreas(floor.id),
  };

  const config: SimulationConfig = {
    speedMultiplier: 1,
    co2PerWh: 0.5,
    defaultPickupServiceTime: 15,
    defaultDropoffServiceTime: 20,
    starvationThresholdSeconds: 300,
  };

  return {
    version: '1.0.0',
    name: 'Demo Scenario',
    map,
    agents: createMockAgents(floor.id),
    jobs: createMockJobs(floor.id),
    triageCases: createMockTriageCases(floor.id),
    config,
  };
};
