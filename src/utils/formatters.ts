import { RiskCategory } from '../types/hr';

export function formatNaira(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '₦0';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `₦${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `₦${Math.round(value / 1_000).toLocaleString('en-NG')}K`;
    }
  }
  return `₦${Math.round(value).toLocaleString('en-NG')}`;
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatDecimal(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(decimals);
}

export const RISK_THRESHOLDS = {
  LOW_MAX: 0.25,
  MEDIUM_MAX: 0.5,
  HIGH_MAX: 0.75,
} as const;

export function classifyRisk(probability: number): RiskCategory {
  if (probability >= RISK_THRESHOLDS.HIGH_MAX) return 'Critical';
  if (probability >= RISK_THRESHOLDS.MEDIUM_MAX) return 'High';
  if (probability >= RISK_THRESHOLDS.LOW_MAX) return 'Medium';
  return 'Low';
}

export interface RiskStyle {
  label: RiskCategory;
  stroke: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  barClass: string;
  dotClass: string;
}

export function getRiskStyle(category: RiskCategory): RiskStyle {
  switch (category) {
    case 'Low':
      return {
        label: 'Low',
        stroke: '#16a34a',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
        borderClass: 'border-emerald-200 dark:border-emerald-800/60',
        barClass: 'bg-emerald-600 dark:bg-emerald-500',
        dotClass: 'bg-emerald-600 dark:bg-emerald-500',
      };
    case 'Medium':
      return {
        label: 'Medium',
        stroke: '#d97706',
        textClass: 'text-amber-700 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/50',
        borderClass: 'border-amber-200 dark:border-amber-800/60',
        barClass: 'bg-amber-500',
        dotClass: 'bg-amber-500',
      };
    case 'High':
      return {
        label: 'High',
        stroke: '#dc2626',
        textClass: 'text-red-700 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-950/50',
        borderClass: 'border-red-200 dark:border-red-800/60',
        barClass: 'bg-red-600 dark:bg-red-500',
        dotClass: 'bg-red-600 dark:bg-red-500',
      };
    case 'Critical':
      return {
        label: 'Critical',
        stroke: '#e11d48',
        textClass: 'text-rose-900 dark:text-rose-400',
        bgClass: 'bg-rose-100 dark:bg-rose-950/60',
        borderClass: 'border-rose-300 dark:border-rose-800/70',
        barClass: 'bg-rose-800 dark:bg-rose-600',
        dotClass: 'bg-rose-800 dark:bg-rose-600',
      };
  }
}
