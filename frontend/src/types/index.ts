// ============================================
// MedFlow Type Definitions (from CLAUDE.md Section 12)
// ============================================

// === Priority & Triage ===

export type PriorityTier =
  | 'IMMEDIATE'    // Code blue, crash cart
  | 'EMERGENCY'
  | 'URGENT'
  | 'SEMI_URGENT'
  | 'NON_URGENT';

export type TriageLevel = 1 | 2 | 3 | 4 | 5; // 1 = most urgent

export type DisasterTriage = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

export const TRIAGE_TO_PRIORITY: Record<TriageLevel, PriorityTier> = {
  1: 'IMMEDIATE',
  2: 'EMERGENCY',
  3: 'URGENT',
  4: 'SEMI_URGENT',
  5: 'NON_URGENT',
};

export const PRIORITY_ORDER: Record<PriorityTier, number> = {
  'IMMEDIATE': 0,
  'EMERGENCY': 1,
  'URGENT': 2,
  'SEMI_URGENT': 3,
  'NON_URGENT': 4,
};

// === Job States ===

export type JobState =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'DELAYED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'INFEASIBLE';

// === Map & Locations ===

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  isObstacle: boolean;
  isQuarantine: boolean;
  isRestricted: boolean;
  restrictedAccessProfiles?: string[];
  isCharger: boolean;
  isStorage: boolean;
  isStaging: boolean;
  isConnector: boolean;
  connectorId?: string;
  roomId?: string;
  floorId: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'OR' | 'ICU' | 'WARD' | 'SUPPLY' | 'PHARMACY' | 'LAB' | 'GENERAL' | 'EMERGENCY' | 'IMAGING';
  floorId: string;
  cells: Position[];
  serviceCapacity: number;
  availabilityWindows?: TimeWindow[];
}

export interface TimeWindow {
  start: number; // simulation time in seconds
  end: number;
}

export interface Connector {
  id: string;
  name: string;
  type: 'ELEVATOR' | 'STAIRS';
  floors: { floorId: string; position: Position }[];
  travelTime: number; // seconds
  energyCost: number; // Wh
  capacity: number; // agents at a time
}

export interface Charger {
  id: string;
  position: Position;
  floorId: string;
  chargeRate: number; // % per second
  capacity: number; // agents at a time
}

export interface StoragePoint {
  id: string;
  name: string;
  position: Position;
  floorId: string;
  serviceTime: number; // seconds
  capacity: number;
  availableItems: { itemType: string; quantity: number }[];
}

export interface StagingArea {
  id: string;
  position: Position;
  floorId: string;
  capacity: number;
}

export interface Floor {
  id: string;
  name: string;
  imageUrl?: string;
  width: number;
  height: number;
  gridSize: number; // pixels per cell
  grid: GridCell[][];
}

export interface HospitalMap {
  floors: Floor[];
  rooms: Room[];
  connectors: Connector[];
  chargers: Charger[];
  storagePoints: StoragePoint[];
  stagingAreas: StagingArea[];
}

// === Agents ===

export type AgentType = 'CART';

export type AgentStatus =
  | 'IDLE'
  | 'MOVING'
  | 'PICKING_UP'
  | 'DROPPING_OFF'
  | 'CHARGING'
  | 'WAITING'
  | 'FAILED';

export interface InventorySlot {
  itemType: string;
  quantity: number;
  maxQuantity: number;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  position: Position;
  floorId: string;
  speed: number; // cells per second
  battery: number; // 0-100
  maxBattery: number;
  batteryDrainRate: number; // % per cell moved
  payloadLimit: number; // kg
  currentPayload: number;
  accessProfiles: string[];
  inventorySlots: InventorySlot[];
  status: AgentStatus;
  currentJobId?: string;
  pool: 'URGENT' | 'NON_URGENT';
}

// === Jobs ===

export interface DeliveryItem {
  type: string;
  quantity: number;
  weight: number; // kg
}

export interface Job {
  id: string;
  pickup?: {
    position: Position;
    floorId: string;
    roomId?: string;
  };
  dropoff: {
    position: Position;
    floorId: string;
    roomId?: string;
  };
  item: DeliveryItem;
  priority: PriorityTier;
  deadline: number; // simulation time in seconds
  createdAt: number;
  state: JobState;
  assignedAgentId?: string;
  triageCaseId?: string;
  pickupServiceTime: number;
  dropoffServiceTime: number;
  deliveryWindow?: TimeWindow;
  constraints?: {
    cartOnly?: boolean;
    avoidAreas?: string[];
  };
  delayReason?: string;
  infeasibleReason?: string;
  estimatedStartTime?: number;
  estimatedDeliveryTime?: number;
  isLikelyLate?: boolean;
  progress?: {
    pickedUp: boolean;
    pickupTime?: number;
    deliveredTime?: number;
  };
}

// === Triage ===

export type TriageBundle =
  | 'CRASH_CODE_BLUE'
  | 'TRAUMA'
  | 'OR_PREP'
  | 'ISOLATION';

export const TRIAGE_BUNDLES: Record<TriageBundle, { name: string; items: DeliveryItem[] }> = {
  CRASH_CODE_BLUE: {
    name: 'Crash/Code Blue',
    items: [
      { type: 'Defibrillator', quantity: 1, weight: 5 },
      { type: 'Emergency Meds', quantity: 1, weight: 0.5 },
      { type: 'IV Kit', quantity: 2, weight: 1 },
    ],
  },
  TRAUMA: {
    name: 'Trauma',
    items: [
      { type: 'Blood Products', quantity: 2, weight: 1 },
      { type: 'Surgical Kit', quantity: 1, weight: 3 },
      { type: 'Bandages', quantity: 5, weight: 0.5 },
    ],
  },
  OR_PREP: {
    name: 'OR Prep',
    items: [
      { type: 'Surgical Instruments', quantity: 1, weight: 4 },
      { type: 'Sterile Drapes', quantity: 3, weight: 1 },
      { type: 'Anesthesia Supplies', quantity: 1, weight: 2 },
    ],
  },
  ISOLATION: {
    name: 'Isolation',
    items: [
      { type: 'PPE Kit', quantity: 5, weight: 0.5 },
      { type: 'Isolation Gowns', quantity: 10, weight: 1 },
      { type: 'N95 Masks', quantity: 20, weight: 0.2 },
    ],
  },
};

export interface TriageCase {
  id: string;
  level: TriageLevel;
  location: {
    position: Position;
    floorId: string;
    roomId?: string;
  };
  bundle?: TriageBundle;
  linkedJobIds: string[];
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: number;
  notes?: string;
}

// === Plan & Routing ===

export interface RouteStep {
  position: Position;
  floorId: string;
  arrivalTime: number;
  action?: 'PICKUP' | 'DROPOFF' | 'CHARGE' | 'WAIT' | 'USE_CONNECTOR' | 'RESTOCK';
  duration?: number;
}

export interface AgentPlan {
  agentId: string;
  route: RouteStep[];
  jobIds: string[];
  estimatedEnergy: number; // Wh
  estimatedCO2: number; // g
  conflicts: { time: number; reason: string }[];
}

export interface Plan {
  timestamp: number;
  agentPlans: AgentPlan[];
  unassignedJobIds: string[];
  metrics: PlanMetrics;
}

export interface PlanMetrics {
  totalEnergyWh: number;
  totalCO2g: number;
  idleWaitingSeconds: number;
  idleChargingSeconds: number;
  onTimePercentage: number;
  batchedDeliveries: number;
  deadheadingPercentage: number;
  energyPerItem: number;
  lowEmissionChoicesPercentage: number;
}

export interface BaselineComparison {
  energySavedWh: number;
  energySavedPercentage: number;
  co2SavedG: number;
  co2SavedPercentage: number;
  deadheadingReduction: number;
  onTimeRateDifference: number;
}

// === Events ===

export type EventType =
  | 'JOB_CREATED'
  | 'JOB_ASSIGNED'
  | 'JOB_COMPLETED'
  | 'JOB_DELAYED'
  | 'JOB_INFEASIBLE'
  | 'JOB_CANCELLED'
  | 'TRIAGE_CREATED'
  | 'TRIAGE_ESCALATED'
  | 'TRIAGE_DEESCALATED'
  | 'TRIAGE_RESOLVED'
  | 'ZONE_BLOCKED'
  | 'ZONE_UNBLOCKED'
  | 'AGENT_FAILED'
  | 'AGENT_DELAYED'
  | 'AGENT_LOW_BATTERY'
  | 'INVENTORY_LOW'
  | 'RESTOCK_REQUIRED'
  | 'REPLAN_COMPLETED'
  | 'MAP_CHANGED'
  | 'PREEMPTION';

export interface SystemEvent {
  id: string;
  type: EventType;
  timestamp: number;
  summary: string;
  details?: string;
  acknowledged: boolean;
  relatedJobId?: string;
  relatedAgentId?: string;
  relatedTriageCaseId?: string;
  highlightPosition?: Position;
  highlightFloorId?: string;
  impact?: {
    timeDelta?: number;
    energyDelta?: number;
    co2Delta?: number;
    lateJobs?: string[];
  };
}

// === Simulation ===

export type SimulationState = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'REPLANNING';

export interface SimulationConfig {
  speedMultiplier: number; // 1 = real-time, 10 = 10x speed
  co2PerWh: number; // g CO2 per Wh
  defaultPickupServiceTime: number;
  defaultDropoffServiceTime: number;
  starvationThresholdSeconds: number;
}

// === Scenario (for import/export) ===

export interface Scenario {
  version: string;
  name: string;
  map: HospitalMap;
  agents: Agent[];
  jobs: Job[];
  triageCases: TriageCase[];
  config: SimulationConfig;
}
