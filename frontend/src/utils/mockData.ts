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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createEmptyGrid = (
  cols: number,
  rows: number,
  floorId: string
): GridCell[][] => {
  const grid: GridCell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push({
        x,
        y,
        walkable: false,
        isObstacle: true,
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

const makeWalkable = (grid: GridCell[][], y: number, x: number) => {
  if (grid[y] && grid[y][x]) {
    grid[y][x].walkable = true;
    grid[y][x].isObstacle = false;
  }
};

// Safe grid cell modifier
const setCell = (grid: GridCell[][], y: number, x: number, props: Partial<GridCell>) => {
  if (grid[y] && grid[y][x]) {
    Object.assign(grid[y][x], props);
  }
};

const makeRoom = (
  grid: GridCell[][],
  startY: number,
  startX: number,
  endY: number,
  endX: number,
  roomId: string
) => {
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (grid[y] && grid[y][x]) {
        grid[y][x].isObstacle = false;
        grid[y][x].roomId = roomId;
      }
    }
  }
};

const makeCorridor = (
  grid: GridCell[][],
  startY: number,
  startX: number,
  endY: number,
  endX: number
) => {
  for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
      makeWalkable(grid, y, x);
    }
  }
};

// ============================================================================
// SCENARIO 1: HOSPITAL RUSH HOUR (Original)
// ============================================================================

const createRushHourFloor = (): Floor => {
  const id = generateId('floor');
  const width = 800;
  const height = 600;
  const gridSize = 20;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  const grid = createEmptyGrid(cols, rows, id);

  // Main horizontal corridor (y: 12-17)
  makeCorridor(grid, 12, 0, 17, cols - 1);

  // Main vertical corridor (x: 18-22)
  makeCorridor(grid, 0, 18, rows - 1, 22);

  // Rooms (visual only, not walkable inside)
  makeRoom(grid, 2, 2, 10, 8, 'icu-bay-1');
  makeRoom(grid, 2, 12, 10, 16, 'or-suite-a');
  makeRoom(grid, 2, 26, 10, 36, 'ward-a');
  makeRoom(grid, 20, 2, 27, 8, 'ward-b');
  makeRoom(grid, 20, 12, 27, 16, 'pharmacy');

  // Room service points
  makeWalkable(grid, 5, 5);   // ICU Bay 1
  makeWalkable(grid, 5, 14);  // OR Suite A
  makeWalkable(grid, 5, 20);  // Supply Room
  makeWalkable(grid, 5, 31);  // Ward A
  makeWalkable(grid, 24, 5);  // Ward B
  makeWalkable(grid, 24, 14); // Pharmacy

  // Paths from corridor to rooms
  for (let y = 6; y < 12; y++) makeWalkable(grid, y, 5);
  for (let y = 6; y < 12; y++) makeWalkable(grid, y, 14);
  for (let y = 6; y < 12; y++) makeWalkable(grid, y, 20);
  for (let y = 6; y < 12; y++) makeWalkable(grid, y, 31);
  for (let y = 18; y < 24; y++) makeWalkable(grid, y, 5);
  for (let y = 18; y < 24; y++) makeWalkable(grid, y, 14);

  // Chargers
  makeWalkable(grid, 15, 2);
  setCell(grid, 15, 2, { isCharger: true });
  makeWalkable(grid, 15, 37);
  setCell(grid, 15, 37, { isCharger: true });

  // Storage
  setCell(grid, 5, 20, { isStorage: true });

  // Staging
  makeWalkable(grid, 14, 10);
  setCell(grid, 14, 10, { isStaging: true });
  makeWalkable(grid, 16, 30);
  setCell(grid, 16, 30, { isStaging: true });

  return { id, name: 'Floor 1', width, height, gridSize, grid };
};

const createRushHourScenario = (): Scenario => {
  const floor = createRushHourFloor();

  const rooms: Room[] = [
    { id: generateId('room'), name: 'ICU Bay 1', type: 'ICU', floorId: floor.id, cells: [{ x: 5, y: 5 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'OR Suite A', type: 'OR', floorId: floor.id, cells: [{ x: 14, y: 5 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Supply Room', type: 'SUPPLY', floorId: floor.id, cells: [{ x: 20, y: 5 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Ward A', type: 'WARD', floorId: floor.id, cells: [{ x: 31, y: 5 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Ward B', type: 'WARD', floorId: floor.id, cells: [{ x: 5, y: 24 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Pharmacy', type: 'PHARMACY', floorId: floor.id, cells: [{ x: 14, y: 24 }], serviceCapacity: 1 },
  ];

  const agents: Agent[] = [
    { id: generateId('agent'), name: 'Cart Alpha', type: 'CART', position: { x: 10, y: 15 }, floorId: floor.id, speed: 1, battery: 100, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'Cart Beta', type: 'CART', position: { x: 30, y: 15 }, floorId: floor.id, speed: 1, battery: 85, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'Cart Gamma', type: 'CART', position: { x: 20, y: 14 }, floorId: floor.id, speed: 1.2, battery: 95, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'OR'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'Cart Delta', type: 'CART', position: { x: 15, y: 13 }, floorId: floor.id, speed: 1, battery: 72, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 75, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD', 'PHARMACY'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'Cart Epsilon', type: 'CART', position: { x: 25, y: 16 }, floorId: floor.id, speed: 1.5, battery: 100, maxBattery: 100, batteryDrainRate: 0.3, payloadLimit: 30, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'OR', 'EMERGENCY'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'Cart Zeta', type: 'CART', position: { x: 18, y: 17 }, floorId: floor.id, speed: 0.8, battery: 90, maxBattery: 100, batteryDrainRate: 0.15, payloadLimit: 100, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD', 'SUPPLY'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
  ];

  const jobs: Job[] = [
    { id: generateId('job'), pickup: { position: { x: 14, y: 24 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 5 }, floorId: floor.id }, item: { type: 'Medications', quantity: 5, weight: 1 }, priority: 'EMERGENCY', deadline: 180, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 5, y: 5 }, floorId: floor.id }, item: { type: 'Blood Products', quantity: 2, weight: 1.5 }, priority: 'IMMEDIATE', deadline: 120, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 5, y: 5 }, floorId: floor.id }, item: { type: 'IV Fluids', quantity: 4, weight: 4 }, priority: 'URGENT', deadline: 300, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 5 }, floorId: floor.id }, item: { type: 'Surgical Kit', quantity: 1, weight: 5 }, priority: 'URGENT', deadline: 240, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 5, y: 24 }, floorId: floor.id }, item: { type: 'Surgical Tools', quantity: 1, weight: 3 }, priority: 'SEMI_URGENT', deadline: 450, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 31, y: 5 }, floorId: floor.id }, item: { type: 'Medical Equipment', quantity: 2, weight: 8 }, priority: 'SEMI_URGENT', deadline: 500, createdAt: 0, state: 'QUEUED', pickupServiceTime: 25, dropoffServiceTime: 30 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 31, y: 5 }, floorId: floor.id }, item: { type: 'Masks', quantity: 50, weight: 2 }, priority: 'NON_URGENT', deadline: 600, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 5, y: 24 }, floorId: floor.id }, item: { type: 'Linens', quantity: 20, weight: 10 }, priority: 'NON_URGENT', deadline: 900, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 24 }, floorId: floor.id }, item: { type: 'PPE Supplies', quantity: 30, weight: 5 }, priority: 'NON_URGENT', deadline: 720, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 5, y: 5 }, floorId: floor.id }, item: { type: 'Crash Cart Supplies', quantity: 1, weight: 15 }, priority: 'EMERGENCY', deadline: 150, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
  ];

  const triageCases: TriageCase[] = [
    { id: generateId('triage'), level: 1, location: { position: { x: 5, y: 5 }, floorId: floor.id }, bundle: 'TRAUMA', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'Critical trauma patient in ICU Bay 1' },
    { id: generateId('triage'), level: 2, location: { position: { x: 14, y: 5 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'Emergency surgery prep in OR Suite A' },
    { id: generateId('triage'), level: 3, location: { position: { x: 31, y: 5 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'Ward A restocking' },
    { id: generateId('triage'), level: 4, location: { position: { x: 5, y: 24 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'PENDING', createdAt: 0, notes: 'Ward B scheduled supply run' },
  ];

  return {
    version: '1.0.0',
    name: 'Hospital Rush Hour',
    map: {
      floors: [floor],
      rooms,
      connectors: [],
      chargers: [
        { id: generateId('charger'), position: { x: 2, y: 15 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
        { id: generateId('charger'), position: { x: 37, y: 15 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
      ],
      storagePoints: [
        { id: generateId('storage'), name: 'Central Supply', position: { x: 20, y: 5 }, floorId: floor.id, serviceTime: 30, capacity: 2, availableItems: [{ itemType: 'Masks', quantity: 100 }, { itemType: 'IV Fluids', quantity: 50 }] },
      ],
      stagingAreas: [
        { id: generateId('staging'), position: { x: 10, y: 14 }, floorId: floor.id, capacity: 3 },
        { id: generateId('staging'), position: { x: 30, y: 16 }, floorId: floor.id, capacity: 3 },
      ],
    },
    agents,
    jobs,
    triageCases,
    config: { speedMultiplier: 1, co2PerWh: 0.5, defaultPickupServiceTime: 15, defaultDropoffServiceTime: 20, starvationThresholdSeconds: 300 },
  };
};

// ============================================================================
// SCENARIO 2: EMERGENCY DEPARTMENT
// ============================================================================

const createEmergencyDeptFloor = (): Floor => {
  const id = generateId('floor');
  const width = 1000;
  const height = 700;
  const gridSize = 20;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  const grid = createEmptyGrid(cols, rows, id);

  // Main entrance corridor (bottom, horizontal)
  makeCorridor(grid, 30, 5, 33, 45);

  // Central hub (large open area)
  makeCorridor(grid, 14, 18, 25, 32);

  // Triage corridor (left side, vertical)
  makeCorridor(grid, 5, 5, 28, 10);

  // Trauma bay corridor (top, horizontal)
  makeCorridor(grid, 5, 10, 8, 40);

  // Resuscitation corridor (right side)
  makeCorridor(grid, 10, 38, 25, 42);

  // Connecting corridors
  makeCorridor(grid, 14, 10, 17, 18); // Left to center
  makeCorridor(grid, 14, 32, 17, 38); // Center to right
  makeCorridor(grid, 8, 20, 14, 25);  // Top to center
  makeCorridor(grid, 25, 20, 30, 25); // Center to bottom

  // Triage Bays (left side) - 5 bays
  for (let i = 0; i < 5; i++) {
    const y = 8 + i * 4;
    makeRoom(grid, y, 12, y + 2, 16, `triage-${i + 1}`);
    makeWalkable(grid, y + 1, 12);
    makeCorridor(grid, y + 1, 10, y + 1, 12);
  }

  // Trauma Bays (top) - 4 bays
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 7;
    makeRoom(grid, 2, x, 5, x + 4, `trauma-${i + 1}`);
    makeWalkable(grid, 5, x + 2);
    makeCorridor(grid, 5, x + 2, 8, x + 2);
  }

  // Resuscitation Rooms (right side) - 3 rooms
  for (let i = 0; i < 3; i++) {
    const y = 12 + i * 5;
    makeRoom(grid, y, 44, y + 3, 48, `resus-${i + 1}`);
    makeWalkable(grid, y + 1, 44);
    makeCorridor(grid, y + 1, 42, y + 1, 44);
  }

  // Fast Track rooms (bottom right)
  for (let i = 0; i < 3; i++) {
    const x = 34 + i * 5;
    makeRoom(grid, 26, x, 29, x + 3, `fast-track-${i + 1}`);
    makeWalkable(grid, 26, x + 1);
    makeCorridor(grid, 25, x + 1, 26, x + 1);
  }

  // Central Supply (in hub)
  makeWalkable(grid, 18, 25);
  setCell(grid, 18, 25, { isStorage: true });

  // Chargers (multiple locations)
  makeWalkable(grid, 31, 8);
  setCell(grid, 31, 8, { isCharger: true });
  makeWalkable(grid, 31, 42);
  setCell(grid, 31, 42, { isCharger: true });
  makeWalkable(grid, 6, 8);
  setCell(grid, 6, 8, { isCharger: true });

  // Staging areas
  makeWalkable(grid, 20, 20);
  setCell(grid, 20, 20, { isStaging: true });
  makeWalkable(grid, 15, 35);
  setCell(grid, 15, 35, { isStaging: true });

  return { id, name: 'Emergency Department', width, height, gridSize, grid };
};

const createEmergencyDeptScenario = (): Scenario => {
  const floor = createEmergencyDeptFloor();

  const rooms: Room[] = [
    // Triage Bays
    { id: generateId('room'), name: 'Triage Bay 1', type: 'EMERGENCY', floorId: floor.id, cells: [{ x: 12, y: 9 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Triage Bay 2', type: 'EMERGENCY', floorId: floor.id, cells: [{ x: 12, y: 13 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Triage Bay 3', type: 'EMERGENCY', floorId: floor.id, cells: [{ x: 12, y: 17 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Triage Bay 4', type: 'EMERGENCY', floorId: floor.id, cells: [{ x: 12, y: 21 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Triage Bay 5', type: 'EMERGENCY', floorId: floor.id, cells: [{ x: 12, y: 25 }], serviceCapacity: 1 },
    // Trauma Bays
    { id: generateId('room'), name: 'Trauma Bay 1', type: 'ICU', floorId: floor.id, cells: [{ x: 16, y: 5 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Trauma Bay 2', type: 'ICU', floorId: floor.id, cells: [{ x: 23, y: 5 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Trauma Bay 3', type: 'ICU', floorId: floor.id, cells: [{ x: 30, y: 5 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Trauma Bay 4', type: 'ICU', floorId: floor.id, cells: [{ x: 37, y: 5 }], serviceCapacity: 2 },
    // Resuscitation
    { id: generateId('room'), name: 'Resus 1', type: 'ICU', floorId: floor.id, cells: [{ x: 44, y: 13 }], serviceCapacity: 3 },
    { id: generateId('room'), name: 'Resus 2', type: 'ICU', floorId: floor.id, cells: [{ x: 44, y: 18 }], serviceCapacity: 3 },
    { id: generateId('room'), name: 'Resus 3', type: 'ICU', floorId: floor.id, cells: [{ x: 44, y: 23 }], serviceCapacity: 3 },
    // Fast Track
    { id: generateId('room'), name: 'Fast Track 1', type: 'WARD', floorId: floor.id, cells: [{ x: 35, y: 26 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Fast Track 2', type: 'WARD', floorId: floor.id, cells: [{ x: 40, y: 26 }], serviceCapacity: 1 },
    { id: generateId('room'), name: 'Fast Track 3', type: 'WARD', floorId: floor.id, cells: [{ x: 45, y: 26 }], serviceCapacity: 1 },
    // Supply
    { id: generateId('room'), name: 'ED Supply', type: 'SUPPLY', floorId: floor.id, cells: [{ x: 25, y: 18 }], serviceCapacity: 4 },
  ];

  const agents: Agent[] = [
    // Emergency response carts (fast, small payload)
    { id: generateId('agent'), name: 'Rapid 1', type: 'CART', position: { x: 20, y: 20 }, floorId: floor.id, speed: 1.8, battery: 100, maxBattery: 100, batteryDrainRate: 0.35, payloadLimit: 20, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'EMERGENCY'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'Rapid 2', type: 'CART', position: { x: 25, y: 20 }, floorId: floor.id, speed: 1.8, battery: 95, maxBattery: 100, batteryDrainRate: 0.35, payloadLimit: 20, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'EMERGENCY'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'Rapid 3', type: 'CART', position: { x: 30, y: 20 }, floorId: floor.id, speed: 1.8, battery: 88, maxBattery: 100, batteryDrainRate: 0.35, payloadLimit: 20, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'EMERGENCY'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // Standard carts
    { id: generateId('agent'), name: 'ED Cart A', type: 'CART', position: { x: 8, y: 15 }, floorId: floor.id, speed: 1, battery: 100, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'EMERGENCY'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'ED Cart B', type: 'CART', position: { x: 40, y: 15 }, floorId: floor.id, speed: 1, battery: 75, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'EMERGENCY', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    // Heavy cart for equipment
    { id: generateId('agent'), name: 'Heavy Lift', type: 'CART', position: { x: 25, y: 31 }, floorId: floor.id, speed: 0.7, battery: 100, maxBattery: 100, batteryDrainRate: 0.25, payloadLimit: 150, currentPayload: 0, accessProfiles: ['GENERAL', 'EMERGENCY', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    // Trauma specialist cart
    { id: generateId('agent'), name: 'Trauma Cart', type: 'CART', position: { x: 25, y: 6 }, floorId: floor.id, speed: 1.5, battery: 100, maxBattery: 100, batteryDrainRate: 0.3, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'EMERGENCY', 'OR'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'Resus Cart', type: 'CART', position: { x: 40, y: 20 }, floorId: floor.id, speed: 1.5, battery: 90, maxBattery: 100, batteryDrainRate: 0.3, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'EMERGENCY'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
  ];

  const jobs: Job[] = [
    // IMMEDIATE - Trauma activations
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 16, y: 5 }, floorId: floor.id }, item: { type: 'Trauma Kit', quantity: 1, weight: 8 }, priority: 'IMMEDIATE', deadline: 90, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 10 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 23, y: 5 }, floorId: floor.id }, item: { type: 'Blood Products', quantity: 4, weight: 3 }, priority: 'IMMEDIATE', deadline: 60, createdAt: 0, state: 'QUEUED', pickupServiceTime: 8, dropoffServiceTime: 8 },
    // EMERGENCY - Resus needs
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 44, y: 13 }, floorId: floor.id }, item: { type: 'Crash Cart Refill', quantity: 1, weight: 12 }, priority: 'EMERGENCY', deadline: 120, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 44, y: 18 }, floorId: floor.id }, item: { type: 'Intubation Kit', quantity: 1, weight: 5 }, priority: 'EMERGENCY', deadline: 150, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 44, y: 23 }, floorId: floor.id }, item: { type: 'IV Supplies', quantity: 10, weight: 5 }, priority: 'EMERGENCY', deadline: 180, createdAt: 0, state: 'QUEUED', pickupServiceTime: 12, dropoffServiceTime: 15 },
    // URGENT - Triage needs
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 12, y: 9 }, floorId: floor.id }, item: { type: 'Wound Care Kit', quantity: 2, weight: 3 }, priority: 'URGENT', deadline: 240, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 12, y: 13 }, floorId: floor.id }, item: { type: 'Cardiac Monitor', quantity: 1, weight: 15 }, priority: 'URGENT', deadline: 300, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 12, y: 17 }, floorId: floor.id }, item: { type: 'O2 Equipment', quantity: 1, weight: 8 }, priority: 'URGENT', deadline: 270, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    // SEMI_URGENT - Trauma bay restocks
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 30, y: 5 }, floorId: floor.id }, item: { type: 'Suture Kits', quantity: 5, weight: 2 }, priority: 'SEMI_URGENT', deadline: 400, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 37, y: 5 }, floorId: floor.id }, item: { type: 'Bandages', quantity: 20, weight: 4 }, priority: 'SEMI_URGENT', deadline: 450, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    // NON_URGENT - Fast track and restocking
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 35, y: 26 }, floorId: floor.id }, item: { type: 'Basic Supplies', quantity: 30, weight: 6 }, priority: 'NON_URGENT', deadline: 600, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 40, y: 26 }, floorId: floor.id }, item: { type: 'PPE', quantity: 50, weight: 8 }, priority: 'NON_URGENT', deadline: 720, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 12, y: 21 }, floorId: floor.id }, item: { type: 'Blankets', quantity: 10, weight: 12 }, priority: 'NON_URGENT', deadline: 900, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 25, y: 18 }, floorId: floor.id }, dropoff: { position: { x: 12, y: 25 }, floorId: floor.id }, item: { type: 'Documentation Supplies', quantity: 1, weight: 2 }, priority: 'NON_URGENT', deadline: 1200, createdAt: 0, state: 'QUEUED', pickupServiceTime: 5, dropoffServiceTime: 10 },
  ];

  const triageCases: TriageCase[] = [
    { id: generateId('triage'), level: 1, location: { position: { x: 16, y: 5 }, floorId: floor.id }, bundle: 'TRAUMA', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'MVA - multi-system trauma, activation called' },
    { id: generateId('triage'), level: 1, location: { position: { x: 23, y: 5 }, floorId: floor.id }, bundle: 'TRAUMA', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'GSW to chest - trauma activation' },
    { id: generateId('triage'), level: 2, location: { position: { x: 44, y: 13 }, floorId: floor.id }, bundle: 'CARDIAC', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'STEMI - cath lab on standby' },
    { id: generateId('triage'), level: 2, location: { position: { x: 44, y: 18 }, floorId: floor.id }, bundle: 'RESPIRATORY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'Respiratory failure - intubation likely' },
    { id: generateId('triage'), level: 3, location: { position: { x: 12, y: 9 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'Laceration requiring sutures' },
    { id: generateId('triage'), level: 3, location: { position: { x: 12, y: 13 }, floorId: floor.id }, bundle: 'CARDIAC', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'Chest pain - rule out ACS' },
    { id: generateId('triage'), level: 4, location: { position: { x: 35, y: 26 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'PENDING', createdAt: 0, notes: 'Minor injury - fast track' },
    { id: generateId('triage'), level: 5, location: { position: { x: 40, y: 26 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'PENDING', createdAt: 0, notes: 'Non-urgent consultation' },
  ];

  return {
    version: '1.0.0',
    name: 'Emergency Department',
    map: {
      floors: [floor],
      rooms,
      connectors: [],
      chargers: [
        { id: generateId('charger'), position: { x: 8, y: 31 }, floorId: floor.id, chargeRate: 1.5, capacity: 2 },
        { id: generateId('charger'), position: { x: 42, y: 31 }, floorId: floor.id, chargeRate: 1.5, capacity: 2 },
        { id: generateId('charger'), position: { x: 8, y: 6 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
      ],
      storagePoints: [
        { id: generateId('storage'), name: 'ED Central Supply', position: { x: 25, y: 18 }, floorId: floor.id, serviceTime: 20, capacity: 4, availableItems: [{ itemType: 'Trauma Kit', quantity: 10 }, { itemType: 'IV Supplies', quantity: 100 }, { itemType: 'Blood Products', quantity: 20 }] },
      ],
      stagingAreas: [
        { id: generateId('staging'), position: { x: 20, y: 20 }, floorId: floor.id, capacity: 4 },
        { id: generateId('staging'), position: { x: 35, y: 15 }, floorId: floor.id, capacity: 3 },
      ],
    },
    agents,
    jobs,
    triageCases,
    config: { speedMultiplier: 1, co2PerWh: 0.5, defaultPickupServiceTime: 10, defaultDropoffServiceTime: 15, starvationThresholdSeconds: 180 },
  };
};

// ============================================================================
// SCENARIO 3: MULTI-WING HOSPITAL
// ============================================================================

const createMultiWingFloor = (): Floor => {
  const id = generateId('floor');
  const width = 1200;
  const height = 800;
  const gridSize = 20;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  const grid = createEmptyGrid(cols, rows, id);

  // Main spine corridor (horizontal center)
  makeCorridor(grid, 18, 5, 22, 55);

  // North Wing corridor
  makeCorridor(grid, 5, 8, 8, 25);
  makeCorridor(grid, 8, 15, 18, 18);

  // South Wing corridor
  makeCorridor(grid, 32, 8, 35, 25);
  makeCorridor(grid, 22, 15, 32, 18);

  // East Wing corridor
  makeCorridor(grid, 15, 40, 25, 43);
  makeCorridor(grid, 18, 43, 22, 55);

  // West Wing connector
  makeCorridor(grid, 18, 5, 22, 12);
  makeCorridor(grid, 10, 5, 30, 8);

  // ICU Wing (North) - 6 beds
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 4;
    makeRoom(grid, 2, x - 1, 5, x + 1, `icu-${i + 1}`);
    makeWalkable(grid, 5, x);
    makeCorridor(grid, 5, x, 8, x);
  }

  // Ward A (South-West) - 8 beds
  for (let i = 0; i < 4; i++) {
    const x = 10 + i * 4;
    makeRoom(grid, 35, x - 1, 38, x + 1, `ward-a-${i + 1}`);
    makeWalkable(grid, 35, x);
    makeCorridor(grid, 32, x, 35, x);
  }
  for (let i = 0; i < 4; i++) {
    const x = 10 + i * 4;
    makeRoom(grid, 28, x - 1, 31, x + 1, `ward-a-${i + 5}`);
    makeWalkable(grid, 31, x);
    makeCorridor(grid, 31, x, 32, x);
  }

  // OR Suite (East Wing) - 4 ORs
  for (let i = 0; i < 4; i++) {
    const y = 10 + i * 4;
    makeRoom(grid, y, 46, y + 2, 52, `or-${i + 1}`);
    makeWalkable(grid, y + 1, 46);
    makeCorridor(grid, y + 1, 43, y + 1, 46);
  }

  // Pharmacy & Supply (West)
  makeRoom(grid, 12, 2, 17, 7, 'pharmacy');
  makeWalkable(grid, 15, 7);
  makeCorridor(grid, 15, 7, 18, 10);

  makeRoom(grid, 23, 2, 28, 7, 'central-supply');
  makeWalkable(grid, 25, 7);
  makeCorridor(grid, 22, 10, 25, 10);
  makeCorridor(grid, 25, 7, 25, 10);

  // Lab (East-North)
  makeRoom(grid, 2, 48, 8, 55, 'lab');
  makeWalkable(grid, 6, 48);
  makeCorridor(grid, 6, 43, 6, 48);
  makeCorridor(grid, 6, 40, 15, 43);

  // Radiology (Center-South)
  makeRoom(grid, 25, 28, 30, 35, 'radiology');
  makeWalkable(grid, 25, 30);
  makeCorridor(grid, 22, 30, 25, 30);

  // Chargers - distributed
  makeWalkable(grid, 20, 8);
  setCell(grid, 20, 8, { isCharger: true });
  makeWalkable(grid, 20, 52);
  setCell(grid, 20, 52, { isCharger: true });
  makeWalkable(grid, 6, 20);
  setCell(grid, 6, 20, { isCharger: true });
  makeWalkable(grid, 33, 20);
  setCell(grid, 33, 20, { isCharger: true });

  // Storage markers
  setCell(grid, 25, 7, { isStorage: true });
  setCell(grid, 15, 7, { isStorage: true });

  // Staging areas
  makeWalkable(grid, 20, 15);
  setCell(grid, 20, 15, { isStaging: true });
  makeWalkable(grid, 20, 35);
  setCell(grid, 20, 35, { isStaging: true });
  makeWalkable(grid, 20, 48);
  setCell(grid, 20, 48, { isStaging: true });

  return { id, name: 'Multi-Wing Hospital', width, height, gridSize, grid };
};

const createMultiWingScenario = (): Scenario => {
  const floor = createMultiWingFloor();

  const rooms: Room[] = [
    // ICU beds
    ...Array.from({ length: 6 }, (_, i) => ({
      id: generateId('room'), name: `ICU Bed ${i + 1}`, type: 'ICU' as const, floorId: floor.id, cells: [{ x: 10 + i * 4, y: 5 }], serviceCapacity: 2
    })),
    // Ward A beds
    ...Array.from({ length: 8 }, (_, i) => ({
      id: generateId('room'), name: `Ward A-${i + 1}`, type: 'WARD' as const, floorId: floor.id, cells: [{ x: 10 + (i % 4) * 4, y: i < 4 ? 35 : 31 }], serviceCapacity: 1
    })),
    // ORs
    ...Array.from({ length: 4 }, (_, i) => ({
      id: generateId('room'), name: `OR ${i + 1}`, type: 'OR' as const, floorId: floor.id, cells: [{ x: 46, y: 11 + i * 4 }], serviceCapacity: 3
    })),
    // Support
    { id: generateId('room'), name: 'Pharmacy', type: 'PHARMACY', floorId: floor.id, cells: [{ x: 7, y: 15 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Central Supply', type: 'SUPPLY', floorId: floor.id, cells: [{ x: 7, y: 25 }], serviceCapacity: 4 },
    { id: generateId('room'), name: 'Laboratory', type: 'LAB', floorId: floor.id, cells: [{ x: 48, y: 6 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Radiology', type: 'IMAGING', floorId: floor.id, cells: [{ x: 30, y: 25 }], serviceCapacity: 2 },
  ];

  const agents: Agent[] = [
    // ICU dedicated carts
    { id: generateId('agent'), name: 'ICU-1', type: 'CART', position: { x: 15, y: 7 }, floorId: floor.id, speed: 1.3, battery: 100, maxBattery: 100, batteryDrainRate: 0.25, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'ICU-2', type: 'CART', position: { x: 22, y: 7 }, floorId: floor.id, speed: 1.3, battery: 90, maxBattery: 100, batteryDrainRate: 0.25, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // OR dedicated carts
    { id: generateId('agent'), name: 'OR-Cart-1', type: 'CART', position: { x: 42, y: 18 }, floorId: floor.id, speed: 1.2, battery: 100, maxBattery: 100, batteryDrainRate: 0.22, payloadLimit: 60, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'OR-Cart-2', type: 'CART', position: { x: 42, y: 22 }, floorId: floor.id, speed: 1.2, battery: 85, maxBattery: 100, batteryDrainRate: 0.22, payloadLimit: 60, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // Ward runners
    { id: generateId('agent'), name: 'Ward-A', type: 'CART', position: { x: 15, y: 33 }, floorId: floor.id, speed: 1, battery: 100, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'Ward-B', type: 'CART', position: { x: 22, y: 33 }, floorId: floor.id, speed: 1, battery: 75, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 50, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    // Lab/Specimen runner
    { id: generateId('agent'), name: 'Lab Runner', type: 'CART', position: { x: 45, y: 8 }, floorId: floor.id, speed: 1.4, battery: 100, maxBattery: 100, batteryDrainRate: 0.28, payloadLimit: 25, currentPayload: 0, accessProfiles: ['GENERAL', 'LAB', 'ICU', 'OR'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // Supply haulers
    { id: generateId('agent'), name: 'Hauler-1', type: 'CART', position: { x: 10, y: 20 }, floorId: floor.id, speed: 0.8, battery: 100, maxBattery: 100, batteryDrainRate: 0.18, payloadLimit: 120, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD', 'SUPPLY'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'Hauler-2', type: 'CART', position: { x: 10, y: 22 }, floorId: floor.id, speed: 0.8, battery: 88, maxBattery: 100, batteryDrainRate: 0.18, payloadLimit: 120, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD', 'SUPPLY'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    // Pharmacy cart
    { id: generateId('agent'), name: 'Pharmacy Express', type: 'CART', position: { x: 10, y: 15 }, floorId: floor.id, speed: 1.1, battery: 100, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 30, currentPayload: 0, accessProfiles: ['GENERAL', 'PHARMACY', 'WARD', 'ICU'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
  ];

  const jobs: Job[] = [
    // ICU Critical
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 10, y: 5 }, floorId: floor.id }, item: { type: 'Blood Products', quantity: 2, weight: 3 }, priority: 'IMMEDIATE', deadline: 120, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 10 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 5 }, floorId: floor.id }, item: { type: 'Ventilator Supplies', quantity: 1, weight: 8 }, priority: 'EMERGENCY', deadline: 180, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 15 }, floorId: floor.id }, dropoff: { position: { x: 18, y: 5 }, floorId: floor.id }, item: { type: 'IV Medications', quantity: 5, weight: 2 }, priority: 'URGENT', deadline: 240, createdAt: 0, state: 'QUEUED', pickupServiceTime: 12, dropoffServiceTime: 15 },
    // OR Supplies
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 46, y: 11 }, floorId: floor.id }, item: { type: 'Surgical Instruments', quantity: 1, weight: 15 }, priority: 'URGENT', deadline: 300, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 46, y: 15 }, floorId: floor.id }, item: { type: 'Sterile Supplies', quantity: 10, weight: 8 }, priority: 'URGENT', deadline: 280, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 46, y: 19 }, floorId: floor.id }, item: { type: 'Anesthesia Supplies', quantity: 5, weight: 6 }, priority: 'SEMI_URGENT', deadline: 400, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    // Lab specimens
    { id: generateId('job'), pickup: { position: { x: 10, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 48, y: 6 }, floorId: floor.id }, item: { type: 'STAT Lab Specimens', quantity: 3, weight: 1 }, priority: 'EMERGENCY', deadline: 150, createdAt: 0, state: 'QUEUED', pickupServiceTime: 5, dropoffServiceTime: 10 },
    { id: generateId('job'), pickup: { position: { x: 46, y: 11 }, floorId: floor.id }, dropoff: { position: { x: 48, y: 6 }, floorId: floor.id }, item: { type: 'OR Specimens', quantity: 2, weight: 0.5 }, priority: 'URGENT', deadline: 200, createdAt: 0, state: 'QUEUED', pickupServiceTime: 5, dropoffServiceTime: 10 },
    // Ward restocking
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 10, y: 35 }, floorId: floor.id }, item: { type: 'Linens', quantity: 20, weight: 25 }, priority: 'NON_URGENT', deadline: 900, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 35 }, floorId: floor.id }, item: { type: 'Supplies Bundle', quantity: 1, weight: 30 }, priority: 'NON_URGENT', deadline: 1000, createdAt: 0, state: 'QUEUED', pickupServiceTime: 25, dropoffServiceTime: 30 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 18, y: 35 }, floorId: floor.id }, item: { type: 'PPE', quantity: 50, weight: 10 }, priority: 'NON_URGENT', deadline: 800, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 22, y: 35 }, floorId: floor.id }, item: { type: 'Medical Supplies', quantity: 30, weight: 12 }, priority: 'NON_URGENT', deadline: 850, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    // Pharmacy deliveries
    { id: generateId('job'), pickup: { position: { x: 7, y: 15 }, floorId: floor.id }, dropoff: { position: { x: 22, y: 5 }, floorId: floor.id }, item: { type: 'ICU Medications', quantity: 10, weight: 3 }, priority: 'URGENT', deadline: 260, createdAt: 0, state: 'QUEUED', pickupServiceTime: 12, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 15 }, floorId: floor.id }, dropoff: { position: { x: 10, y: 31 }, floorId: floor.id }, item: { type: 'Ward Medications', quantity: 15, weight: 4 }, priority: 'SEMI_URGENT', deadline: 450, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 18 },
    { id: generateId('job'), pickup: { position: { x: 7, y: 15 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 31 }, floorId: floor.id }, item: { type: 'PRN Medications', quantity: 8, weight: 2 }, priority: 'SEMI_URGENT', deadline: 500, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    // Radiology transport
    { id: generateId('job'), pickup: { position: { x: 30, y: 25 }, floorId: floor.id }, dropoff: { position: { x: 26, y: 5 }, floorId: floor.id }, item: { type: 'Imaging Results', quantity: 1, weight: 0.5 }, priority: 'URGENT', deadline: 220, createdAt: 0, state: 'QUEUED', pickupServiceTime: 5, dropoffServiceTime: 10 },
  ];

  const triageCases: TriageCase[] = [
    { id: generateId('triage'), level: 1, location: { position: { x: 10, y: 5 }, floorId: floor.id }, bundle: 'SEPSIS', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'ICU Bed 1 - Septic shock, needs blood products' },
    { id: generateId('triage'), level: 2, location: { position: { x: 14, y: 5 }, floorId: floor.id }, bundle: 'RESPIRATORY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'ICU Bed 2 - Ventilator dependent' },
    { id: generateId('triage'), level: 2, location: { position: { x: 46, y: 11 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'OR 1 - Emergency laparotomy' },
    { id: generateId('triage'), level: 2, location: { position: { x: 46, y: 15 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'OR 2 - Scheduled cardiac surgery' },
    { id: generateId('triage'), level: 3, location: { position: { x: 18, y: 5 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'ICU Bed 3 - Stable, med delivery needed' },
    { id: generateId('triage'), level: 4, location: { position: { x: 10, y: 35 }, floorId: floor.id }, bundle: 'GENERAL', linkedJobIds: [], status: 'PENDING', createdAt: 0, notes: 'Ward restocking round' },
  ];

  return {
    version: '1.0.0',
    name: 'Multi-Wing Hospital',
    map: {
      floors: [floor],
      rooms,
      connectors: [],
      chargers: [
        { id: generateId('charger'), position: { x: 8, y: 20 }, floorId: floor.id, chargeRate: 1.5, capacity: 2 },
        { id: generateId('charger'), position: { x: 52, y: 20 }, floorId: floor.id, chargeRate: 1.5, capacity: 2 },
        { id: generateId('charger'), position: { x: 20, y: 6 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
        { id: generateId('charger'), position: { x: 20, y: 33 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
      ],
      storagePoints: [
        { id: generateId('storage'), name: 'Central Supply', position: { x: 7, y: 25 }, floorId: floor.id, serviceTime: 25, capacity: 6, availableItems: [{ itemType: 'All Supplies', quantity: 500 }] },
        { id: generateId('storage'), name: 'Pharmacy', position: { x: 7, y: 15 }, floorId: floor.id, serviceTime: 20, capacity: 3, availableItems: [{ itemType: 'Medications', quantity: 300 }] },
      ],
      stagingAreas: [
        { id: generateId('staging'), position: { x: 15, y: 20 }, floorId: floor.id, capacity: 4 },
        { id: generateId('staging'), position: { x: 35, y: 20 }, floorId: floor.id, capacity: 4 },
        { id: generateId('staging'), position: { x: 48, y: 20 }, floorId: floor.id, capacity: 3 },
      ],
    },
    agents,
    jobs,
    triageCases,
    config: { speedMultiplier: 1, co2PerWh: 0.5, defaultPickupServiceTime: 15, defaultDropoffServiceTime: 20, starvationThresholdSeconds: 300 },
  };
};

// ============================================================================
// SCENARIO 4: SURGICAL CENTER
// ============================================================================

const createSurgicalCenterFloor = (): Floor => {
  const id = generateId('floor');
  const width = 900;
  const height = 700;
  const gridSize = 20;
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  const grid = createEmptyGrid(cols, rows, id);

  // Central sterile corridor (wide)
  makeCorridor(grid, 15, 10, 20, 35);

  // Pre-op corridor (left)
  makeCorridor(grid, 8, 3, 27, 8);
  makeCorridor(grid, 15, 8, 20, 10);

  // Post-op/PACU corridor (right)
  makeCorridor(grid, 8, 37, 27, 42);
  makeCorridor(grid, 15, 35, 20, 37);

  // OR access corridors
  makeCorridor(grid, 5, 15, 8, 30);
  makeCorridor(grid, 27, 15, 30, 30);

  // Vertical connectors
  makeCorridor(grid, 8, 15, 15, 18);
  makeCorridor(grid, 8, 27, 15, 30);
  makeCorridor(grid, 20, 15, 27, 18);
  makeCorridor(grid, 20, 27, 27, 30);

  // Operating Rooms (top row) - 4 large ORs
  for (let i = 0; i < 4; i++) {
    const x = 12 + i * 6;
    makeRoom(grid, 2, x, 5, x + 4, `or-${i + 1}`);
    makeWalkable(grid, 5, x + 2);
    makeCorridor(grid, 5, x + 2, 8, x + 2);
  }

  // Operating Rooms (bottom row) - 4 medium ORs
  for (let i = 0; i < 4; i++) {
    const x = 12 + i * 6;
    makeRoom(grid, 30, x, 33, x + 4, `or-${i + 5}`);
    makeWalkable(grid, 30, x + 2);
    makeCorridor(grid, 27, x + 2, 30, x + 2);
  }

  // Pre-op bays (left)
  for (let i = 0; i < 5; i++) {
    const y = 10 + i * 3;
    makeRoom(grid, y, 0, y + 2, 3, `preop-${i + 1}`);
    makeWalkable(grid, y + 1, 3);
    makeCorridor(grid, y + 1, 3, y + 1, 8);
  }

  // PACU bays (right)
  for (let i = 0; i < 6; i++) {
    const y = 9 + i * 3;
    makeRoom(grid, y, 43, y + 2, 47, `pacu-${i + 1}`);
    makeWalkable(grid, y + 1, 43);
    makeCorridor(grid, y + 1, 37, y + 1, 43);
  }

  // Sterile Supply (center-top)
  makeRoom(grid, 10, 18, 14, 27, 'sterile-supply');
  makeWalkable(grid, 14, 22);
  makeCorridor(grid, 14, 22, 15, 22);

  // Anesthesia Supply (center-left)
  makeRoom(grid, 21, 10, 25, 14, 'anesthesia');
  makeWalkable(grid, 21, 12);
  makeCorridor(grid, 20, 12, 21, 12);

  // Instrument Processing (bottom-center)
  makeRoom(grid, 22, 18, 26, 27, 'instrument-processing');
  makeWalkable(grid, 22, 22);
  makeCorridor(grid, 20, 22, 22, 22);

  // Chargers
  makeWalkable(grid, 17, 5);
  setCell(grid, 17, 5, { isCharger: true });
  makeWalkable(grid, 17, 40);
  setCell(grid, 17, 40, { isCharger: true });
  makeWalkable(grid, 6, 22);
  setCell(grid, 6, 22, { isCharger: true });
  makeWalkable(grid, 28, 22);
  setCell(grid, 28, 22, { isCharger: true });

  // Storage markers
  setCell(grid, 14, 22, { isStorage: true });
  setCell(grid, 21, 12, { isStorage: true });

  // Staging
  makeWalkable(grid, 17, 22);
  setCell(grid, 17, 22, { isStaging: true });
  makeWalkable(grid, 12, 5);
  setCell(grid, 12, 5, { isStaging: true });
  makeWalkable(grid, 12, 40);
  setCell(grid, 12, 40, { isStaging: true });

  return { id, name: 'Surgical Center', width, height, gridSize, grid };
};

const createSurgicalCenterScenario = (): Scenario => {
  const floor = createSurgicalCenterFloor();

  const rooms: Room[] = [
    // Operating Rooms
    ...Array.from({ length: 8 }, (_, i) => ({
      id: generateId('room'),
      name: `OR ${i + 1}`,
      type: 'OR' as const,
      floorId: floor.id,
      cells: [{ x: 14 + (i % 4) * 6, y: i < 4 ? 5 : 30 }],
      serviceCapacity: 3
    })),
    // Pre-op
    ...Array.from({ length: 5 }, (_, i) => ({
      id: generateId('room'), name: `Pre-Op ${i + 1}`, type: 'WARD' as const, floorId: floor.id, cells: [{ x: 3, y: 11 + i * 3 }], serviceCapacity: 1
    })),
    // PACU
    ...Array.from({ length: 6 }, (_, i) => ({
      id: generateId('room'), name: `PACU ${i + 1}`, type: 'ICU' as const, floorId: floor.id, cells: [{ x: 43, y: 10 + i * 3 }], serviceCapacity: 2
    })),
    // Support rooms
    { id: generateId('room'), name: 'Sterile Supply', type: 'SUPPLY', floorId: floor.id, cells: [{ x: 22, y: 14 }], serviceCapacity: 4 },
    { id: generateId('room'), name: 'Anesthesia', type: 'SUPPLY', floorId: floor.id, cells: [{ x: 12, y: 21 }], serviceCapacity: 2 },
    { id: generateId('room'), name: 'Instrument Processing', type: 'SUPPLY', floorId: floor.id, cells: [{ x: 22, y: 22 }], serviceCapacity: 3 },
  ];

  const agents: Agent[] = [
    // Sterile runners (fast, careful)
    { id: generateId('agent'), name: 'Sterile-1', type: 'CART', position: { x: 22, y: 17 }, floorId: floor.id, speed: 1.3, battery: 100, maxBattery: 100, batteryDrainRate: 0.25, payloadLimit: 30, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'STERILE'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'Sterile-2', type: 'CART', position: { x: 18, y: 17 }, floorId: floor.id, speed: 1.3, battery: 95, maxBattery: 100, batteryDrainRate: 0.25, payloadLimit: 30, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'STERILE'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // OR dedicated carts
    { id: generateId('agent'), name: 'OR-Runner-1', type: 'CART', position: { x: 16, y: 7 }, floorId: floor.id, speed: 1.4, battery: 100, maxBattery: 100, batteryDrainRate: 0.28, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'OR'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    { id: generateId('agent'), name: 'OR-Runner-2', type: 'CART', position: { x: 28, y: 7 }, floorId: floor.id, speed: 1.4, battery: 90, maxBattery: 100, batteryDrainRate: 0.28, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'OR'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // Instrument transport (heavy duty)
    { id: generateId('agent'), name: 'Instruments-1', type: 'CART', position: { x: 22, y: 25 }, floorId: floor.id, speed: 0.9, battery: 100, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 80, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'STERILE'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'Instruments-2', type: 'CART', position: { x: 22, y: 28 }, floorId: floor.id, speed: 0.9, battery: 85, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 80, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'STERILE'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    // Pre-op/PACU runners
    { id: generateId('agent'), name: 'PreOp Cart', type: 'CART', position: { x: 5, y: 17 }, floorId: floor.id, speed: 1, battery: 100, maxBattery: 100, batteryDrainRate: 0.2, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'WARD'], inventorySlots: [], status: 'IDLE', pool: 'NON_URGENT' },
    { id: generateId('agent'), name: 'PACU Cart', type: 'CART', position: { x: 40, y: 17 }, floorId: floor.id, speed: 1.1, battery: 100, maxBattery: 100, batteryDrainRate: 0.22, payloadLimit: 40, currentPayload: 0, accessProfiles: ['GENERAL', 'ICU', 'WARD'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // Anesthesia cart
    { id: generateId('agent'), name: 'Anesthesia Cart', type: 'CART', position: { x: 12, y: 18 }, floorId: floor.id, speed: 1.2, battery: 100, maxBattery: 100, batteryDrainRate: 0.24, payloadLimit: 35, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'ANESTHESIA'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
    // Specimen/lab runner
    { id: generateId('agent'), name: 'Specimen Runner', type: 'CART', position: { x: 22, y: 20 }, floorId: floor.id, speed: 1.5, battery: 100, maxBattery: 100, batteryDrainRate: 0.3, payloadLimit: 15, currentPayload: 0, accessProfiles: ['GENERAL', 'OR', 'LAB'], inventorySlots: [], status: 'IDLE', pool: 'URGENT' },
  ];

  const jobs: Job[] = [
    // OR 1 - Emergency case
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 5 }, floorId: floor.id }, item: { type: 'Emergency Surgical Tray', quantity: 1, weight: 12 }, priority: 'IMMEDIATE', deadline: 90, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 12, y: 21 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 5 }, floorId: floor.id }, item: { type: 'Anesthesia Kit', quantity: 1, weight: 8 }, priority: 'IMMEDIATE', deadline: 100, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 10 },
    // OR 2-4 Scheduled cases
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 20, y: 5 }, floorId: floor.id }, item: { type: 'Orthopedic Instruments', quantity: 1, weight: 20 }, priority: 'URGENT', deadline: 300, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 26, y: 5 }, floorId: floor.id }, item: { type: 'Laparoscopic Set', quantity: 1, weight: 15 }, priority: 'URGENT', deadline: 320, createdAt: 0, state: 'QUEUED', pickupServiceTime: 18, dropoffServiceTime: 22 },
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 32, y: 5 }, floorId: floor.id }, item: { type: 'General Surgery Set', quantity: 1, weight: 18 }, priority: 'URGENT', deadline: 350, createdAt: 0, state: 'QUEUED', pickupServiceTime: 20, dropoffServiceTime: 25 },
    // Anesthesia deliveries
    { id: generateId('job'), pickup: { position: { x: 12, y: 21 }, floorId: floor.id }, dropoff: { position: { x: 20, y: 5 }, floorId: floor.id }, item: { type: 'Anesthesia Drugs', quantity: 5, weight: 2 }, priority: 'URGENT', deadline: 280, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 12 },
    { id: generateId('job'), pickup: { position: { x: 12, y: 21 }, floorId: floor.id }, dropoff: { position: { x: 26, y: 5 }, floorId: floor.id }, item: { type: 'Epidural Kit', quantity: 1, weight: 3 }, priority: 'URGENT', deadline: 300, createdAt: 0, state: 'QUEUED', pickupServiceTime: 8, dropoffServiceTime: 10 },
    // Bottom row ORs
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 14, y: 30 }, floorId: floor.id }, item: { type: 'Cardiac Surgery Set', quantity: 1, weight: 25 }, priority: 'URGENT', deadline: 400, createdAt: 0, state: 'QUEUED', pickupServiceTime: 25, dropoffServiceTime: 30 },
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 20, y: 30 }, floorId: floor.id }, item: { type: 'Neuro Instruments', quantity: 1, weight: 18 }, priority: 'SEMI_URGENT', deadline: 500, createdAt: 0, state: 'QUEUED', pickupServiceTime: 22, dropoffServiceTime: 28 },
    // Pre-op needs
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 3, y: 11 }, floorId: floor.id }, item: { type: 'Pre-Op Kit', quantity: 3, weight: 5 }, priority: 'SEMI_URGENT', deadline: 450, createdAt: 0, state: 'QUEUED', pickupServiceTime: 12, dropoffServiceTime: 15 },
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 3, y: 14 }, floorId: floor.id }, item: { type: 'IV Setup', quantity: 4, weight: 3 }, priority: 'SEMI_URGENT', deadline: 480, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 12 },
    // PACU supplies
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 43, y: 10 }, floorId: floor.id }, item: { type: 'Recovery Supplies', quantity: 10, weight: 8 }, priority: 'SEMI_URGENT', deadline: 420, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 18 },
    { id: generateId('job'), pickup: { position: { x: 22, y: 14 }, floorId: floor.id }, dropoff: { position: { x: 43, y: 13 }, floorId: floor.id }, item: { type: 'Warming Blankets', quantity: 5, weight: 10 }, priority: 'NON_URGENT', deadline: 600, createdAt: 0, state: 'QUEUED', pickupServiceTime: 10, dropoffServiceTime: 15 },
    // Instrument return (dirty)
    { id: generateId('job'), pickup: { position: { x: 14, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 22, y: 22 }, floorId: floor.id }, item: { type: 'Dirty Instruments', quantity: 1, weight: 15 }, priority: 'NON_URGENT', deadline: 900, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    { id: generateId('job'), pickup: { position: { x: 20, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 22, y: 22 }, floorId: floor.id }, item: { type: 'Dirty Instruments', quantity: 1, weight: 18 }, priority: 'NON_URGENT', deadline: 950, createdAt: 0, state: 'QUEUED', pickupServiceTime: 15, dropoffServiceTime: 20 },
    // Specimens
    { id: generateId('job'), pickup: { position: { x: 14, y: 5 }, floorId: floor.id }, dropoff: { position: { x: 22, y: 17 }, floorId: floor.id }, item: { type: 'Surgical Specimen', quantity: 2, weight: 1 }, priority: 'URGENT', deadline: 200, createdAt: 0, state: 'QUEUED', pickupServiceTime: 5, dropoffServiceTime: 8 },
  ];

  const triageCases: TriageCase[] = [
    { id: generateId('triage'), level: 1, location: { position: { x: 14, y: 5 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'OR 1 - Emergency appendectomy' },
    { id: generateId('triage'), level: 2, location: { position: { x: 20, y: 5 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'OR 2 - Total knee replacement' },
    { id: generateId('triage'), level: 2, location: { position: { x: 26, y: 5 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'OR 3 - Laparoscopic cholecystectomy' },
    { id: generateId('triage'), level: 2, location: { position: { x: 32, y: 5 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'OR 4 - Hernia repair' },
    { id: generateId('triage'), level: 3, location: { position: { x: 14, y: 30 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'PENDING', createdAt: 0, notes: 'OR 5 - CABG scheduled 2pm' },
    { id: generateId('triage'), level: 3, location: { position: { x: 20, y: 30 }, floorId: floor.id }, bundle: 'SURGERY', linkedJobIds: [], status: 'PENDING', createdAt: 0, notes: 'OR 6 - Craniotomy scheduled 3pm' },
    { id: generateId('triage'), level: 4, location: { position: { x: 43, y: 10 }, floorId: floor.id }, bundle: 'RECOVERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'PACU 1 - Post-op recovery' },
    { id: generateId('triage'), level: 4, location: { position: { x: 43, y: 13 }, floorId: floor.id }, bundle: 'RECOVERY', linkedJobIds: [], status: 'ACTIVE', createdAt: 0, notes: 'PACU 2 - Post-op recovery' },
  ];

  return {
    version: '1.0.0',
    name: 'Surgical Center',
    map: {
      floors: [floor],
      rooms,
      connectors: [],
      chargers: [
        { id: generateId('charger'), position: { x: 5, y: 17 }, floorId: floor.id, chargeRate: 1.2, capacity: 2 },
        { id: generateId('charger'), position: { x: 40, y: 17 }, floorId: floor.id, chargeRate: 1.2, capacity: 2 },
        { id: generateId('charger'), position: { x: 22, y: 6 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
        { id: generateId('charger'), position: { x: 22, y: 28 }, floorId: floor.id, chargeRate: 1, capacity: 1 },
      ],
      storagePoints: [
        { id: generateId('storage'), name: 'Sterile Supply', position: { x: 22, y: 14 }, floorId: floor.id, serviceTime: 25, capacity: 4, availableItems: [{ itemType: 'Surgical Instruments', quantity: 50 }, { itemType: 'Sterile Supplies', quantity: 200 }] },
        { id: generateId('storage'), name: 'Anesthesia Supply', position: { x: 12, y: 21 }, floorId: floor.id, serviceTime: 15, capacity: 2, availableItems: [{ itemType: 'Anesthesia Supplies', quantity: 100 }] },
      ],
      stagingAreas: [
        { id: generateId('staging'), position: { x: 22, y: 17 }, floorId: floor.id, capacity: 5 },
        { id: generateId('staging'), position: { x: 5, y: 12 }, floorId: floor.id, capacity: 3 },
        { id: generateId('staging'), position: { x: 40, y: 12 }, floorId: floor.id, capacity: 3 },
      ],
    },
    agents,
    jobs,
    triageCases,
    config: { speedMultiplier: 1, co2PerWh: 0.5, defaultPickupServiceTime: 15, defaultDropoffServiceTime: 20, starvationThresholdSeconds: 240 },
  };
};

// ============================================================================
// SCENARIO REGISTRY & EXPORTS
// ============================================================================

export type ScenarioType = 'rush-hour' | 'emergency-dept' | 'multi-wing' | 'surgical-center';

export interface ScenarioInfo {
  id: ScenarioType;
  name: string;
  description: string;
  agents: number;
  jobs: number;
  complexity: 'Simple' | 'Medium' | 'Complex';
}

export const AVAILABLE_SCENARIOS: ScenarioInfo[] = [
  {
    id: 'rush-hour',
    name: 'Hospital Rush Hour',
    description: 'Standard hospital floor with ICU, OR, Wards, and Pharmacy',
    agents: 6,
    jobs: 10,
    complexity: 'Simple',
  },
  {
    id: 'emergency-dept',
    name: 'Emergency Department',
    description: 'High-acuity ED with trauma bays, resuscitation rooms, and triage areas',
    agents: 8,
    jobs: 14,
    complexity: 'Complex',
  },
  {
    id: 'multi-wing',
    name: 'Multi-Wing Hospital',
    description: 'Large hospital with ICU, wards, ORs, lab, pharmacy, and radiology',
    agents: 10,
    jobs: 16,
    complexity: 'Complex',
  },
  {
    id: 'surgical-center',
    name: 'Surgical Center',
    description: 'Specialized surgical facility with 8 ORs, pre-op, and PACU',
    agents: 10,
    jobs: 16,
    complexity: 'Medium',
  },
];

export const generateScenario = (type: ScenarioType): Scenario => {
  switch (type) {
    case 'rush-hour':
      return createRushHourScenario();
    case 'emergency-dept':
      return createEmergencyDeptScenario();
    case 'multi-wing':
      return createMultiWingScenario();
    case 'surgical-center':
      return createSurgicalCenterScenario();
    default:
      return createRushHourScenario();
  }
};

// Keep the old export for backwards compatibility
export const generateMockScenario = (): Scenario => createRushHourScenario();
