import React, { useRef, useEffect } from 'react';
import { GridCell, CellType } from '../types';

interface VisualizerProps {
  grid: GridCell[][];
  size: number;
}

const COLORS = {
  [CellType.FORESTED]: '#064e3b', // emerald-900
  [CellType.PERMANENT_AGRICULTURE]: '#d97706', // amber-600
  [CellType.BURNED]: '#7c2d12', // orange-900 (scorched)
  [CellType.LOGGED_DEGRADED]: '#4d7c0f', // lime-900 (muted olive)
  [CellType.OTHER_TEMP_DISTURBANCE]: '#a8a29e', // stone-400
  [CellType.SETTLEMENT_INFRASTRUCTURE]: '#1c1917', // stone-900 (industrial)
};

export const Visualizer: React.FC<VisualizerProps> = ({ grid, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = grid[y][x];
        ctx.fillStyle = COLORS[cell.type];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        
        // Consistent subtle light grid for all cells
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }, [grid, size]);

  return (
    <div className="relative aspect-square w-full bg-stone-100 p-4 rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 overflow-hidden">
      <div className="w-full h-full rounded-sm overflow-hidden border border-stone-200">
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          className="w-full h-full image-render-pixelated bg-white"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="absolute top-8 left-8 px-2 py-1 bg-white/90 backdrop-blur-sm rounded border border-stone-200 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">
        Spatial Analysis Grid
      </div>
    </div>
  );
};
