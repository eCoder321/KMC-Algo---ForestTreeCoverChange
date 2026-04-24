export enum CellType {
  FOREST = 'FOREST',
  DEGRADED = 'DEGRADED',
  RESTORING = 'RESTORING',
  BURNT = 'BURNT',
}

export interface GridCell {
  id: string;
  x: number;
  y: number;
  type: CellType;
  slope: number; // 0 to 1
  distToRoad: number; // Normalized 0 to 1
  isProtected: boolean;
  lastFireTime: number;
  fireProbability: number;
}

export interface SimulationState {
  grid: GridCell[][];
  time: number;
  forestCoverHistory: { time: number; percentage: number }[];
  config: SimulationConfig;
}

export interface SimulationConfig {
  gridSize: number;
  deforestationBaseRate: number;
  regrowthBaseRate: number;
  fireBaseRate: number;
  roadImpactWeight: number;
  slopeImpactWeight: number;
  neighborImpactWeight: number;
  protectionFactor: number; // Multiplier (e.g., 0.1 for 90% reduction)
}
