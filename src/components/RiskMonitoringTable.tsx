import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Download, Search, Shield } from 'lucide-react';
import { RiskCategory } from '../types/hr';
import { getRiskStyle } from '../utils/formatters';
import { ScoredActiveEmployee } from './RiskSegmentationSection';

interface RiskMonitoringTableProps {
  scoredActive: ScoredActiveEmployee[];
  modelIsValid: boolean;
  onSelectEmployeeForPrediction: (employeeId: string) => void;
}

type SortField =
  | 'employeeId'
  | 'department'
  | 'jobRole'
  | 'jobSatisfactionScore'
  | 'overtime'
  | 'absenceDays'
  | 'probability';

export const RiskMonitoringTable: React.FC<RiskMonitoringTableProps> = ({
  scoredActive,
  modelIsValid,
  onSelectEmployeeForPrediction,
}) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskCategory>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('probability');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const departments = useMemo(
    () => Array.from(new Set(scoredActive.map((e) => e.department))).sort(),
    [scoredActive]
  );

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = scoredActive.filter((row) => {
      if (riskFilter !== 'All' && row.riskCategory !== riskFilter) return false;
      if (deptFilter !== 'All' && row.department !== deptFilter) return false;
      if (q) {
        const hay = `${row.employeeId} ${row.department} ${row.jobRole}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'employeeId') cmp = a.employeeId.localeCompare(b.employeeId);
      else if (sortField === 'department') cmp = a.department.localeCompare(b.department);
      else if (sortField === 'jobRole') cmp = a.jobRole.localeCompare(b.jobRole);
      else if (sortField === 'overtime') cmp = a.overtime.localeCompare(b.overtime);
      else if (sortField === 'jobSatisfactionScore') cmp = a.jobSatisfactionScore - b.jobSatisfactionScore;
      else if (sortField === 'absenceDays') cmp = a.absenceDays - b.absenceDays;
      else cmp = a.probability - b.probability;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [scoredActive, search, riskFilter, deptFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredAndSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'probability' || field === 'absenceDays' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = [
      'Employee_ID',
      'Department',
      'Job_Role',
      'Job_Satisfaction_Score',
      'Overtime',
      'Absence_Days',
      'Predicted_Attrition_Probability',
      'Risk_Category',
    ];
    const escapeCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...filteredAndSorted.map((r) =>
        [
          escapeCell(r.employeeId),
          escapeCell(r.department),
          escapeCell(r.jobRole),
          r.jobSatisfactionScore,
          escapeCell(r.overtime),
          r.absenceDays,
          `${(r.probability * 100).toFixed(1)}%`,
          escapeCell(r.riskCategory),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `active_employee_risk_monitoring_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: { key: SortField; label: string; align?: 'right' }[] = [
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'department', label: 'Department' },
    { key: 'jobRole', label: 'Job Role' },
    { key: 'jobSatisfactionScore', label: 'Job Satisfaction', align: 'right' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'absenceDays', label: 'Absence Days', align: 'right' },
    { key: 'probability', label: 'Predicted Probability', align: 'right' },
  ];

  return (
    <section
      aria-label="Employee Risk Monitoring Table"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Employee Risk Monitoring Table</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            Active employees only ({filteredAndSorted.length.toLocaleString()} shown) · Click any row to load into the prediction panel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, role, dept..."
              aria-label="Search active employees"
              className="h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-48 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter table by department"
            className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value as 'All' | RiskCategory);
              setPage(1);
            }}
            aria-label="Filter table by risk category"
            className="h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Risk Tiers</option>
            <option value="Critical">Critical Risk</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!modelIsValid || filteredAndSorted.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {!modelIsValid ? (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Predicted probabilities cannot be computed because the uploaded dataset does not support a valid supervised model.
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No active employees match your table search and filter criteria.
        </div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2.5 px-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <span>{col.label}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      </button>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 whitespace-nowrap">Risk Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {pageRows.map((row) => {
                  const style = getRiskStyle(row.riskCategory);
                  const rowTint =
                    row.riskCategory === 'Critical'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/45'
                      : row.riskCategory === 'High'
                        ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70 dark:hover:bg-red-950/35'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60';

                  return (
                    <tr
                      key={row.employeeId}
                      onClick={() => onSelectEmployeeForPrediction(row.employeeId)}
                      className={`cursor-pointer transition-colors ${rowTint}`}
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {row.employeeId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.department}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.jobRole}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {row.jobSatisfactionScore} / 5
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {row.overtime}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {row.absenceDays}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                        {(row.probability * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-semibold ${style.textClass}`}>{row.riskCategory} Risk</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Page {safePage} of {totalPages} · Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Privacy & Governance Notice */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
        <Shield className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Privacy &amp; HR Governance Notice:</strong> This dashboard is intended strictly for authorized HR analytics, workforce retention planning, and supportive human review. Predicted risk estimates must never be used as automatic grounds for adverse employment, compensation, or disciplinary decisions.
        </span>
      </div>
    </section>
  );
};
