import { useState, useCallback, useRef, useEffect } from 'react';
import { CellType, GridCell, SimulationConfig, SimulationState } from '../types';

const INITIAL_CONFIG: SimulationConfig = {
  gridSize: 40,
  deforestationBaseRate: 0.1,
  regrowthBaseRate: 0.05,
  fireBaseRate: 0.01,
  roadImpactWeight: 2.0,
  slopeImpactWeight: 0.5,
  neighborImpactWeight: 1.5,
  protectionFactor: 0.1,
};

export function useSimulation() {
  const [state, setState] = useState<SimulationState>(() => {
    const grid = generateInitialGrid(INITIAL_CONFIG.gridSize);
    return {
      grid,
      time: 0,
      forestCoverHistory: [{ time: 0, percentage: 100 }],
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

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        let rate = 0;
        let nextType: CellType | null = null;

        if (cell.type === CellType.FOREST) {
          // FOREST -> DEGRADED (Deforestation)
          const roadImpact = Math.exp(-cell.distToRoad * 5) * config.roadImpactWeight;
          const slopeImpact = (1 - cell.slope) * config.slopeImpactWeight;
          
          // Neighbor impact (nearby forest loss)
          let neighborLoss = 0;
          const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
          neighbors.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
               if (grid[ny][nx].type !== CellType.FOREST) neighborLoss++;
            }
          });
          const neighborImpact = (neighborLoss / 4) * config.neighborImpactWeight;
          const protectionImpact = cell.isProtected ? config.protectionFactor : 1;

          rate = config.deforestationBaseRate * (1 + roadImpact + neighborImpact + slopeImpact) * protectionImpact;
          nextType = CellType.DEGRADED;
          
          // FIRE event
          const fireRate = config.fireBaseRate * (neighborLoss * 0.5 + 1);
          events.push({ x, y, rate: fireRate, nextType: CellType.BURNT });
          totalRate += fireRate;

        } else if (cell.type === CellType.DEGRADED) {
          // DEGRADED -> RESTORING
          rate = config.regrowthBaseRate;
          nextType = CellType.RESTORING;
        } else if (cell.type === CellType.RESTORING) {
          // RESTORING -> FOREST
          rate = config.regrowthBaseRate * 2;
          nextType = CellType.FOREST;
          
          // FIRE event
          const fireRate = config.fireBaseRate * 0.5;
          events.push({ x, y, rate: fireRate, nextType: CellType.BURNT });
          totalRate += fireRate;
        } else if (cell.type === CellType.BURNT) {
          // BURNT -> DEGRADED
          rate = config.regrowthBaseRate * 0.5;
          nextType = CellType.DEGRADED;
        }

        if (rate > 0 && nextType) {
          events.push({ x, y, rate, nextType });
          totalRate += rate;
        }
      }
    }

    if (totalRate === 0) return;

    // 2. Determine time increment dt
    const dt = -Math.log(Math.random()) / totalRate;

    // 3. Select which event occurs
    const r = Math.random() * totalRate;
    let cumulativeRate = 0;
    let selectedEvent = null;

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
        lastFireTime: selectedEvent.nextType === CellType.BURNT ? time + dt : cell.lastFireTime,
      };

      // Calculate statistics
      let forestCount = 0;
      newGrid.forEach(row => row.forEach(c => {
        if (c.type === CellType.FOREST) forestCount++;
      }));
      const percentage = (forestCount / (size * size)) * 100;

      setState(prev => ({
        ...prev,
        grid: newGrid,
        time: prev.time + dt,
        forestCoverHistory: [...prev.forestCoverHistory, { time: prev.time + dt, percentage }].slice(-100),
      }));
    }
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (isRunning) {
      intervalId = setInterval(() => {
        // Run multiple steps per interval to speed up the visual simulation if needed
        // but KMC is event-based. We'll do 1 step per frame approximate.
        // Actually, we can batch steps if dt is very small.
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
  
  // Roads: simplified as one or two lines
  const hasRoad = (x: number, y: number) => {
    return Math.abs(x - size * 0.3) < 1 || Math.abs(y - size * 0.7) < 1;
  };

  for (let y = 0; y < size; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < size; x++) {
      // Distance to nearest road
      const dist1 = Math.abs(x - size * 0.3) / size;
      const dist2 = Math.abs(y - size * 0.7) / size;
      const distToRoad = Math.min(dist1, dist2);

      // Slope: some pattern
      const slope = (Math.sin(x * 0.2) * Math.cos(y * 0.2) + 1) / 2;

      // Protection: central area or specific block
      const isProtected = x > size * 0.5 && y < size * 0.5;

      row.push({
        id: `${x}-${y}`,
        x,
        y,
        type: CellType.FOREST,
        slope,
        distToRoad,
        isProtected,
        lastFireTime: -1,
        fireProbability: 0.01,
      });
    }
    grid.push(row);
  }
  return grid;
}
