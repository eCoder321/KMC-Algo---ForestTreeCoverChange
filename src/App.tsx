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
  History,
  Info
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
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useSimulation } from './hooks/useSimulation';
import { Visualizer } from './components/Visualizer';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { state, isRunning, setIsRunning, reset, updateConfig } = useSimulation();
  
  const forestCount = state.grid.flat().filter(c => c.type === 'FORESTED').length;
  const totalCells = state.config.gridSize * state.config.gridSize;
  const forestPercentage = (forestCount / totalCells) * 100;

  return (
    <div className="h-screen bg-[#FDFCF8] flex flex-col font-sans text-stone-800 overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 border-b border-stone-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">A</div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            Amazon EcoSim <span className="text-stone-400 font-normal">v3.0.1</span>
          </h1>
        </div>
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-stone-400 font-bold">Timeline:</span>
            <span className="text-sm font-mono bg-stone-100 px-3 py-1 rounded-md border border-stone-200 tabular-nums uppercase">
              {Math.floor(state.config.startYear + state.time)}
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
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 font-mono flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Local Multipliers (Pressure)
            </h2>
            <div className="space-y-6">
              <InputGroup 
                label="Ag Expansion (α)" 
                icon={<Activity className="w-3 h-3" />}
                value={state.config.alpha}
                onChange={(v) => updateConfig({ alpha: v })}
                min={0} max={2} step={0.01}
                tooltip="Increases probability of forest conversion to agriculture based on nearby agriculture cells (spatial clustering)."
              />
              <InputGroup 
                label="Fire Spread (β1)" 
                icon={<Flame className="w-3 h-3" />}
                value={state.config.beta1}
                onChange={(v) => updateConfig({ beta1: v })}
                min={0} max={2} step={0.01}
                accent="orange-600"
                tooltip="Sensitivity of forest to spread from adjacent burned areas (fire contagion effect)."
              />
              <InputGroup 
                label="Burn Vulnerability (β2)" 
                icon={<Flame className="w-3 h-3" />}
                value={state.config.beta2}
                onChange={(v) => updateConfig({ beta2: v })}
                min={0} max={2} step={0.01}
                accent="orange-600"
                tooltip="Increased fire risk for primary forest when bordered by logged or degraded patches."
              />
              <InputGroup 
                label="Logging Pressure (γ)" 
                icon={<Trees className="w-3 h-3" />}
                value={state.config.gamma}
                onChange={(v) => updateConfig({ gamma: v })}
                min={0} max={2} step={0.01}
                tooltip="Probability of logging activity spreading into adjacent primary forest cells."
              />
              <InputGroup 
                label="Temp Dist. Pressure (δ)" 
                icon={<Activity className="w-3 h-3" />}
                value={state.config.delta}
                onChange={(v) => updateConfig({ delta: v })}
                min={0} max={2} step={0.01}
                tooltip="Likelihood of temporary natural or human-induced disturbances based on local neighbor states."
              />
              <InputGroup 
                label="Settlement Pressure (η)" 
                icon={<Route className="w-3 h-3" />}
                value={state.config.eta}
                onChange={(v) => updateConfig({ eta: v })}
                min={0} max={2} step={0.01}
                tooltip="Incentive for infrastructure expansion near existing settlements and built environments."
              />
            </div>
          </section>

          <section className="pt-6 border-t border-stone-200">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Global Constraints</h2>
            <div className="space-y-6">
              <InputGroup 
                label="Target Year" 
                icon={<History className="w-3 h-3" />}
                value={state.config.targetYear}
                onChange={(v) => updateConfig({ targetYear: v })}
                min={2001} max={2100} step={1}
                format={(v) => `${v.toFixed(0)}`}
              />
              <InputGroup 
                label="Regrowth Rate" 
                icon={<Trees className="w-3 h-3" />}
                value={state.config.regrowthBaseRate}
                onChange={(v) => updateConfig({ regrowthBaseRate: v })}
                min={0} max={0.5} step={0.01}
              />
            </div>
          </section>

          <div className="mt-auto">
            <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
              <p className="text-[11px] leading-relaxed text-stone-500 italic">
                "Transitions now follow eligibility constraints for South Amazon: Forest loss drives degradation toward agriculture, while recovery pathways are limited by soil depletion."
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 bg-stone-50 p-8 flex flex-col gap-8 overflow-y-auto items-center">
          <div className="w-full max-w-4xl space-y-8">
            <Visualizer grid={state.grid} size={state.config.gridSize} />
            
            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center bg-white/50 p-4 rounded-xl border border-stone-200/50">
              <LegendItem color="bg-[#064e3b]" label="Forested" />
              <LegendItem color="bg-[#d97706]" label="Permanent Ag" />
              <LegendItem color="bg-[#7c2d12]" label="Burned" />
              <LegendItem color="bg-[#4d7c0f]" label="Logged / Degraded" />
              <LegendItem color="bg-[#a8a29e]" label="Temp Disturbance" />
              <LegendItem color="bg-[#1c1917]" label="Settlement" />
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
                    <XAxis 
                      dataKey="time" 
                      hide={false}
                      tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#a8a29e' }}
                      tickFormatter={(t) => Math.floor(state.config.startYear + t).toString()}
                      stroke="#e7e5e4"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#78716c' }} 
                      stroke="transparent"
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      labelFormatter={(t: any) => `Year: ${Math.floor(state.config.startYear + t)}`}
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

        {/* Right Sidebar: Rate Details Panel */}
        <aside className="w-80 border-l border-stone-200 p-6 flex flex-col gap-6 bg-white shrink-0 overflow-y-auto">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Rate Equations</h2>
          
          <div className="space-y-6 text-stone-700">
            <section className="space-y-2">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Agricultural Expansion</span>
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 font-mono text-[11px]">
                <BlockMath math={`\\lambda_{F \\to A} = ${state.config.rateFtoA.toFixed(5)} \\times (1 + ${state.config.alpha} \\cdot n_A)`} />
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Fire Dynamics</span>
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 font-mono text-[11px]">
                <BlockMath math={`\\lambda_{F \\to B} = ${state.config.rateFtoB.toFixed(5)} \\times (1 + ${state.config.beta1} \\cdot n_B + ${state.config.beta2} \\cdot n_L)`} />
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Logging Pressure</span>
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 font-mono text-[11px]">
                <BlockMath math={`\\lambda_{F \\to L} = ${state.config.rateFtoL.toFixed(5)} \\times (1 + ${state.config.gamma} \\cdot n_L)`} />
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Other Disturbance</span>
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 font-mono text-[11px]">
                <BlockMath math={`\\lambda_{F \\to O} = ${state.config.rateFtoO.toFixed(5)} \\times (1 + ${state.config.delta} \\cdot n_O)`} />
              </div>
            </section>

            <section className="space-y-2">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Settlement Expansion</span>
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 font-mono text-[11px]">
                <BlockMath math={`\\lambda_{F \\to S} = ${state.config.rateFtoS.toFixed(8)} \\times (1 + ${state.config.eta} \\cdot n_S)`} />
              </div>
            </section>

            <div className="pt-4 border-t border-stone-100">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-tight block mb-1">Current State</span>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-semibold text-emerald-900 tabular-nums">{forestPercentage.toFixed(1)}%</span>
                  <span className="text-[10px] text-emerald-700 font-medium pb-1">Forest Cover</span>
                </div>
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

function InputGroup({ label, icon, value, onChange, min, max, step, format, accent = "emerald-700", tooltip }: { 
  label: string; 
  icon: React.ReactNode; 
  value: number; 
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  accent?: string;
  tooltip?: string;
}) {
  return (
    <div className="space-y-3 p-1">
      <div className="flex justify-between items-center group relative">
        <div className="flex items-center gap-2 text-stone-700">
          <span className="opacity-40">{icon}</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-tight truncate">{label}</span>
            {tooltip && (
              <div 
                className="group/hint relative"
                title={tooltip}
              >
                <Info className="w-2.5 h-2.5 text-stone-400 hover:text-stone-600 cursor-help transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-900 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover/hint:opacity-100 group-hover/hint:visible transition-all z-[100] leading-tight">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-stone-900" />
                </div>
              </div>
            )}
          </div>
        </div>
        <span className="text-xs font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded tabular-nums shadow-sm shrink-0">
          {format ? format(value) : value.toFixed(2)}
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
    </div>
  );
}
