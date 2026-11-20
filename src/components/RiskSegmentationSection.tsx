import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { RiskCategory } from '../types/hr';
import { formatPercent, getRiskStyle } from '../utils/formatters';

export interface ScoredActiveEmployee {
  employeeId: string;
  department: string;
  jobRole: string;
  jobSatisfactionScore: number;
  overtime: 'Yes' | 'No';
  absenceDays: number;
  probability: number;
  riskCategory: RiskCategory;
}

interface RiskSegmentationSectionProps {
  scoredActive: ScoredActiveEmployee[];
  modelIsValid: boolean;
  unavailableReason: string | null;
}

const SEGMENTS: {
  category: RiskCategory;
  thresholdLabel: string;
  description: string;
}[] = [
  {
    category: 'Low',
    thresholdLabel: '< 25% predicted exit probability',
    description: 'Low modeled exit likelihood relative to workforce baseline.',
  },
  {
    category: 'Medium',
    thresholdLabel: '25% – 49.9% predicted exit probability',
    description: 'Moderate risk signals; monitor workload and engagement check-ins.',
  },
  {
    category: 'High',
    thresholdLabel: '50% – 74.9% predicted exit probability',
    description: 'Elevated attrition risk; prioritize supportive manager review.',
  },
  {
    category: 'Critical',
    thresholdLabel: '≥ 75% predicted exit probability',
    description: 'Highest modeled exit risk; immediate retention dialogue recommended.',
  },
];

export const RiskSegmentationSection: React.FC<RiskSegmentationSectionProps> = ({
  scoredActive,
  modelIsValid,
  unavailableReason,
}) => {
  const totalActive = scoredActive.length;

  return (
    <section
      aria-label="Employee Risk Segmentation"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Employee Risk Segmentation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active workforce ({totalActive.toLocaleString()} employees) grouped by calibrated ML exit probability thresholds
          </p>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          Thresholds: Low &lt;25% · Medium 25–49% · High 50–74% · Critical ≥75%
        </p>
      </div>

      {!modelIsValid ? (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          {unavailableReason ?? 'Risk segmentation is unavailable because the supervised prediction model could not be trained on this dataset.'}
        </div>
      ) : totalActive === 0 ? (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          No active employees match the current filter selection.
        </div>
      ) : (
        <>
          {/* Proportional stacked bar */}
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-5">
            {SEGMENTS.map((seg) => {
              const count = scoredActive.filter((e) => e.riskCategory === seg.category).length;
              const pct = totalActive > 0 ? (count / totalActive) * 100 : 0;
              const style = getRiskStyle(seg.category);
              if (pct <= 0) return null;
              return (
                <div
                  key={seg.category}
                  style={{ width: `${pct}%` }}
                  className={`${style.barClass} transition-all duration-300`}
                  title={`${seg.category} Risk: ${count} (${formatPercent(pct)})`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SEGMENTS.map((seg) => {
              const count = scoredActive.filter((e) => e.riskCategory === seg.category).length;
              const pct = totalActive > 0 ? (count / totalActive) * 100 : 0;
              const style = getRiskStyle(seg.category);

              return (
                <div
                  key={seg.category}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${style.textClass}`}>{seg.category} Risk</span>
                      <span className={`w-2.5 h-2.5 rounded-sm ${style.barClass}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {count.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ({formatPercent(pct)})
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {seg.thresholdLabel}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {seg.description}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
