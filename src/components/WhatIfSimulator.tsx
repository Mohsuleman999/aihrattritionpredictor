import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RotateCcw, Sliders } from 'lucide-react';
import { predictAttrition, TrainedAttritionModel } from '../ml/attritionModel';
import { PredictionInput } from '../types/hr';
import { formatNaira, getRiskStyle } from '../utils/formatters';

interface WhatIfSimulatorProps {
  model: TrainedAttritionModel;
  baselineInput: PredictionInput;
  selectedEmployeeLabel: string;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  model,
  baselineInput,
  selectedEmployeeLabel,
}) => {
  const [simInput, setSimInput] = useState<PredictionInput>(baselineInput);

  useEffect(() => {
    setSimInput(baselineInput);
  }, [baselineInput]);

  const baselineResult = useMemo(() => predictAttrition(model, baselineInput), [model, baselineInput]);
  const simulatedResult = useMemo(() => predictAttrition(model, simInput), [model, simInput]);

  if (!model.metadata.isValid || !baselineResult || !simulatedResult) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          What-If Attrition Simulator
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          What-If scenario simulation is unavailable until a valid attrition model can be trained on the uploaded dataset.
        </p>
      </section>
    );
  }

  const basePct = baselineResult.probability * 100;
  const simPct = simulatedResult.probability * 100;
  const deltaPp = simPct - basePct;

  const baseStyle = getRiskStyle(baselineResult.riskCategory);
  const simStyle = getRiskStyle(simulatedResult.riskCategory);

  const resetScenario = () => setSimInput(baselineInput);

  return (
    <section
      aria-label="What-If Attrition Simulator"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            What-If Attrition Simulator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Explore how adjustments to workload, satisfaction, training, or attendance alter modeled risk for{' '}
            <strong className="text-slate-700 dark:text-slate-200">{selectedEmployeeLabel}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={resetScenario}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Scenario
        </button>
      </div>

      {/* Quick Presets */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Quick Scenarios:
        </span>
        <button
          type="button"
          onClick={() =>
            setSimInput((s) => ({ ...s, jobSatisfactionScore: Math.min(5, s.jobSatisfactionScore + 1) }))
          }
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors"
        >
          +1 Job Satisfaction
        </button>
        <button
          type="button"
          onClick={() => setSimInput((s) => ({ ...s, overtime: 'No' }))}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors"
        >
          Remove Overtime
        </button>
        <button
          type="button"
          onClick={() => setSimInput((s) => ({ ...s, trainingHours: s.trainingHours + 15 }))}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors"
        >
          +15 Training Hours
        </button>
        <button
          type="button"
          onClick={() => setSimInput((s) => ({ ...s, absenceDays: Math.max(0, Math.round(s.absenceDays * 0.5)) }))}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors"
        >
          Halve Absence Days
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Sliders */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-sat" className="font-medium text-slate-700 dark:text-slate-200">
                Job Satisfaction Score
              </label>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {simInput.jobSatisfactionScore} / 5
              </span>
            </div>
            <input
              id="sim-sat"
              type="range"
              min={1}
              max={5}
              step={1}
              value={simInput.jobSatisfactionScore}
              onChange={(e) => setSimInput({ ...simInput, jobSatisfactionScore: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-200">Overtime Status</span>
              <span className="font-bold text-slate-900 dark:text-white">{simInput.overtime}</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              {(['No', 'Yes'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSimInput({ ...simInput, overtime: val })}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                    simInput.overtime === val
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {val === 'No' ? 'No Overtime' : 'Overtime: Yes'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-train" className="font-medium text-slate-700 dark:text-slate-200">
                Training Hours
              </label>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {simInput.trainingHours} hrs
              </span>
            </div>
            <input
              id="sim-train"
              type="range"
              min={0}
              max={80}
              step={1}
              value={Math.min(80, simInput.trainingHours)}
              onChange={(e) => setSimInput({ ...simInput, trainingHours: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-abs" className="font-medium text-slate-700 dark:text-slate-200">
                Absence Days
              </label>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {simInput.absenceDays} days
              </span>
            </div>
            <input
              id="sim-abs"
              type="range"
              min={0}
              max={30}
              step={1}
              value={Math.min(30, simInput.absenceDays)}
              onChange={(e) => setSimInput({ ...simInput, absenceDays: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-salary" className="font-medium text-slate-700 dark:text-slate-200">
                Salary (NGN)
              </label>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {formatNaira(simInput.salaryNgn)}
              </span>
            </div>
            <input
              id="sim-salary"
              type="range"
              min={200000}
              max={1300000}
              step={10000}
              value={Math.max(200000, Math.min(1300000, simInput.salaryNgn))}
              onChange={(e) => setSimInput({ ...simInput, salaryNgn: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="sim-perf" className="font-medium text-slate-700 dark:text-slate-200">
                Performance Rating
              </label>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {simInput.performanceRating} / 5
              </span>
            </div>
            <input
              id="sim-perf"
              type="range"
              min={1}
              max={5}
              step={1}
              value={simInput.performanceRating}
              onChange={(e) => setSimInput({ ...simInput, performanceRating: Number(e.target.value) })}
              className="w-full accent-violet-600"
            />
          </div>
        </div>

        {/* Before vs After Comparison */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-4">
          <div className="grid grid-cols-3 items-center gap-2 text-center tabular-nums">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Baseline Risk</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{basePct.toFixed(1)}%</p>
              <p className={`mt-0.5 text-[11px] font-bold ${baseStyle.textClass}`}>
                {baselineResult.riskCategory}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-1" />
              <span
                className={`text-sm font-extrabold ${
                  deltaPp < -0.2
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : deltaPp > 0.2
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {deltaPp >= 0 ? '+' : ''}
                {deltaPp.toFixed(1)} pp
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Change</span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Simulated Risk</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{simPct.toFixed(1)}%</p>
              <p className={`mt-0.5 text-[11px] font-bold ${simStyle.textClass}`}>
                {simulatedResult.riskCategory}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            These results are model-based scenario estimates reflecting historical patterns learned from your dataset, not proven causal effects of policy changes.
          </p>
        </div>
      </div>
    </section>
  );
};
