import { CellType, SimulationConfig } from '../types';

export interface EnsembleRunResult {
  finalCounts: {
    FORESTED: number;
    PERMANENT_AGRICULTURE: number;
    BURNED: number;
    LOGGED_DEGRADED: number;
    OTHER_TEMP_DISTURBANCE: number;
    SETTLEMENT_INFRASTRUCTURE: number;
  };
  eventCounts: {
    toAg: number;
    toBurned: number;
    toLogged: number;
    toOther: number;
    toSettlement: number;
    toForested: number;
  };
  annualHistory: { year: number; percentage: number }[];
}

export function runSingleSimulation(config: SimulationConfig): EnsembleRunResult {
  const size = config.gridSize;
  const numYears = config.targetYear - config.startYear;

  // Initialize all cells to FORESTED
  const grid: CellType[][] = Array.from({ length: size }, () =>
    Array(size).fill(CellType.FORESTED)
  );

  let time = 0;
  let toAg = 0;
  let toBurned = 0;
  let toLogged = 0;
  let toOther = 0;
  let toSettlement = 0;
  let toForested = 0;

  const annualHistory: { year: number; percentage: number }[] = [
    { year: config.startYear, percentage: 100 }
  ];
  let lastRecordedYear = config.startYear;

  const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (time < numYears) {
    const events: { x: number; y: number; rate: number; nextType: CellType }[] = [];
    let totalRate = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const type = grid[y][x];

        const pushEvent = (rate: number, nextType: CellType) => {
          if (rate > 0) {
            events.push({ x, y, rate, nextType });
            totalRate += rate;
          }
        };

        // Count neighbors on the fly
        let nA = 0;
        let nB = 0;
        let nL = 0;
        let nO = 0;
        let nS = 0;

        for (let i = 0; i < neighbors.length; i++) {
          const nx = x + neighbors[i][0];
          const ny = y + neighbors[i][1];
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            const nt = grid[ny][nx];
            if (nt === CellType.PERMANENT_AGRICULTURE) nA++;
            else if (nt === CellType.BURNED) nB++;
            else if (nt === CellType.LOGGED_DEGRADED) nL++;
            else if (nt === CellType.OTHER_TEMP_DISTURBANCE) nO++;
            else if (nt === CellType.SETTLEMENT_INFRASTRUCTURE) nS++;
          }
        }

        if (type === CellType.FORESTED) {
          pushEvent(config.rateFtoA * (1 + config.alpha * nA), CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoB * (1 + config.beta1 * nB + config.beta2 * nL), CellType.BURNED);
          pushEvent(config.rateFtoL * (1 + config.gamma * nL), CellType.LOGGED_DEGRADED);
          pushEvent(config.rateFtoO * (1 + config.delta * nO), CellType.OTHER_TEMP_DISTURBANCE);
          pushEvent(config.rateFtoS * (1 + config.eta * nS), CellType.SETTLEMENT_INFRASTRUCTURE);
        } else if (type === CellType.BURNED) {
          pushEvent(config.regrowthBaseRate, CellType.FORESTED);
          pushEvent(config.rateFtoA * 0.5, CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoO * 0.2, CellType.OTHER_TEMP_DISTURBANCE);
        } else if (type === CellType.LOGGED_DEGRADED) {
          pushEvent(config.regrowthBaseRate * 0.7, CellType.FORESTED);
          pushEvent(config.rateFtoA * 0.8, CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoB * 1.5, CellType.BURNED);
          pushEvent(config.rateFtoO * 0.3, CellType.OTHER_TEMP_DISTURBANCE);
        } else if (type === CellType.OTHER_TEMP_DISTURBANCE) {
          pushEvent(config.regrowthBaseRate * 1.2, CellType.FORESTED);
          pushEvent(config.rateFtoA * 0.4, CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoB, CellType.BURNED);
        }
      }
    }

    if (totalRate === 0) break;

    const dt = -Math.log(Math.random()) / totalRate;
    const nextTime = time + dt;

    const r = Math.random() * totalRate;
    let cumulativeRate = 0;
    let selectedEvent = null;

    for (let i = 0; i < events.length; i++) {
      cumulativeRate += events[i].rate;
      if (r <= cumulativeRate) {
        selectedEvent = events[i];
        break;
      }
    }

    if (!selectedEvent) break;

    // Apply selected transition
    grid[selectedEvent.y][selectedEvent.x] = selectedEvent.nextType;

    // Increment event counters
    if (selectedEvent.nextType === CellType.PERMANENT_AGRICULTURE) toAg++;
    else if (selectedEvent.nextType === CellType.BURNED) toBurned++;
    else if (selectedEvent.nextType === CellType.LOGGED_DEGRADED) toLogged++;
    else if (selectedEvent.nextType === CellType.OTHER_TEMP_DISTURBANCE) toOther++;
    else if (selectedEvent.nextType === CellType.SETTLEMENT_INFRASTRUCTURE) toSettlement++;
    else if (selectedEvent.nextType === CellType.FORESTED) toForested++;

    // Calculate statistics
    let forestCount = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === CellType.FORESTED) forestCount++;
      }
    }
    const percentage = (forestCount / (size * size)) * 100;

    const oldYear = Math.floor(config.startYear + time);
    const newYear = Math.floor(config.startYear + nextTime);

    if (newYear > oldYear) {
      for (let y = oldYear + 1; y <= newYear; y++) {
        if (y <= config.targetYear) {
          annualHistory.push({ year: y, percentage });
          lastRecordedYear = y;
        }
      }
    }

    time = nextTime;
  }

  // Backfill if years missed or if simulation is early
  let finalForested = 0;
  let finalAg = 0;
  let finalBurned = 0;
  let finalLogged = 0;
  let finalOther = 0;
  let finalSettlement = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const type = grid[y][x];
      if (type === CellType.FORESTED) finalForested++;
      else if (type === CellType.PERMANENT_AGRICULTURE) finalAg++;
      else if (type === CellType.BURNED) finalBurned++;
      else if (type === CellType.LOGGED_DEGRADED) finalLogged++;
      else if (type === CellType.OTHER_TEMP_DISTURBANCE) finalOther++;
      else if (type === CellType.SETTLEMENT_INFRASTRUCTURE) finalSettlement++;
    }
  }

  const endingPct = (finalForested / (size * size)) * 100;
  for (let y = lastRecordedYear + 1; y <= config.targetYear; y++) {
    annualHistory.push({ year: y, percentage: endingPct });
  }

  return {
    finalCounts: {
      FORESTED: finalForested,
      PERMANENT_AGRICULTURE: finalAg,
      BURNED: finalBurned,
      LOGGED_DEGRADED: finalLogged,
      OTHER_TEMP_DISTURBANCE: finalOther,
      SETTLEMENT_INFRASTRUCTURE: finalSettlement,
    },
    eventCounts: {
      toAg,
      toBurned,
      toLogged,
      toOther,
      toSettlement,
      toForested,
    },
    annualHistory,
  };
}
