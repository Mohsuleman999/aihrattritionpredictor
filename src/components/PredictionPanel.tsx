import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrainedAttritionModel } from '../ml/attritionModel';
import { EmployeeRecord, PredictionInput, PredictionResult, ValidationMetrics } from '../types/hr';
import { FilterOptions } from '../utils/analytics';
import { formatPercent, getRiskStyle } from '../utils/formatters';

interface PredictionPanelProps {
  model: TrainedAttritionModel;
  records: EmployeeRecord[];
  options: FilterOptions;
  selectedEmployeeId: string;
  input: PredictionInput;
  result: PredictionResult | null;
  hasPendingEdits: boolean;
  isDark: boolean;
  onSelectEmployee: (employeeId: string) => void;
  onInputChange: (next: PredictionInput) => void;
  onPredict: () => void;
}

const CircularProbabilityGauge: React.FC<{
  probability: number;
  riskStyle: ReturnType<typeof getRiskStyle>;
  isDark: boolean;
}> = ({ probability, riskStyle, isDark }) => {
  const pct = Math.round(probability * 100);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, probability)));

  return (
    <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
      <svg
        className="w-32 h-32 -rotate-90"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Estimated probability of leaving: ${pct}%`}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={isDark ? '#1e293b' : '#e2e8f0'}
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={riskStyle.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
          {pct}%
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Exit Prob
        </span>
      </div>
    </div>
  );
};

export const PredictionPanel: React.FC<PredictionPanelProps> = ({
  model,
  records,
  options,
  selectedEmployeeId,
  input,
  result,
  hasPendingEdits,
  isDark,
  onSelectEmployee,
  onInputChange,
  onPredict,
}) => {
  const [activeTab, setActiveTab] = useState<'predict' | 'importance' | 'validation'>('predict');
  const [validationView, setValidationView] = useState<'primary' | 'alternate'>('primary');

  const activeEmployees = records.filter((r) => r.employmentStatus === 'Active');
  const exitedEmployees = records.filter((r) => r.employmentStatus === 'Exited');
  const selectedRecord = records.find((r) => r.employeeId === selectedEmployeeId);

  const meta = model.metadata;
  const activeValidation: ValidationMetrics | null =
    validationView === 'alternate' && meta.alternateValidation
      ? meta.alternateValidation
      : meta.validation;

  const updateField = <K extends keyof PredictionInput>(key: K, val: PredictionInput[K]) => {
    onInputChange({ ...input, [key]: val });
  };

  const riskStyle = result ? getRiskStyle(result.riskCategory) : null;
  const topImportance = meta.featureImportance.slice(0, 10);

  const fieldInputClass =
    'w-full h-8 px-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <aside
      aria-label="AI-Powered Attrition Prediction"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden"
    >
      {/* Panel Header */}
      <div className="bg-[#1b163a] dark:bg-[#110d29] text-white px-5 py-4 border-b border-indigo-950/60 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-violet-300 shrink-0" />
            <h2 className="text-base font-bold tracking-tight truncate">
              AI-Powered Attrition Prediction
            </h2>
          </div>
        </div>
        <p className="mt-1 text-xs text-indigo-200/85">
          Trained supervised ML risk scoring · Protected traits excluded
        </p>

        {/* Sub-navigation Tabs */}
        <div className="mt-3 flex items-center gap-1 p-1 bg-white/10 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('predict')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'predict'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            Risk Scoring
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('importance')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'importance'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            Feature Weights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('validation')}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'validation'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            Model Quality
          </button>
        </div>
      </div>

      {!meta.isValid ? (
        <div className="p-5 space-y-3">
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Prediction Model Unavailable</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  {meta.unavailableReason}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'predict' ? (
        <div className="p-5 space-y-5">
          {/* Employee Selector */}
          <div>
            <label
              htmlFor="predict-emp-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Load Existing Employee Record
            </label>
            <select
              id="predict-emp-select"
              value={selectedEmployeeId}
              onChange={(e) => onSelectEmployee(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Custom Scenario (Manual Input)</option>
              {activeEmployees.length > 0 && (
                <optgroup label={`Active Employees (${activeEmployees.length})`}>
                  {activeEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId} — {emp.department} · {emp.jobRole}
                    </option>
                  ))}
                </optgroup>
              )}
              {exitedEmployees.length > 0 && (
                <optgroup label={`Exited Employees — Historical Reference (${exitedEmployees.length})`}>
                  {exitedEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId} (Exited) — {emp.department} · {emp.jobRole}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {selectedRecord && (
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Status:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {selectedRecord.employmentStatus}
                </span>
                {selectedRecord.hireDate ? ` · Hired ${selectedRecord.hireDate}` : ''}
                {selectedRecord.yearsSinceHire !== null
                  ? ` · ${selectedRecord.yearsSinceHire.toFixed(1)} yrs since hire`
                  : ''}
              </p>
            )}
          </div>

          {/* Editable Prediction Form */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="pred-dept" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Department
              </label>
              <select
                id="pred-dept"
                value={input.department}
                onChange={(e) => updateField('department', e.target.value)}
                className={fieldInputClass}
              >
                {options.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="pred-role" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Job Role
              </label>
              <select
                id="pred-role"
                value={input.jobRole}
                onChange={(e) => updateField('jobRole', e.target.value)}
                className={fieldInputClass}
              >
                {options.jobRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pred-emp-type" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Employment Type
              </label>
              <select
                id="pred-emp-type"
                value={input.employmentType}
                onChange={(e) => updateField('employmentType', e.target.value)}
                className={fieldInputClass}
              >
                {options.employmentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pred-overtime" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Overtime
              </label>
              <select
                id="pred-overtime"
                value={input.overtime}
                onChange={(e) => updateField('overtime', e.target.value as 'Yes' | 'No')}
                className={fieldInputClass}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label htmlFor="pred-salary" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Salary (₦ NGN)
              </label>
              <input
                id="pred-salary"
                type="number"
                min={0}
                step={5000}
                value={input.salaryNgn}
                onChange={(e) => updateField('salaryNgn', Math.max(0, Number(e.target.value) || 0))}
                className={`${fieldInputClass} tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="pred-age" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Age (Display only)
              </label>
              <input
                id="pred-age"
                type="number"
                min={18}
                max={75}
                value={input.age ?? ''}
                onChange={(e) => updateField('age', e.target.value ? Number(e.target.value) : null)}
                className="w-full h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="pred-perf" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Performance (1–5)
              </label>
              <input
                id="pred-perf"
                type="number"
                min={1}
                max={5}
                step={1}
                value={input.performanceRating}
                onChange={(e) =>
                  updateField('performanceRating', Math.min(5, Math.max(1, Number(e.target.value) || 1)))
                }
                className={`${fieldInputClass} tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="pred-sat" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Job Satisfaction (1–5)
              </label>
              <input
                id="pred-sat"
                type="number"
                min={1}
                max={5}
                step={1}
                value={input.jobSatisfactionScore}
                onChange={(e) =>
                  updateField('jobSatisfactionScore', Math.min(5, Math.max(1, Number(e.target.value) || 1)))
                }
                className={`${fieldInputClass} tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="pred-train" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Training Hours
              </label>
              <input
                id="pred-train"
                type="number"
                min={0}
                max={300}
                step={1}
                value={input.trainingHours}
                onChange={(e) => updateField('trainingHours', Math.max(0, Number(e.target.value) || 0))}
                className={`${fieldInputClass} tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="pred-abs" className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Absence Days
              </label>
              <input
                id="pred-abs"
                type="number"
                min={0}
                max={120}
                step={1}
                value={input.absenceDays}
                onChange={(e) => updateField('absenceDays', Math.max(0, Number(e.target.value) || 0))}
                className={`${fieldInputClass} tabular-nums`}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Age and Gender are excluded from model scoring to avoid using protected demographic characteristics.
          </p>

          {/* Prominent Predict Button */}
          <button
            type="button"
            onClick={onPredict}
            className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <Sparkles className="w-4 h-4" />
            Predict Attrition Risk
          </button>

          {hasPendingEdits && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 text-center font-medium">
              Input values changed — click Predict Attrition Risk to update the score below.
            </p>
          )}

          {/* Prediction Result Output */}
          {result && riskStyle && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col items-center text-center">
                <CircularProbabilityGauge probability={result.probability} riskStyle={riskStyle} isDark={isDark} />

                <div className="mt-3 space-y-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Predicted Exit Risk</p>
                  <p className={`text-lg font-extrabold tracking-tight uppercase ${riskStyle.textClass}`}>
                    {result.riskCategory}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    Estimated Probability of Leaving:{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {Math.round(result.probability * 100)}%
                    </strong>
                    <span className="text-slate-400 dark:text-slate-600"> · </span>
                    Workforce Baseline: {Math.round(result.baselineProbability * 100)}%
                  </p>
                </div>
              </div>

              {/* Key Risk Drivers */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Key Risk Drivers</h3>
                <div className="space-y-2">
                  {result.drivers.slice(0, 6).map((drv) => (
                    <div
                      key={drv.featureLabel}
                      className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {drv.direction === 'risk-up' ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {drv.featureLabel}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            ({drv.inputValue})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 leading-snug">
                          {drv.explanation}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold tabular-nums shrink-0 ${
                          drv.direction === 'risk-up'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {drv.probabilityImpactPp >= 0 ? '+' : ''}
                        {drv.probabilityImpactPp.toFixed(1)} pp
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision-Support Disclaimer */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Exploratory decision-support estimate based on historical associations, not a guarantee or automatic grounds for employment decisions.
                </span>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'importance' ? (
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              Global Model Feature Importance
            </h3>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Standardized log-odds magnitude (|β|) from {meta.algorithmName}. Red increases predicted exit risk; green reduces risk.
            </p>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topImportance}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={138}
                  tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#334155' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md tabular-nums">
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-1">Standardized |β|: {item.importance.toFixed(3)}</p>
                        <p className="text-slate-300">
                          Direction: {item.direction === 'increases-risk' ? 'Increases risk' : 'Reduces risk'} (β={item.coefficient.toFixed(3)})
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]} barSize={16}>
                  {topImportance.map((item) => (
                    <Cell
                      key={item.featureKey}
                      fill={item.direction === 'increases-risk' ? '#dc2626' : '#16a34a'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              <strong className="text-slate-700 dark:text-slate-200">Tenure feature:</strong> {meta.tenureFeatureNote}
            </p>
            <p>
              <strong className="text-slate-700 dark:text-slate-200">Excluded fields:</strong>{' '}
              {meta.excludedFeatures.join(', ')}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {meta.alternateValidation && meta.validation && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setValidationView('primary')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors ${
                  validationView === 'primary'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {meta.validation.splitMethod === 'stratified' ? 'Stratified 80/20' : 'Chronological Split'}
              </button>
              <button
                type="button"
                onClick={() => setValidationView('alternate')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors ${
                  validationView === 'alternate'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {meta.alternateValidation.splitMethod === 'stratified'
                  ? 'Stratified 80/20'
                  : 'Chronological Split'}
              </button>
            </div>
          )}

          {activeValidation && (
            <>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white capitalize">
                  {activeValidation.splitMethod} Validation ({activeValidation.trainCount} train /{' '}
                  {activeValidation.testCount} test)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{activeValidation.splitRationale}</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 rounded-md px-2.5 py-1.5">
                  Limitation: {activeValidation.splitLimitation}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 tabular-nums">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">ROC-AUC</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {activeValidation.rocAuc !== null ? activeValidation.rocAuc.toFixed(3) : 'N/A'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Accuracy</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {formatPercent(activeValidation.accuracy * 100)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Precision / Recall</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatPercent(activeValidation.precision * 100)} /{' '}
                    {formatPercent(activeValidation.recall * 100)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">F1 Score</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {activeValidation.f1Score.toFixed(3)}
                  </p>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Validation Confusion Matrix
                </p>
                <div className="grid grid-cols-2 gap-2 text-center tabular-nums text-xs">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      True Negative (Retained)
                    </p>
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      {activeValidation.confusionMatrix.tn}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60">
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">False Positive</p>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      {activeValidation.confusionMatrix.fp}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60">
                    <p className="text-[10px] text-red-700 dark:text-red-400 font-medium">False Negative</p>
                    <p className="text-sm font-bold text-red-900 dark:text-red-200">
                      {activeValidation.confusionMatrix.fn}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60">
                    <p className="text-[10px] text-violet-700 dark:text-violet-300 font-medium">
                      True Positive (Exited)
                    </p>
                    <p className="text-sm font-bold text-violet-900 dark:text-violet-200">
                      {activeValidation.confusionMatrix.tp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Probability Calibration Check */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Probability Calibration Check
                  </p>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    {activeValidation.calibrationStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                  <span>Brier Score: {activeValidation.brierScore.toFixed(3)}</span>
                  <span>ECE: {activeValidation.ece.toFixed(3)}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  Mean predicted: {formatPercent(activeValidation.meanPredictedProb * 100)} vs Observed exit rate:{' '}
                  {formatPercent(activeValidation.observedExitRate * 100)}
                </div>
                {activeValidation.calibrationBins.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {activeValidation.calibrationBins.map((bin) => (
                      <div
                        key={bin.binLabel}
                        className="flex items-center justify-between text-[11px] tabular-nums text-slate-600 dark:text-slate-300"
                      >
                        <span>
                          Bin {bin.binLabel} (n={bin.count})
                        </span>
                        <span>
                          Pred {formatPercent(bin.avgPredicted * 100)} · Obs {formatPercent(bin.observedRate * 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
