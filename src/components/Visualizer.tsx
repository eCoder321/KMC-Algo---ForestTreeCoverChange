import React, { useRef, useEffect } from 'react';
import { GridCell, CellType } from '../types';

interface VisualizerProps {
  grid: GridCell[][];
  size: number;
}

const COLORS = {
  [CellType.FOREST]: '#064e3b', // emerald-900
  [CellType.DEGRADED]: '#d6d3d1', // stone-300
  [CellType.RESTORING]: '#34d399', // emerald-400
  [CellType.BURNT]: '#fdba74', // orange-300
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
        
        // Road infrastructure
        if (cell.distToRoad < 0.015) {
          ctx.fillStyle = '#78716c'; // stone-600
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
        
        // Protection buffer
        if (cell.isProtected) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'; // emerald-500
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
        }
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
