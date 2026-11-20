import React, { useRef } from 'react';
import { Database, Moon, RotateCcw, Sun, Upload } from 'lucide-react';
import { DataQualityReport } from '../types/hr';

interface DashboardHeaderProps {
  report: DataQualityReport;
  isCustomDataset: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onFileUpload: (file: File) => void;
  onResetDataset: () => void;
  onOpenDataQuality: () => void;
  uploadError: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  report,
  isCustomDataset,
  isDark,
  onToggleTheme,
  onFileUpload,
  onResetDataset,
  onOpenDataQuality,
  uploadError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-[#15112e] dark:bg-[#0e0b22] text-white border-b border-indigo-950/60 dark:border-slate-800">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              Employee Attrition &amp; Retention Dashboard
            </h1>
            <p className="mt-1 text-sm text-indigo-200/90 italic">
              Workforce Overview | Attrition Intelligence | Employee Exit Prediction
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-indigo-200/75 tabular-nums">
              <span>Dataset: {report.sourceName}</span>
              <span aria-hidden="true">·</span>
              <span>{report.cleanRowCount.toLocaleString()} cleaned records</span>
              {report.snapshotDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Snapshot: {report.snapshotDate}</span>
                </>
              )}
              {report.duplicateIdsRemoved > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{report.duplicateIdsRemoved} duplicates removed</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-indigo-100 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-violet-300" />
                  Dark Mode
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload replacement CSV or Excel dataset"
            />
            <button
              type="button"
              onClick={onOpenDataQuality}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-indigo-100 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Database className="w-3.5 h-3.5 text-violet-300" />
              Data Schema &amp; Quality
            </button>

            {isCustomDataset && (
              <button
                type="button"
                onClick={onResetDataset}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-indigo-100 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-200" />
                Restore Baseline
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV / Excel
            </button>
          </div>
        </div>

        {uploadError && (
          <div
            role="alert"
            className="mt-3 px-3.5 py-2 rounded-lg bg-red-950/70 border border-red-400/40 text-xs text-red-100"
          >
            {uploadError}
          </div>
        )}
      </div>
    </header>
  );
};
