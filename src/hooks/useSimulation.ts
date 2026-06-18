import { useState, useCallback, useRef, useEffect } from 'react';
import { CellType, GridCell, SimulationConfig, SimulationState } from '../types';

const INITIAL_CONFIG: SimulationConfig = {
  gridSize: 40,
  startYear: 2000,
  targetYear: 2024,
  rateFtoA: 0.001360306,
  rateFtoB: 0.0000707808,
  rateFtoL: 0.0000304576,
  rateFtoO: 0.000110815,
  rateFtoS: 0.000000844248,
  regrowthBaseRate: 0.0000651,
  alpha: 0.25,
  beta1: 0.35,
  beta2: 0.20,
  gamma: 0.10,
  delta: 0.08,
  eta: 0.15,
};

export function useSimulation() {
  //these initialize the starting state
  const [state, setState] = useState<SimulationState>(() => {
    const grid = generateInitialGrid(INITIAL_CONFIG.gridSize);
    return {
      grid,
      time: 0,
      forestCoverHistory: [{ time: 0, percentage: 100 }],
      annualHistory: [{ year: INITIAL_CONFIG.startYear, percentage: 100 }],
      config: INITIAL_CONFIG,
    };
  });

  const [isRunning, setIsRunning] = useState(false);
  const stateRef = useRef(state);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const updateConfig = useCallback((newConfig: Partial<SimulationConfig>) => {
    setState(prev => {
      const config = { ...prev.config, ...newConfig };
      // If gridSize changed, we might need to regenerate the grid.
      // For simplicity, let's keep it fixed or handle resize.
      return { ...prev, config };
    });
  }, []);

  const reset = useCallback(() => {
    const grid = generateInitialGrid(stateRef.current.config.gridSize);
    setState({
      grid,
      time: 0,
      forestCoverHistory: [{ time: 0, percentage: 100 }],
      annualHistory: [{ year: stateRef.current.config.startYear, percentage: 100 }],
      config: stateRef.current.config,
    });
  }, []);

  // The Kinetic Monte Carlo step
  const step = useCallback(() => {
    const { grid, config, time, forestCoverHistory } = stateRef.current;
    const size = config.gridSize;
    
    // 1. Calculate rates for all possible events
    const events: { x: number; y: number; rate: number; nextType: CellType }[] = [];
    let totalRate = 0;

    // Boundary check for target year
    if (time >= (config.targetYear - config.startYear)) {
      setIsRunning(false);
      return;
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        const pushEvent = (rate: number, nextType: CellType) => {
          if (rate > 0) {
            events.push({ x, y, rate, nextType });
            totalRate += rate;
          }
        };

        // Neighbor counts for multipliers
        let nA = 0; // Ag
        let nB = 0; // Burned
        let nL = 0; // Logged
        let nO = 0; // Other
        let nS = 0; // Settlement
        
        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        neighbors.forEach(([dx, dy]) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
             const type = grid[ny][nx].type;
             if (type === CellType.PERMANENT_AGRICULTURE) nA++;
             else if (type === CellType.BURNED) nB++;
             else if (type === CellType.LOGGED_DEGRADED) nL++;
             else if (type === CellType.OTHER_TEMP_DISTURBANCE) nO++;
             else if (type === CellType.SETTLEMENT_INFRASTRUCTURE) nS++;
          }
        });

        if (cell.type === CellType.FORESTED) {
          // Forested -> Ag, Burn, Logged, Disturbance, Settlement
          pushEvent(config.rateFtoA * (1 + config.alpha * nA), CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoB * (1 + config.beta1 * nB + config.beta2 * nL), CellType.BURNED);
          pushEvent(config.rateFtoL * (1 + config.gamma * nL), CellType.LOGGED_DEGRADED);
          pushEvent(config.rateFtoO * (1 + config.delta * nO), CellType.OTHER_TEMP_DISTURBANCE);
          pushEvent(config.rateFtoS * (1 + config.eta * nS), CellType.SETTLEMENT_INFRASTRUCTURE);

        } else if (cell.type === CellType.BURNED) {
          // Burned -> Forested, Ag, Disturbance
          pushEvent(config.regrowthBaseRate, CellType.FORESTED);
          //just using heuristics - we don't have a set rate of burned to Perm Agriculture or Other temp disturbance
          pushEvent(config.rateFtoA * 0.5, CellType.PERMANENT_AGRICULTURE); 
          pushEvent(config.rateFtoO * 0.2, CellType.OTHER_TEMP_DISTURBANCE);

        } else if (cell.type === CellType.LOGGED_DEGRADED) {
          // Logged -> Forested, Ag, Burn, Disturbance
          pushEvent(config.regrowthBaseRate * 0.7, CellType.FORESTED);
          pushEvent(config.rateFtoA * 0.8, CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoB * 1.5, CellType.BURNED);
          pushEvent(config.rateFtoO * 0.3, CellType.OTHER_TEMP_DISTURBANCE);

        } else if (cell.type === CellType.OTHER_TEMP_DISTURBANCE) {
          // Disturbance -> Forested, Ag, Burn
          pushEvent(config.regrowthBaseRate * 1.2, CellType.FORESTED);
          pushEvent(config.rateFtoA * 0.4, CellType.PERMANENT_AGRICULTURE);
          pushEvent(config.rateFtoB, CellType.BURNED);
        }
        // Agriculture and Settlement are sinks (no transitions out)
      }
    }

    //totalRate == 0 means nothing happened this step
    if (totalRate === 0) return;

    // 2. Determine time increment dt
    const dt = Math.log( 1 / (1 - Math.random())) / totalRate;

    // 3. Select which event occurs
    const r = Math.random() * totalRate;
    let cumulativeRate = 0;
    let selectedEvent = null;

    //O(N) approach - we could use BinarySearch to make this cost logN instead of just looping through. future iteration
    for (const event of events) {
      cumulativeRate += event.rate;
      if (r <= cumulativeRate) {
        selectedEvent = event;
        break;
      }
    }

    if (selectedEvent) {
      const newGrid = grid.map(row => [...row]);
      const cell = newGrid[selectedEvent.y][selectedEvent.x];
      newGrid[selectedEvent.y][selectedEvent.x] = {
        ...cell,
        type: selectedEvent.nextType,
        lastFireTime: selectedEvent.nextType === CellType.BURNED ? time + dt : cell.lastFireTime,
      };

      // Calculate statistics
      let forestCount = 0;
      newGrid.forEach(row => row.forEach(c => {
        if (c.type === CellType.FORESTED) forestCount++;
      }));
      const percentage = (forestCount / (size * size)) * 100;

      setState(prev => {
        const nextTime = prev.time + dt;
        const oldYear = Math.floor(prev.config.startYear + prev.time);
        const newYear = Math.floor(prev.config.startYear + nextTime);
        const updatedAnnual = [...prev.annualHistory];

        if (newYear > oldYear) {
          for (let y = oldYear + 1; y <= newYear; y++) {
            if (!updatedAnnual.some(item => item.year === y)) {
              updatedAnnual.push({ year: y, percentage });
            }
          }
        }

        return {
          ...prev,
          grid: newGrid,
          time: nextTime,
          forestCoverHistory: [...prev.forestCoverHistory, { time: nextTime, percentage }].slice(-100),
          annualHistory: updatedAnnual,
        };
      });
    }
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (isRunning) {
      intervalId = setInterval(() => {
        for (let i = 0; i < 5; i++) {
          step();
        }
      }, 30);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, step]);

  return {
    state,
    isRunning,
    setIsRunning,
    reset,
    updateConfig
  };
}

function generateInitialGrid(size: number): GridCell[][] {
  const grid: GridCell[][] = [];

  for (let y = 0; y < size; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < size; x++) {
      let type = CellType.FORESTED;
      
      row.push({
        id: `${x}-${y}`,
        x,
        y,
        type,
        lastFireTime: -1,
      });
    }
    grid.push(row);
  }
  return grid;
}
