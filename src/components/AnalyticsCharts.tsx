import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { AnalyticsBundle } from '../utils/analytics';
import { formatNaira } from '../utils/formatters';

interface AnalyticsChartsProps {
  data: AnalyticsBundle;
  totalFiltered: number;
  isDark: boolean;
}

const ChartCard: React.FC<{
  title: string;
  subtitle: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, headerRight, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 flex flex-col">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {headerRight && <div className="shrink-0">{headerRight}</div>}
    </div>
    <div className="flex-1 min-h-[250px] w-full">{children}</div>
  </div>
);

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data, totalFiltered, isDark }) => {
  const [trendMode, setTrendMode] = useState<'both' | 'hires' | 'exits'>('both');
  const [trendGranularity, setTrendGranularity] = useState<'quarterly' | 'monthly'>('quarterly');

  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const labelColor = isDark ? '#cbd5e1' : '#334155';
  const cursorFill = isDark ? 'rgba(30, 41, 59, 0.55)' : '#f8fafc';

  if (totalFiltered === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          No employees match the selected filters
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Adjust or reset one or more filter controls above to view workforce visualizations.
        </p>
      </div>
    );
  }

  const trendSeries = trendGranularity === 'quarterly' ? data.quarterlyTrends : data.monthlyTrends;
  const activeCount = data.statusDonut.find((d) => d.name === 'Active')?.value ?? 0;
  const exitedCount = data.statusDonut.find((d) => d.name === 'Exited')?.value ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* A. Attrition by Department */}
      <ChartCard
        title="Attrition by Department"
        subtitle="Recorded exit percentage sorted highest to lowest"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data.deptAttrition}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
            <XAxis
              type="number"
              domain={[0, (max: number) => Math.max(25, Math.ceil(max / 5) * 5)]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: tickColor }}
            />
            <YAxis
              type="category"
              dataKey="department"
              width={126}
              tick={{ fontSize: 11, fill: labelColor, fontWeight: 500 }}
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md">
                    <p className="font-semibold">{d.department}</p>
                    <p className="mt-1 tabular-nums">Exit Rate: {d.attritionRate}%</p>
                    <p className="text-slate-300 tabular-nums">
                      {d.exited} exited of {d.total} total ({d.active} active)
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="attritionRate" radius={[0, 4, 4, 0]} barSize={20}>
              {data.deptAttrition.map((entry) => (
                <Cell
                  key={entry.department}
                  fill={entry.attritionRate >= 25 ? '#dc2626' : entry.attritionRate >= 18 ? '#d97706' : '#7c3aed'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* B. Active vs Exited Employees */}
      <ChartCard
        title="Active vs Exited Employees"
        subtitle="Current workforce retention vs recorded exits"
      >
        <div className="relative h-[260px] flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-full sm:w-3/5 h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDonut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.statusDonut.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toLocaleString()} employees`,
                    String(name ?? ''),
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1e293b' : '#0f172a',
                    border: isDark ? '1px solid #334155' : 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Headcount</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {totalFiltered.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-2/5 space-y-3 pr-2">
            {data.statusDonut.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.value.toLocaleString()}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">({item.percentage}%)</span>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Retention ratio: {totalFiltered > 0 ? ((activeCount / totalFiltered) * 100).toFixed(1) : '0.0'}% active
              {exitedCount > 0 ? ` · ${exitedCount} exited` : ''}
            </p>
          </div>
        </div>
      </ChartCard>

      {/* C. Age Distribution */}
      <ChartCard
        title="Age Distribution"
        subtitle="Headcount across age bands split by Active and Exited"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.ageDistribution} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="ageGroup" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md tabular-nums">
                    <p className="font-semibold">Age {d.ageGroup}</p>
                    <p className="mt-1">Total: {d.total} employees</p>
                    <p className="text-emerald-300">Active: {d.active}</p>
                    <p className="text-red-300">Exited: {d.exited} ({d.attritionRate}%)</p>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: labelColor }} />
            <Bar dataKey="active" name="Active" stackId="age" fill="#7c3aed" radius={[0, 0, 0, 0]} />
            <Bar dataKey="exited" name="Exited" stackId="age" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* D. Job Satisfaction vs Attrition */}
      <ChartCard
        title="Job Satisfaction vs Attrition"
        subtitle="Employee counts and exit rate (%) across satisfaction scores (1–5)"
      >
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={data.satisfactionVsAttrition}
            margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="score" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${v}%`}
              domain={[0, (max: number) => Math.max(40, Math.ceil(max / 10) * 10)]}
              tick={{ fontSize: 11, fill: '#f87171' }}
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md tabular-nums">
                    <p className="font-semibold">Satisfaction {d.score}</p>
                    <p className="mt-1">Active: {d.active} · Exited: {d.exited}</p>
                    <p className="text-amber-300 font-semibold">Exit Rate: {d.attritionRate}%</p>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: labelColor }} />
            <Bar yAxisId="left" dataKey="active" name="Active" fill="#7c3aed" radius={[3, 3, 0, 0]} barSize={22} />
            <Bar yAxisId="left" dataKey="exited" name="Exited" fill="#fca5a5" radius={[3, 3, 0, 0]} barSize={22} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="attritionRate"
              name="Exit Rate %"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#ef4444' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* E. Overtime vs Attrition */}
      <ChartCard
        title="Overtime vs Attrition"
        subtitle="Active vs Exited headcount and group exit rate by overtime status"
      >
        <div className="flex flex-col h-[260px]">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.overtimeVsAttrition}
                margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis dataKey="overtime" tick={{ fontSize: 11, fill: labelColor, fontWeight: 500 }} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: cursorFill }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md tabular-nums">
                        <p className="font-semibold">{d.overtime}</p>
                        <p className="mt-1">Active: {d.active} · Exited: {d.exited}</p>
                        <p className="text-amber-300 font-semibold">Group Attrition: {d.attritionRate}%</p>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: labelColor }} />
                <Bar dataKey="active" name="Active" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="exited" name="Exited" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {data.overtimeVsAttrition.map((item) => (
              <span key={item.overtime}>
                {item.overtime}: <strong className="text-slate-900 dark:text-white">{item.attritionRate}%</strong> exit rate (
                {item.exited}/{item.total})
              </span>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* F. Average Salary by Department */}
      <ChartCard
        title="Average Salary by Department"
        subtitle="Mean monthly compensation in Nigerian Naira (₦)"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.salaryByDept} margin={{ top: 8, right: 12, left: 10, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="department"
              tick={{ fontSize: 10, fill: tickColor }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={46}
            />
            <YAxis
              tickFormatter={(v) => formatNaira(v, true)}
              tick={{ fontSize: 11, fill: tickColor }}
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md tabular-nums">
                    <p className="font-semibold">{d.department}</p>
                    <p className="mt-1">Average: {formatNaira(d.avgSalary)}</p>
                    <p className="text-slate-300">Median: {formatNaira(d.medianSalary)} (n={d.headcount})</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="avgSalary" name="Avg Salary (₦)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* G. Hiring and Exit Trends */}
      <ChartCard
        title="Hiring and Exit Trends"
        subtitle="Historical workforce intake and recorded departure volume"
        headerRight={
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['both', 'hires', 'exits'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTrendMode(m)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    trendMode === m
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m === 'both' ? 'Both' : m === 'hires' ? 'Hiring' : 'Exits'}
                </button>
              ))}
            </div>
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['quarterly', 'monthly'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTrendGranularity(g)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    trendGranularity === g
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {g === 'quarterly' ? 'Quarterly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendSeries} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <defs>
              <linearGradient id="hireFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="exitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: tickColor }} minTickGap={18} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#0f172a',
                border: isDark ? '1px solid #334155' : 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: labelColor }} />
            {(trendMode === 'both' || trendMode === 'hires') && (
              <Area
                type="monotone"
                dataKey="hires"
                name="Hires"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#hireFill)"
              />
            )}
            {(trendMode === 'both' || trendMode === 'exits') && (
              <Area
                type="monotone"
                dataKey="exits"
                name="Exits"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#exitFill)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* H. Absence Days vs Performance Rating */}
      <ChartCard
        title="Absence Days vs Performance Rating"
        subtitle="Individual employee distribution (slight vertical jitter applied for readability)"
      >
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              type="number"
              dataKey="absenceDays"
              name="Absence Days"
              tick={{ fontSize: 11, fill: tickColor }}
              label={{ value: 'Absence Days', position: 'insideBottom', offset: -2, fontSize: 11, fill: tickColor }}
            />
            <YAxis
              type="number"
              dataKey="performanceJittered"
              name="Performance Rating"
              domain={[0.6, 5.4]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: tickColor }}
            />
            <ZAxis range={[36, 36]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-md tabular-nums">
                    <p className="font-semibold">
                      {p.employeeId} · {p.status}
                    </p>
                    <p className="text-slate-300">{p.department}</p>
                    <p className="mt-1">
                      Absence: {p.absenceDays} days · Rating: {p.performanceRating} / 5
                    </p>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: labelColor }} />
            <Scatter
              name="Active"
              data={data.absenceVsPerformance.activePoints}
              fill="#22c55e"
              fillOpacity={0.62}
            />
            <Scatter
              name="Exited"
              data={data.absenceVsPerformance.exitedPoints}
              fill="#ef4444"
              fillOpacity={0.84}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
