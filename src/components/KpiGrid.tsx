import React from 'react';
import {
  Award,
  Banknote,
  Clock,
  HeartHandshake,
  TrendingDown,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { KpiMetrics } from '../types/hr';
import { formatDecimal, formatNaira, formatPercent } from '../utils/formatters';

interface KpiGridProps {
  kpis: KpiMetrics;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis }) => {
  const activeShare = kpis.totalEmployees > 0 ? (kpis.activeEmployees / kpis.totalEmployees) * 100 : 0;

  const cards = [
    {
      title: 'Total Employees',
      value: kpis.totalEmployees.toLocaleString(),
      subtext: `Across ${kpis.distinctDepartments} distinct department${kpis.distinctDepartments === 1 ? '' : 's'}`,
      icon: Users,
      iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      title: 'Active Employees',
      value: kpis.activeEmployees.toLocaleString(),
      subtext: `${formatPercent(activeShare)} of filtered headcount`,
      icon: UserCheck,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
      valueClass: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      title: 'Exited Employees',
      value: kpis.exitedEmployees.toLocaleString(),
      subtext: `${formatPercent(kpis.recordedExitRate)} recorded exit share`,
      icon: UserMinus,
      iconBg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400',
      valueClass: 'text-red-700 dark:text-red-400',
    },
    {
      title: 'Attrition Rate',
      value: formatPercent(kpis.recordedExitRate),
      subtext: 'Cumulative exit % of records (no period avg headcount)',
      icon: TrendingDown,
      iconBg:
        kpis.recordedExitRate >= 25
          ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400'
          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
      valueClass:
        kpis.recordedExitRate >= 25 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400',
    },
    {
      title: 'Average Salary',
      value: formatNaira(kpis.avgSalaryNgn),
      subtext: `Median: ${formatNaira(kpis.medianSalaryNgn)}`,
      icon: Banknote,
      iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      title: 'Avg Job Satisfaction',
      value: `${formatDecimal(kpis.avgJobSatisfaction)} / 5`,
      subtext: `Active ${formatDecimal(kpis.activeAvgSatisfaction)} vs Exited ${formatDecimal(kpis.exitedAvgSatisfaction)}`,
      icon: HeartHandshake,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      title: 'Avg Performance Rating',
      value: `${formatDecimal(kpis.avgPerformanceRating)} / 5`,
      subtext: `${formatPercent(kpis.highPerformerShare)} rated 4.0 or higher`,
      icon: Award,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
      valueClass: 'text-slate-900 dark:text-white',
    },
    {
      title: 'Employees with Overtime',
      value: kpis.overtimeCount.toLocaleString(),
      subtext: `${formatPercent(kpis.overtimeShare)} of staff · ${formatPercent(kpis.overtimeExitRate)} exit rate`,
      icon: Clock,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
      valueClass: 'text-slate-900 dark:text-white',
    },
  ];

  return (
    <section aria-label="Executive KPI Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between transition-colors hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{card.title}</p>
                <p className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${card.valueClass}`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug tabular-nums">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </section>
  );
};
