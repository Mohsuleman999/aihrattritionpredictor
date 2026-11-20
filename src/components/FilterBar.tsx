import React from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { FilterState } from '../types/hr';
import { FilterOptions } from '../utils/analytics';

interface FilterBarProps {
  filters: FilterState;
  options: FilterOptions;
  totalCount: number;
  filteredCount: number;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  options,
  totalCount,
  filteredCount,
  onChange,
  onReset,
}) => {
  const hasActiveFilters =
    filters.department !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.manager !== 'All' ||
    filters.gender !== 'All' ||
    filters.jobRole !== 'All' ||
    filters.dateStart !== options.minDate ||
    filters.dateEnd !== options.maxDate;

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section
      aria-label="Workforce Filters"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <SlidersHorizontal className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>Interactive Workforce Filters</span>
          <span className="text-slate-400 dark:text-slate-600 font-normal" aria-hidden="true">
            ·
          </span>
          <span className="font-normal text-slate-500 dark:text-slate-400 tabular-nums">
            Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} employees
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <div>
          <label htmlFor="filter-department" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department}
            onChange={(e) => update('department', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Departments</option>
            {options.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-emp-type" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Employment Type
          </label>
          <select
            id="filter-emp-type"
            value={filters.employmentType}
            onChange={(e) => update('employmentType', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Types</option>
            {options.employmentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-manager" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Manager
          </label>
          <select
            id="filter-manager"
            value={filters.manager}
            onChange={(e) => update('manager', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Managers</option>
            {options.managers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-gender" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(e) => update('gender', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Genders</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-job-role" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Job Role
          </label>
          <select
            id="filter-job-role"
            value={filters.jobRole}
            onChange={(e) => update('jobRole', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="All">All Job Roles</option>
            {options.jobRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-date-start" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Hire Date From
          </label>
          <input
            id="filter-date-start"
            type="date"
            value={filters.dateStart}
            min={options.minDate}
            max={filters.dateEnd || options.maxDate}
            onChange={(e) => update('dateStart', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label htmlFor="filter-date-end" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Hire Date To
          </label>
          <input
            id="filter-date-end"
            type="date"
            value={filters.dateEnd}
            min={filters.dateStart || options.minDate}
            max={options.maxDate}
            onChange={(e) => update('dateEnd', e.target.value)}
            className="w-full h-9 px-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
    </section>
  );
};
