export enum CellType {
  FORESTED = 'FORESTED',
  PERMANENT_AGRICULTURE = 'PERMANENT_AGRICULTURE',
  BURNED = 'BURNED',
  LOGGED_DEGRADED = 'LOGGED_DEGRADED',
  OTHER_TEMP_DISTURBANCE = 'OTHER_TEMP_DISTURBANCE',
  SETTLEMENT_INFRASTRUCTURE = 'SETTLEMENT_INFRASTRUCTURE',
}

export interface GridCell {
  id: string;
  x: number;
  y: number;
  type: CellType
}

export interface SimulationState {
  grid: GridCell[][];
  time: number;
  forestCoverHistory: { time: number; percentage: number }[];
  annualHistory: { year: number; percentage: number }[];
  config: SimulationConfig;
}

export interface SimulationConfig {
  gridSize: number;
  startYear: number;
  targetYear: number;
  // Base rates (per year)
  rateFtoA: number; // Forested -> AG
  rateFtoB: number; // Forested -> Burned
  rateFtoL: number; // Forested -> Logged
  rateFtoO: number; // Forested -> Other
  rateFtoS: number; // Forested -> Settlement
  regrowthBaseRate: number;

  // Local Multipliers (Neighborhood Sensitivity)
  alpha: number; // Ag pressure
  beta1: number; // Fire spread
  gamma: number; // Logging pressure
  delta: number; // Other dist pressure
  eta: number;   // Settlement pressure
  kappa1: number; // Forest pressure on temp disturbance cells
  kappa2: number; // Permanent Ag pressure on temp disturbance cells
}
