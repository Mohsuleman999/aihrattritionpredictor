import React from 'react';
import { Lightbulb } from 'lucide-react';
import { DatasetInsight } from '../types/hr';

interface KeyInsightsPanelProps {
  insights: DatasetInsight[];
}

export const KeyInsightsPanel: React.FC<KeyInsightsPanelProps> = ({ insights }) => {
  return (
    <section
      aria-label="Workforce Intelligence & Key Insights"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Workforce Intelligence &amp; Key Insights
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated findings calculated directly from the active filtered workforce dataset
          </p>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Observational correlations · Does not establish single-factor causation
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="py-6 text-xs text-slate-500 dark:text-slate-400 text-center">
          No insights available for the current filter selection.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((ins) => {
            const accentText =
              ins.tone === 'warning'
                ? 'text-red-700 dark:text-red-400'
                : ins.tone === 'positive'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-violet-700 dark:text-violet-300';

            return (
              <article
                key={ins.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{ins.topic}</span>
                    <span className={`font-bold tabular-nums ${accentText}`}>{ins.metricBadge}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {ins.headline}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ins.detail}</p>
                </div>
                <p className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
                  {ins.evidenceNote}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
