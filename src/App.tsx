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
  Info,
  FileSpreadsheet,
  Download,
  X,
  Zap,
  BarChart3
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
import { runSingleSimulation } from './utils/ensemble';

export default function App() {
  const { state, isRunning, setIsRunning, reset, updateConfig } = useSimulation();
  const [showReport, setShowReport] = useState(false);
  const [showEnsembleModal, setShowEnsembleModal] = useState(false);
  const [ensembleStatus, setEnsembleStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [ensembleProgress, setEnsembleProgress] = useState(0);
  const [ensembleResults, setEnsembleResults] = useState<{
    annualHistory: { year: number; percentage: number }[];
    eventCounts: {
      toAg: number;
      toBurned: number;
      toLogged: number;
      toOther: number;
      toSettlement: number;
      toForested: number;
    };
    finalCounts: {
      FORESTED: number;
      PERMANENT_AGRICULTURE: number;
      BURNED: number;
      LOGGED_DEGRADED: number;
      OTHER_TEMP_DISTURBANCE: number;
      SETTLEMENT_INFRASTRUCTURE: number;
    };
    simulatedLoss: number;
    actualLoss: number;
    accuracy: number;
    totalRuns: number;
  } | null>(null);

  const startEnsembleRun = () => {
    setEnsembleStatus('running');
    setEnsembleProgress(0);
    setEnsembleResults(null);
    setShowEnsembleModal(true);

    const totalRuns = 200;
    const batchSize = 10;
    const results: any[] = [];

    const executeBatch = (startIndex: number) => {
      if (startIndex >= totalRuns) {
        // Aggregate results
        const aggregatedHistory: { [year: number]: number } = {};
        const avgEvents = { toAg: 0, toBurned: 0, toLogged: 0, toOther: 0, toSettlement: 0, toForested: 0 };
        const avgFinals = { FORESTED: 0, PERMANENT_AGRICULTURE: 0, BURNED: 0, LOGGED_DEGRADED: 0, OTHER_TEMP_DISTURBANCE: 0, SETTLEMENT_INFRASTRUCTURE: 0 };

        results.forEach(res => {
          res.annualHistory.forEach((item: any) => {
            if (!aggregatedHistory[item.year]) {
              aggregatedHistory[item.year] = 0;
            }
            aggregatedHistory[item.year] += item.percentage;
          });

          avgEvents.toAg += res.eventCounts.toAg;
          avgEvents.toBurned += res.eventCounts.toBurned;
          avgEvents.toLogged += res.eventCounts.toLogged;
          avgEvents.toOther += res.eventCounts.toOther;
          avgEvents.toSettlement += res.eventCounts.toSettlement;
          avgEvents.toForested += res.eventCounts.toForested;

          avgFinals.FORESTED += res.finalCounts.FORESTED;
          avgFinals.PERMANENT_AGRICULTURE += res.finalCounts.PERMANENT_AGRICULTURE;
          avgFinals.BURNED += res.finalCounts.BURNED;
          avgFinals.LOGGED_DEGRADED += res.finalCounts.LOGGED_DEGRADED;
          avgFinals.OTHER_TEMP_DISTURBANCE += res.finalCounts.OTHER_TEMP_DISTURBANCE;
          avgFinals.SETTLEMENT_INFRASTRUCTURE += res.finalCounts.SETTLEMENT_INFRASTRUCTURE;
        });

        const numRuns = results.length;
        const yearsList = Object.keys(aggregatedHistory).map(Number).sort((a, b) => a - b);
        const finalAnnualHistory = yearsList.map(yr => ({
          year: yr,
          percentage: aggregatedHistory[yr] / numRuns
        }));

        const finalEvents = {
          toAg: avgEvents.toAg / numRuns,
          toBurned: avgEvents.toBurned / numRuns,
          toLogged: avgEvents.toLogged / numRuns,
          toOther: avgEvents.toOther / numRuns,
          toSettlement: avgEvents.toSettlement / numRuns,
          toForested: avgEvents.toForested / numRuns,
        };

        const finalCounts = {
          FORESTED: avgFinals.FORESTED / numRuns,
          PERMANENT_AGRICULTURE: avgFinals.PERMANENT_AGRICULTURE / numRuns,
          BURNED: avgFinals.BURNED / numRuns,
          LOGGED_DEGRADED: avgFinals.LOGGED_DEGRADED / numRuns,
          OTHER_TEMP_DISTURBANCE: avgFinals.OTHER_TEMP_DISTURBANCE / numRuns,
          SETTLEMENT_INFRASTRUCTURE: avgFinals.SETTLEMENT_INFRASTRUCTURE / numRuns,
        };

        const averageEndingPct = finalAnnualHistory[finalAnnualHistory.length - 1]?.percentage ?? 100;
        const simulatedLoss = 100 - averageEndingPct;
        const actualLoss = 6.27; // User's requested calibration baseline (6.27%)
        const error = Math.abs(simulatedLoss - actualLoss);
        const accuracy = Math.max(0, 100 * (1 - error / actualLoss));

        setEnsembleResults({
          annualHistory: finalAnnualHistory,
          eventCounts: finalEvents,
          finalCounts,
          simulatedLoss,
          actualLoss,
          accuracy,
          totalRuns
        });
        setEnsembleStatus('completed');
        return;
      }

      const limit = Math.min(startIndex + batchSize, totalRuns);
      for (let i = startIndex; i < limit; i++) {
        results.push(runSingleSimulation(state.config));
      }

      setEnsembleProgress(limit);
      setTimeout(() => executeBatch(limit), 0);
    };

    setTimeout(() => executeBatch(0), 10);
  };

  const exportEnsembleToCSV = () => {
    if (!ensembleResults) return;

    const sections = [];

    sections.push("MONTE CARLO ENSEMBLE SIMULATION SUMMARY REPORT");
    sections.push(`Total Monte Carlo Iterations,${ensembleResults.totalRuns}`);
    sections.push(`Historical Actual Cover Loss Reference (%),${ensembleResults.actualLoss.toFixed(4)}%`);
    sections.push(`Avg Simulated Cover Loss (%),${ensembleResults.simulatedLoss.toFixed(4)}%`);
    sections.push(`Simulation Accuracy (%),${ensembleResults.accuracy.toFixed(2)}%`);
    sections.push("");

    sections.push("AVERAGE ENDING LAND COVER CELL COUNTS");
    sections.push("Land Cover Type,Average Cells,Percentage (%)");
    const totalCells = state.config.gridSize * state.config.gridSize;
    sections.push(`Forested,${ensembleResults.finalCounts.FORESTED.toFixed(2)},${(ensembleResults.finalCounts.FORESTED / totalCells * 100).toFixed(2)}%`);
    sections.push(`Permanent Agriculture,${ensembleResults.finalCounts.PERMANENT_AGRICULTURE.toFixed(2)},${(ensembleResults.finalCounts.PERMANENT_AGRICULTURE / totalCells * 100).toFixed(2)}%`);
    sections.push(`Burned (Scar),${ensembleResults.finalCounts.BURNED.toFixed(2)},${(ensembleResults.finalCounts.BURNED / totalCells * 100).toFixed(2)}%`);
    sections.push(`Logged/Degraded,${ensembleResults.finalCounts.LOGGED_DEGRADED.toFixed(2)},${(ensembleResults.finalCounts.LOGGED_DEGRADED / totalCells * 100).toFixed(2)}%`);
    sections.push(`Other Temp Disturbance,${ensembleResults.finalCounts.OTHER_TEMP_DISTURBANCE.toFixed(2)},${(ensembleResults.finalCounts.OTHER_TEMP_DISTURBANCE / totalCells * 100).toFixed(2)}%`);
    sections.push(`Settlement/Infrastructure,${ensembleResults.finalCounts.SETTLEMENT_INFRASTRUCTURE.toFixed(2)},${(ensembleResults.finalCounts.SETTLEMENT_INFRASTRUCTURE / totalCells * 100).toFixed(2)}%`);
    sections.push("");

    sections.push("AVERAGE CUMULATIVE TRANSITION EVENTS PER SIMULATION");
    sections.push("Transition Event,Average Count");
    sections.push(`Forested -> Permanent Agriculture,${ensembleResults.eventCounts.toAg.toFixed(2)}`);
    sections.push(`Forested -> Burned (Scar),${ensembleResults.eventCounts.toBurned.toFixed(2)}`);
    sections.push(`Forested -> Logged/Degraded,${ensembleResults.eventCounts.toLogged.toFixed(2)}`);
    sections.push(`Forested -> Other Temp Disturbance,${ensembleResults.eventCounts.toOther.toFixed(2)}`);
    sections.push(`Forested -> Settlement/Infrastructure,${ensembleResults.eventCounts.toSettlement.toFixed(2)}`);
    sections.push(`Regrowth & Forest Recovery,${ensembleResults.eventCounts.toForested.toFixed(2)}`);
    sections.push("");

    sections.push("YEARLY ENSEMBLE AVERAGE FOREST COVER PATH");
    sections.push("Year,Average Forest Cover (%),Avg Cumulative Loss (%)");
    ensembleResults.annualHistory.forEach((item: any) => {
      const cumLoss = 100 - item.percentage;
      sections.push(`${item.year},${item.percentage.toFixed(4)},${cumLoss.toFixed(4)}`);
    });

    const csvContent = sections.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `monte_carlo_ensemble_report_200runs.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const forestCount = state.grid.flat().filter(c => c.type === 'FORESTED').length;
  const totalCells = state.config.gridSize * state.config.gridSize;
  const forestPercentage = (forestCount / totalCells) * 100;

  const reportRows = state.annualHistory.map((item, index) => {
    const previous = index > 0 ? state.annualHistory[index - 1] : null;
    const yoyChange = previous ? item.percentage - previous.percentage : 0;
    const cumulativeLoss = item.percentage - 100;
    return {
      ...item,
      yoyChange,
      cumulativeLoss,
    };
  });

  const exportToCSV = () => {
    const headers = ["Year", "Forest Cover (%)", "YoY Change (%)", "Cumulative Loss (%)"];
    const rows = state.annualHistory.map((item, index) => {
      const prev = index > 0 ? state.annualHistory[index - 1] : null;
      const yoyChange = prev ? item.percentage - prev.percentage : 0;
      const cumulativeLoss = item.percentage - 100;
      return [
        item.year,
        item.percentage.toFixed(4),
        yoyChange.toFixed(4),
        cumulativeLoss.toFixed(4)
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `forest_simulation_report_${state.config.startYear}_to_${state.config.targetYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <button 
              onClick={() => setShowReport(true)}
              className="px-4 h-8 rounded-full bg-stone-100 text-stone-750 hover:bg-stone-250 hover:text-stone-900 border border-stone-200 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
              title="Open Annual Report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Annual Report</span>
            </button>
            <button 
              onClick={startEnsembleRun}
              className="px-4 h-8 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-200 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Run Monte Carlo Ensemble (200x)"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Ensemble Run (200x)</span>
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

      <AnimatePresence>
        {showReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
            onClick={() => setShowReport(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl shadow-2xl flex flex-col max-w-4xl w-full max-h-[85vh] overflow-hidden border border-stone-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                    Annual Simulation Report
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Yearly breakdown of simulated forest cover loss, regrowth rate, and net transition change.
                  </p>
                </div>
                <button 
                  onClick={() => setShowReport(false)}
                  className="w-8 h-8 rounded-full hover:bg-stone-200/80 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Stats Summary Banner */}
              <div className="grid grid-cols-4 divide-x divide-stone-100 border-b border-stone-200 bg-white p-5 shrink-0">
                <div className="px-4">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Start Year</span>
                  <span className="text-xl font-bold font-mono text-stone-800">{state.config.startYear}</span>
                </div>
                <div className="px-4">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Simulation Span</span>
                  <span className="text-xl font-bold font-mono text-stone-800">{state.annualHistory.length - 1} Years</span>
                </div>
                <div className="px-4">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Forest Lost</span>
                  <span className="text-xl font-bold font-mono text-rose-600">
                    {Math.max(0, 100 - forestPercentage).toFixed(2)}%
                  </span>
                </div>
                <div className="px-4">
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Current Forest Cover</span>
                  <span className="text-xl font-bold font-mono text-emerald-700">{forestPercentage.toFixed(2)}%</span>
                </div>
              </div>

              {/* Content Table Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 font-mono text-[10px] text-stone-400 font-bold uppercase border-b border-stone-200 select-none">
                        <th className="py-3 px-5">Year</th>
                        <th className="py-3 px-5">Forest Cover (%)</th>
                        <th className="py-3 px-5">Annual Net Change</th>
                        <th className="py-3 px-5 text-right">Cumulative Loss (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-sans text-sm">
                      {reportRows.map((row, index) => {
                        const isNegative = row.yoyChange < 0;
                        const isPositive = row.yoyChange > 0;
                        
                        return (
                          <tr key={row.year} className="hover:bg-stone-50/40 transition-colors">
                            <td className="py-3 px-5 font-mono font-semibold text-stone-900">
                              {row.year}
                            </td>
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-stone-800 w-14">
                                  {row.percentage.toFixed(2)}%
                                </span>
                                <div className="flex-1 h-2 bg-stone-100 rounded-full max-w-[120px] overflow-hidden hidden sm:block">
                                  <div 
                                    className="h-full bg-emerald-600" 
                                    style={{ width: `${row.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-5 font-mono">
                              {index === 0 ? (
                                <span className="text-stone-400 text-xs">Baseline</span>
                              ) : isNegative ? (
                                <span className="text-rose-600 font-medium flex items-center gap-0.5">
                                  ↓ {row.yoyChange.toFixed(2)}%
                                </span>
                              ) : isPositive ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                                  ↑ +{row.yoyChange.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-stone-400">0.00%</span>
                              )}
                            </td>
                            <td className="py-3 px-5 text-right font-mono font-medium text-stone-600">
                              {row.cumulativeLoss === 0 ? (
                                <span className="text-stone-400">0.00%</span>
                              ) : (
                                <span className={cn(
                                  row.cumulativeLoss < 0 ? "text-amber-800" : "text-emerald-800"
                                )}>
                                  {row.cumulativeLoss.toFixed(2)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
                <button 
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 group cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                  <span>Export CSV Report</span>
                </button>
                
                <button 
                  onClick={() => setShowReport(false)}
                  className="px-4 py-2 hover:bg-stone-200 border border-stone-300 text-stone-700 bg-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showEnsembleModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-[200]"
            onClick={() => {
              if (ensembleStatus !== 'running') setShowEnsembleModal(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl shadow-2xl flex flex-col max-w-4xl w-full max-h-[90vh] overflow-hidden border border-stone-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 animate-fade-in">
                <div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Monte Carlo Ensemble Calibration Model
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Simulating {ensembleResults?.totalRuns || 200} runs step-by-step with randomized stochastics to assess parameter convergence and variance.
                  </p>
                </div>
                {ensembleStatus !== 'running' && (
                  <button 
                    onClick={() => setShowEnsembleModal(false)}
                    className="w-8 h-8 rounded-full hover:bg-stone-200/80 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Simulation Progress Screen */}
              {ensembleStatus === 'running' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-stone-50/50">
                  <div className="w-16 h-16 rounded-full border-4 border-stone-200 border-t-emerald-700 animate-spin mb-6"></div>
                  <h4 className="text-sm font-bold text-stone-700 uppercase tracking-widest font-mono mb-2">
                    Simulating Monte Carlo Batches
                  </h4>
                  <p className="text-xs text-stone-400 mb-6">
                    Evaluating spatial stochastics at cell level. Iterative KMC matrix calculation in progress.
                  </p>
                  <div className="w-full max-w-sm bg-stone-200 h-2.5 rounded-full overflow-hidden shadow-inner mb-2">
                    <div 
                      className="bg-emerald-700 h-full transition-all duration-150" 
                      style={{ width: `${(ensembleProgress / 200) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-600">
                    {ensembleProgress} / 200 Iterations Completed ({(ensembleProgress / 200 * 100).toFixed(0)}%)
                  </span>
                </div>
              )}

              {ensembleStatus === 'completed' && ensembleResults && (
                <>
                  {/* Calibration Top Dashboard Row */}
                  <div className="grid grid-cols-4 divide-x divide-stone-100 border-b border-stone-200 bg-white p-5 shrink-0 select-none">
                    <div className="px-5">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block font-mono">Iterations</span>
                      <span className="text-xl font-bold font-mono text-stone-800">{ensembleResults.totalRuns}x</span>
                    </div>
                    <div className="px-5">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block font-mono">Avg Simulated Loss</span>
                      <span className="text-xl font-bold font-mono text-rose-600">
                        {ensembleResults.simulatedLoss.toFixed(4)}%
                      </span>
                    </div>
                    <div className="px-5">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block font-mono">Calibration Target</span>
                      <span className="text-xl font-bold font-mono text-stone-800">
                        {ensembleResults.actualLoss.toFixed(3)}%
                      </span>
                    </div>
                    <div className="px-5">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block font-mono">Calibration Accuracy</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className={cn(
                          "text-xl font-bold font-mono",
                          ensembleResults.accuracy > 90 ? "text-emerald-700" : ensembleResults.accuracy > 70 ? "text-amber-700" : "text-rose-600"
                        )}>
                          {ensembleResults.accuracy.toFixed(2)}%
                        </span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest",
                          ensembleResults.accuracy > 90 ? "bg-emerald-100 text-emerald-800" : ensembleResults.accuracy > 70 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        )}>
                          {ensembleResults.accuracy > 90 ? "Optimal" : ensembleResults.accuracy > 70 ? "Fair" : "Low"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50 flex flex-col gap-6">
                    
                    {/* Trajectory Plot */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                      <div className="text-[10px] font-mono text-stone-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-stone-400" />
                        Averaged Forest Cover Trajectory ({state.config.startYear} - {state.config.targetYear})
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={ensembleResults.annualHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                            <XAxis 
                              dataKey="year" 
                              stroke="#78716c" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              domain={[95, 100]} 
                              stroke="#78716c" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(v) => `${v.toFixed(1)}%`}
                            />
                            <Tooltip 
                              contentStyle={{ background: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'monospace', fontSize: '11px' }}
                              labelFormatter={(label) => `Year: ${label}`}
                              formatter={(v: any) => [`${v.toFixed(3)}%`, "Forest Cover %"]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="percentage" 
                              stroke="#047857" 
                              strokeWidth={2.5} 
                              dot={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: Annual Data Table */}
                      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 text-[10px] font-mono text-stone-400 uppercase tracking-widest font-bold flex justify-between items-center select-none">
                          <span>Averaged Yearly Cover Path</span>
                          <span className="text-emerald-700">Cover %</span>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto divide-y divide-stone-100">
                          {ensembleResults.annualHistory.map((row, index) => {
                            const prev = index > 0 ? ensembleResults.annualHistory[index - 1] : null;
                            const cumLoss = 100 - row.percentage;
                            return (
                              <div key={row.year} className="px-4 py-2 hover:bg-stone-50 flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-stone-800">{row.year}</span>
                                <div className="flex items-center gap-4 text-stone-600">
                                  <span>{row.percentage.toFixed(4)}%</span>
                                  <span className="w-16 text-right text-rose-600 font-medium">
                                    -{cumLoss.toFixed(4)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Event Statistics & Land Cover Distribution */}
                      <div className="flex flex-col gap-6">
                        
                        {/* Event Averages */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 text-[10px] font-mono text-stone-400 uppercase tracking-widest font-bold select-none">
                            Averaged Event Count Summary
                          </div>
                          <div className="p-4 space-y-2.5 font-mono text-xs">
                            <div className="flex justify-between items-center text-stone-600">
                              <span>Forested → Agriculture:</span>
                              <span className="font-bold text-stone-800">{ensembleResults.eventCounts.toAg.toFixed(2)} events</span>
                            </div>
                            <div className="flex justify-between items-center text-stone-600">
                              <span>Forested → Burn Scars:</span>
                              <span className="font-bold text-stone-800">{ensembleResults.eventCounts.toBurned.toFixed(2)} events</span>
                            </div>
                            <div className="flex justify-between items-center text-stone-600">
                              <span>Forested → Logged:</span>
                              <span className="font-bold text-stone-800">{ensembleResults.eventCounts.toLogged.toFixed(2)} events</span>
                            </div>
                            <div className="flex justify-between items-center text-stone-600">
                              <span>Forested → Other Dist.:</span>
                              <span className="font-bold text-stone-800">{ensembleResults.eventCounts.toOther.toFixed(2)} events</span>
                            </div>
                            <div className="flex justify-between items-center text-stone-600">
                              <span>Forested → Settlements:</span>
                              <span className="font-bold text-stone-800">{ensembleResults.eventCounts.toSettlement.toFixed(2)} events</span>
                            </div>
                          </div>
                        </div>

                        {/* Ending Land Cover cells */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 text-[10px] font-mono text-stone-400 uppercase tracking-widest font-bold select-none">
                            Avg Ending Land Cover (Cells)
                          </div>
                          <div className="p-4 space-y-2.5 font-sans text-xs">
                            <div className="flex items-center justify-between text-stone-600">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block" />
                                Forest:
                              </span>
                              <span className="font-mono font-bold text-stone-800">
                                {ensembleResults.finalCounts.FORESTED.toFixed(1)} cells
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-stone-600">
                              <span className="flex items-center gap-2 border-stone-200">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                                Agriculture:
                              </span>
                              <span className="font-mono font-bold text-stone-800">
                                {ensembleResults.finalCounts.PERMANENT_AGRICULTURE.toFixed(1)} cells
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-stone-600">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
                                Burned Scar:
                              </span>
                              <span className="font-mono font-bold text-stone-800">
                                {ensembleResults.finalCounts.BURNED.toFixed(1)} cells
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-stone-600">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                                Logged/Degraded:
                              </span>
                              <span className="font-mono font-bold text-stone-800">
                                {ensembleResults.finalCounts.LOGGED_DEGRADED.toFixed(1)} cells
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Fine Calibration Info Footer */}
                  <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
                    <button 
                      onClick={exportEnsembleToCSV}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 group cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                      <span>Export Ensemble CSV</span>
                    </button>
                    
                    <button 
                      onClick={() => setShowEnsembleModal(false)}
                      className="px-4 py-2 hover:bg-stone-200 border border-stone-300 text-stone-700 bg-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Dismiss Model
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
