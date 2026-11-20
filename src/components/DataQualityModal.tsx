import React, { useRef } from 'react';
import { CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { DataQualityReport } from '../types/hr';

interface DataQualityModalProps {
  isOpen: boolean;
  report: DataQualityReport;
  onClose: () => void;
  onFileUpload: (file: File) => void;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  report,
  onClose,
  onFileUpload,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-quality-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-[#15112e] dark:bg-[#0e0b22] text-white flex items-center justify-between border-b border-indigo-950/60 dark:border-slate-800">
          <div>
            <h2 id="data-quality-title" className="text-base font-bold">
              Dataset Schema, Data Quality &amp; File Upload
            </h2>
            <p className="text-xs text-indigo-200/80 mt-0.5 tabular-nums">
              Source: {report.sourceName} · {report.cleanRowCount.toLocaleString()} clean rows from{' '}
              {report.rawRowCount.toLocaleString()} raw rows
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close schema modal"
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-400 rounded-xl p-5 text-center bg-slate-50/70 dark:bg-slate-800/40 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onFileUpload(file);
                  onClose();
                }
              }}
            />
            <FileSpreadsheet className="w-7 h-7 text-violet-600 dark:text-violet-400 mx-auto" />
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Upload Replacement CSV or Excel Dataset
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Drag and drop a .csv, .xlsx, or .xls file here, or browse from your computer to refresh all charts and retrain the ML model.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Select File
            </button>
          </div>

          {/* Quality Audit Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Clean Records</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {report.cleanRowCount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Duplicates Removed</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{report.duplicateIdsRemoved}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Currency Cleaned</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{report.currencyArtifactsCleaned}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Missing Values</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{report.missingValuesTotal}</p>
            </div>
          </div>

          {report.warnings.length > 0 && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                Automated Data Cleaning Log
              </p>
              <ul className="list-disc list-inside text-xs text-emerald-800 dark:text-emerald-300 space-y-0.5">
                {report.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Column Schema Inspection Table */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
              Detected Column Schema &amp; Feature Governance
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Column</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3 text-right">Unique</th>
                    <th className="py-2 px-3 text-right">Missing</th>
                    <th className="py-2 px-3">Governance &amp; Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="py-2 px-3 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {col.name}
                      </td>
                      <td className="py-2 px-3 capitalize text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {col.detectedType}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {col.uniqueCount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {col.missingCount}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{col.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
