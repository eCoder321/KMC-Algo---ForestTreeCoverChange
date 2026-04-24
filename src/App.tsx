import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  Trees, 
  Flame, 
  Shield, 
  Mountain, 
  Route,
  Activity,
  History
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useSimulation } from './hooks/useSimulation';
import { Visualizer } from './components/Visualizer';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { state, isRunning, setIsRunning, reset, updateConfig } = useSimulation();
  
  const forestCount = state.grid.flat().filter(c => c.type === 'FOREST').length;
  const totalCells = state.config.gridSize * state.config.gridSize;
  const forestPercentage = (forestCount / totalCells) * 100;

  return (
    <div className="h-screen bg-[#FDFCF8] flex flex-col font-sans text-stone-800 overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 border-b border-stone-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">S</div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            SilvaCore <span className="text-stone-400 font-normal">v2.4.1</span>
          </h1>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-stone-400 font-bold">Simulation Clock:</span>
            <span className="text-sm font-mono bg-stone-100 px-3 py-1 rounded-md border border-stone-200 tabular-nums lowercase">
              yr {state.time.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsRunning(!isRunning)}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-sm",
                isRunning 
                  ? "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200" 
                  : "bg-emerald-800 text-white hover:bg-emerald-900"
              )}
            >
              {isRunning ? 'Pause Engine' : 'Resume Engine'}
            </button>
            <button 
              onClick={reset}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 border border-stone-200 transition-colors"
              title="Reset Timeline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Parameters */}
        <aside className="w-72 bg-[#F9F8F3] border-r border-stone-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
          <section>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Simulation Parameters</h2>
            <div className="space-y-8">
              <InputGroup 
                label="Neighborhood Sensitivity" 
                icon={<Activity className="w-3 h-3" />}
                value={state.config.neighborImpactWeight}
                onChange={(v) => updateConfig({ neighborImpactWeight: v })}
                min={0} max={10} step={0.1}
              />
              <InputGroup 
                label="Fire Propagation Weight" 
                icon={<Flame className="w-3 h-3" />}
                value={state.config.fireBaseRate * 100}
                onChange={(v) => updateConfig({ fireBaseRate: v / 100 })}
                min={0} max={10} step={0.1}
                accent="orange-600"
              />
            </div>
          </section>

          <section className="pt-6 border-t border-stone-200">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Environmental Constraints</h2>
            <div className="space-y-6">
              <InputGroup 
                label="Elevation Gradient" 
                icon={<Mountain className="w-3 h-3" />}
                value={state.config.slopeImpactWeight}
                onChange={(v) => updateConfig({ slopeImpactWeight: v })}
                min={0} max={5} step={0.1}
              />
              <InputGroup 
                label="Road Infrastructure" 
                icon={<Route className="w-3 h-3" />}
                value={state.config.roadImpactWeight}
                onChange={(v) => updateConfig({ roadImpactWeight: v })}
                min={0} max={10} step={0.1}
              />
              <InputGroup 
                label="Protected Area Buffer" 
                icon={<Shield className="w-3 h-3" />}
                value={(1 - state.config.protectionFactor) * 100}
                onChange={(v) => updateConfig({ protectionFactor: 1 - v / 100 })}
                min={0} max={100} step={5}
                format={(v) => `${v.toFixed(0)}%`}
              />
            </div>
          </section>

          <div className="mt-auto">
            <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
              <p className="text-[11px] leading-relaxed text-stone-500 italic">
                "Current KMC state suggests a stable climax community in the NW sector, but increased road proximity is accelerating edge-effect erosion."
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 bg-stone-50 p-8 flex flex-col gap-8 overflow-y-auto items-center">
          <div className="w-full max-w-4xl space-y-8">
            <Visualizer grid={state.grid} size={state.config.gridSize} />
            
            {/* Legend */}
            <div className="flex gap-8 justify-center">
              <LegendItem color="bg-emerald-900" label="Primary Forest" />
              <LegendItem color="bg-emerald-400" label="Regeneration" />
              <LegendItem color="bg-orange-300" label="Fire Scars" />
              <LegendItem color="bg-stone-300" label="Deforested" />
              <LegendItem color="bg-stone-600" label="Road/Built" />
            </div>

            {/* History Chart */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Forest Cover Trajectory</span>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={state.forestCoverHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#78716c' }} 
                      stroke="transparent"
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        borderRadius: '12px',
                        border: '1px solid #e7e5e4',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#064e3b" 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Analysis Panel */}
        <aside className="w-64 border-l border-stone-200 p-6 flex flex-col gap-6 bg-white shrink-0 overflow-y-auto">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Analysis Panel</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-[#FDFCF8] rounded-xl border border-stone-100 shadow-sm">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Forest Cover</span>
              <div className="text-2xl font-semibold text-emerald-800 tabular-nums">
                {forestPercentage.toFixed(1)}%
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full mt-3 overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-600" 
                  initial={{ width: 0 }}
                  animate={{ width: `${forestPercentage}%` }}
                />
              </div>
            </div>
            
            <div className="p-4 bg-[#FDFCF8] rounded-xl border border-stone-100 shadow-sm">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Regrowth Capacity</span>
              <div className="text-2xl font-semibold text-emerald-800 tabular-nums">
                {(forestPercentage / 80).toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Index value (λ)</span>
            </div>

            <div className="p-4 bg-[#FDFCF8] rounded-xl border border-stone-100 shadow-sm">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Connectivity Metrics</span>
              <div className="flex gap-1 mt-3 items-end h-10">
                {[20, 40, 50, 30, 60, 80, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-emerald-100 rounded-t-sm" style={{ height: `${h}%` }}>
                    <div className="w-full bg-emerald-600 rounded-t-sm" style={{ height: `${(forestPercentage/100) * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <button 
              className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium text-sm hover:bg-stone-800 transition-colors shadow-sm"
              onClick={() => setIsRunning(!isRunning)}
            >
              Toggle Simulation
            </button>
            <button 
              className="w-full py-3 border border-stone-200 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors"
              onClick={reset}
            >
              Reset Timeline
            </button>
          </div>
        </aside>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-emerald-950 text-emerald-200 flex items-center px-8 text-[10px] uppercase tracking-wider shrink-0 font-medium">
        <div className="flex-1 flex gap-8">
          <span className="flex items-center gap-2">
            <span className="opacity-40">Engine:</span> KMC-Spatial-V2
          </span>
          <span className="flex items-center gap-2">
            <span className="opacity-40">Resolution:</span> {state.config.gridSize}x{state.config.gridSize}
          </span>
          <span className="flex items-center gap-2">
            <span className="opacity-40">Nodes:</span> {totalCells}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isRunning ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-stone-500"
          )} />
          <span className="opacity-80">{isRunning ? 'Real-time processing active' : 'Engine Idle'}</span>
        </div>
      </footer>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-[1px]", color)}></div>
      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function InputGroup({ label, icon, value, onChange, min, max, step, format, accent = "emerald-700" }: { 
  label: string; 
  icon: React.ReactNode; 
  value: number; 
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  accent?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-stone-700">
          <span className="opacity-40">{icon}</span>
          <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
        </div>
        <span className="text-xs font-mono bg-stone-100 px-1.5 py-0.5 rounded tabular-nums">
          {format ? format(value) : value.toFixed(1)}
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          "w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer",
          accent === "orange-600" ? "accent-orange-600" : "accent-emerald-700"
        )}
      />
      {label === "Neighborhood Sensitivity" && (
        <div className="flex justify-between text-[10px] text-stone-400 font-medium uppercase tracking-tighter -mt-1">
          <span>Local</span>
          <span>Regional</span>
        </div>
      )}
    </div>
  );
}
