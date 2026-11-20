import { DatasetInsight, EmployeeRecord, FilterState, KpiMetrics } from '../types/hr';
import { formatNaira, formatPercent } from './formatters';

export interface FilterOptions {
  departments: string[];
  employmentTypes: string[];
  managers: string[];
  genders: string[];
  jobRoles: string[];
  minDate: string;
  maxDate: string;
}

export function extractFilterOptions(records: EmployeeRecord[]): FilterOptions {
  const departments = Array.from(new Set(records.map((r) => r.department))).sort();
  const employmentTypes = Array.from(new Set(records.map((r) => r.employmentType))).sort();
  const managers = Array.from(new Set(records.map((r) => r.manager))).sort();
  const genders = Array.from(new Set(records.map((r) => r.gender))).sort();
  const jobRoles = Array.from(new Set(records.map((r) => r.jobRole))).sort();

  const hireDates = records.map((r) => r.hireDate).filter((d): d is string => d !== null).sort();
  const minDate = hireDates[0] ?? '';
  const maxDate = hireDates[hireDates.length - 1] ?? '';

  return {
    departments,
    employmentTypes,
    managers,
    genders,
    jobRoles,
    minDate,
    maxDate,
  };
}

export function filterEmployees(records: EmployeeRecord[], filters: FilterState): EmployeeRecord[] {
  return records.filter((r) => {
    if (filters.department !== 'All' && r.department !== filters.department) return false;
    if (filters.employmentType !== 'All' && r.employmentType !== filters.employmentType) return false;
    if (filters.manager !== 'All' && r.manager !== filters.manager) return false;
    if (filters.gender !== 'All' && r.gender !== filters.gender) return false;
    if (filters.jobRole !== 'All' && r.jobRole !== filters.jobRole) return false;
    if (filters.dateStart && r.hireDate && r.hireDate < filters.dateStart) return false;
    if (filters.dateEnd && r.hireDate && r.hireDate > filters.dateEnd) return false;
    return true;
  });
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function computeKpis(records: EmployeeRecord[]): KpiMetrics {
  const distinctIds = new Set(records.map((r) => r.employeeId));
  const totalEmployees = distinctIds.size;
  const active = records.filter((r) => r.employmentStatus === 'Active');
  const exited = records.filter((r) => r.employmentStatus === 'Exited');

  const activeEmployees = active.length;
  const exitedEmployees = exited.length;
  const recordedExitRate = totalEmployees > 0 ? (exitedEmployees / totalEmployees) * 100 : 0;

  const avgSalaryNgn = mean(records.map((r) => r.salaryNgn));
  const medianSalaryNgn = median(records.map((r) => r.salaryNgn));
  const activeAvgSalaryNgn = mean(active.map((r) => r.salaryNgn));
  const exitedAvgSalaryNgn = mean(exited.map((r) => r.salaryNgn));

  const avgJobSatisfaction = mean(records.map((r) => r.jobSatisfactionScore));
  const activeAvgSatisfaction = mean(active.map((r) => r.jobSatisfactionScore));
  const exitedAvgSatisfaction = mean(exited.map((r) => r.jobSatisfactionScore));

  const avgPerformanceRating = mean(records.map((r) => r.performanceRating));
  const highPerformers = records.filter((r) => r.performanceRating >= 4).length;
  const highPerformerShare = totalEmployees > 0 ? (highPerformers / totalEmployees) * 100 : 0;

  const overtimeList = records.filter((r) => r.overtime === 'Yes');
  const nonOvertimeList = records.filter((r) => r.overtime === 'No');
  const overtimeCount = overtimeList.length;
  const overtimeShare = totalEmployees > 0 ? (overtimeCount / totalEmployees) * 100 : 0;
  const overtimeExitRate =
    overtimeList.length > 0
      ? (overtimeList.filter((r) => r.employmentStatus === 'Exited').length / overtimeList.length) * 100
      : 0;
  const nonOvertimeExitRate =
    nonOvertimeList.length > 0
      ? (nonOvertimeList.filter((r) => r.employmentStatus === 'Exited').length / nonOvertimeList.length) * 100
      : 0;

  const distinctDepartments = new Set(records.map((r) => r.department)).size;

  return {
    totalEmployees,
    activeEmployees,
    exitedEmployees,
    recordedExitRate,
    avgSalaryNgn,
    medianSalaryNgn,
    activeAvgSalaryNgn,
    exitedAvgSalaryNgn,
    avgJobSatisfaction,
    activeAvgSatisfaction,
    exitedAvgSatisfaction,
    avgPerformanceRating,
    highPerformerShare,
    overtimeCount,
    overtimeShare,
    overtimeExitRate,
    nonOvertimeExitRate,
    distinctDepartments,
  };
}

export interface DeptAttritionDatum {
  department: string;
  attritionRate: number;
  exited: number;
  active: number;
  total: number;
}

export interface StatusDonutDatum {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface AgeBinDatum {
  ageGroup: string;
  active: number;
  exited: number;
  total: number;
  attritionRate: number;
}

export interface SatisfactionDatum {
  score: string;
  numericScore: number;
  active: number;
  exited: number;
  total: number;
  attritionRate: number;
}

export interface OvertimeDatum {
  overtime: string;
  active: number;
  exited: number;
  total: number;
  attritionRate: number;
}

export interface DeptSalaryDatum {
  department: string;
  avgSalary: number;
  medianSalary: number;
  headcount: number;
}

export interface TrendDatum {
  period: string;
  hires: number;
  exits: number;
}

export interface AbsencePerfPoint {
  employeeId: string;
  department: string;
  absenceDays: number;
  performanceRating: number;
  performanceJittered: number;
  status: 'Active' | 'Exited';
}

export interface AnalyticsBundle {
  deptAttrition: DeptAttritionDatum[];
  statusDonut: StatusDonutDatum[];
  ageDistribution: AgeBinDatum[];
  satisfactionVsAttrition: SatisfactionDatum[];
  overtimeVsAttrition: OvertimeDatum[];
  salaryByDept: DeptSalaryDatum[];
  monthlyTrends: TrendDatum[];
  quarterlyTrends: TrendDatum[];
  absenceVsPerformance: {
    activePoints: AbsencePerfPoint[];
    exitedPoints: AbsencePerfPoint[];
  };
}

function getQuarterKey(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  const month = Number(isoDate.slice(5, 7));
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}

export function computeChartData(records: EmployeeRecord[]): AnalyticsBundle {
  // A. Attrition by Department
  const deptMap = new Map<string, { active: number; exited: number; salaries: number[] }>();
  for (const r of records) {
    const entry = deptMap.get(r.department) ?? { active: 0, exited: 0, salaries: [] };
    if (r.employmentStatus === 'Exited') entry.exited++;
    else entry.active++;
    entry.salaries.push(r.salaryNgn);
    deptMap.set(r.department, entry);
  }

  const deptAttrition: DeptAttritionDatum[] = Array.from(deptMap.entries())
    .map(([department, v]) => {
      const total = v.active + v.exited;
      return {
        department,
        exited: v.exited,
        active: v.active,
        total,
        attritionRate: total > 0 ? Number(((v.exited / total) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.attritionRate - a.attritionRate);

  // B. Active vs Exited
  const activeCount = records.filter((r) => r.employmentStatus === 'Active').length;
  const exitedCount = records.filter((r) => r.employmentStatus === 'Exited').length;
  const totalCount = activeCount + exitedCount;
  const statusDonut: StatusDonutDatum[] = [
    {
      name: 'Active',
      value: activeCount,
      percentage: totalCount > 0 ? Number(((activeCount / totalCount) * 100).toFixed(1)) : 0,
      color: '#16a34a',
    },
    {
      name: 'Exited',
      value: exitedCount,
      percentage: totalCount > 0 ? Number(((exitedCount / totalCount) * 100).toFixed(1)) : 0,
      color: '#dc2626',
    },
  ];

  // C. Age Distribution
  const ageBuckets = [
    { label: 'Under 25', min: 0, max: 24 },
    { label: '25–29', min: 25, max: 29 },
    { label: '30–34', min: 30, max: 34 },
    { label: '35–39', min: 35, max: 39 },
    { label: '40–44', min: 40, max: 44 },
    { label: '45–49', min: 45, max: 49 },
    { label: '50+', min: 50, max: 120 },
  ];
  const ageDistribution: AgeBinDatum[] = ageBuckets.map((b) => {
    const subset = records.filter((r) => r.age !== null && r.age >= b.min && r.age <= b.max);
    const ex = subset.filter((r) => r.employmentStatus === 'Exited').length;
    const ac = subset.length - ex;
    return {
      ageGroup: b.label,
      active: ac,
      exited: ex,
      total: subset.length,
      attritionRate: subset.length > 0 ? Number(((ex / subset.length) * 100).toFixed(1)) : 0,
    };
  });

  // D. Job Satisfaction vs Attrition
  const satisfactionVsAttrition: SatisfactionDatum[] = [1, 2, 3, 4, 5].map((score) => {
    const subset = records.filter((r) => Math.round(r.jobSatisfactionScore) === score);
    const ex = subset.filter((r) => r.employmentStatus === 'Exited').length;
    const ac = subset.length - ex;
    return {
      score: `Score ${score}`,
      numericScore: score,
      active: ac,
      exited: ex,
      total: subset.length,
      attritionRate: subset.length > 0 ? Number(((ex / subset.length) * 100).toFixed(1)) : 0,
    };
  });

  // E. Overtime vs Attrition
  const overtimeVsAttrition: OvertimeDatum[] = (['Yes', 'No'] as const).map((ot) => {
    const subset = records.filter((r) => r.overtime === ot);
    const ex = subset.filter((r) => r.employmentStatus === 'Exited').length;
    const ac = subset.length - ex;
    return {
      overtime: ot === 'Yes' ? 'Overtime: Yes' : 'Overtime: No',
      active: ac,
      exited: ex,
      total: subset.length,
      attritionRate: subset.length > 0 ? Number(((ex / subset.length) * 100).toFixed(1)) : 0,
    };
  });

  // F. Average Salary by Department
  const salaryByDept: DeptSalaryDatum[] = Array.from(deptMap.entries())
    .map(([department, v]) => ({
      department,
      avgSalary: Math.round(mean(v.salaries)),
      medianSalary: Math.round(median(v.salaries)),
      headcount: v.salaries.length,
    }))
    .sort((a, b) => b.avgSalary - a.avgSalary);

  // G. Hiring and Exit Trends (Monthly & Quarterly)
  const monthlyMap = new Map<string, { hires: number; exits: number }>();
  const quarterlyMap = new Map<string, { hires: number; exits: number }>();

  for (const r of records) {
    if (r.hireDate) {
      const mKey = r.hireDate.slice(0, 7);
      const qKey = getQuarterKey(r.hireDate);
      const mEntry = monthlyMap.get(mKey) ?? { hires: 0, exits: 0 };
      mEntry.hires++;
      monthlyMap.set(mKey, mEntry);

      const qEntry = quarterlyMap.get(qKey) ?? { hires: 0, exits: 0 };
      qEntry.hires++;
      quarterlyMap.set(qKey, qEntry);
    }
    if (r.exitDate) {
      const mKey = r.exitDate.slice(0, 7);
      const qKey = getQuarterKey(r.exitDate);
      const mEntry = monthlyMap.get(mKey) ?? { hires: 0, exits: 0 };
      mEntry.exits++;
      monthlyMap.set(mKey, mEntry);

      const qEntry = quarterlyMap.get(qKey) ?? { hires: 0, exits: 0 };
      qEntry.exits++;
      quarterlyMap.set(qKey, qEntry);
    }
  }

  const monthlyTrends: TrendDatum[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, hires: v.hires, exits: v.exits }));

  const quarterlyTrends: TrendDatum[] = Array.from(quarterlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, hires: v.hires, exits: v.exits }));

  // H. Absence Days vs Performance Rating (deterministic micro-jitter on rating for scatter legibility)
  const activePoints: AbsencePerfPoint[] = [];
  const exitedPoints: AbsencePerfPoint[] = [];

  records.forEach((r, idx) => {
    const jitter = ((idx % 7) - 3) * 0.045;
    const pt: AbsencePerfPoint = {
      employeeId: r.employeeId,
      department: r.department,
      absenceDays: r.absenceDays,
      performanceRating: r.performanceRating,
      performanceJittered: Number((r.performanceRating + jitter).toFixed(2)),
      status: r.employmentStatus,
    };
    if (r.employmentStatus === 'Exited') exitedPoints.push(pt);
    else activePoints.push(pt);
  });

  return {
    deptAttrition,
    statusDonut,
    ageDistribution,
    satisfactionVsAttrition,
    overtimeVsAttrition,
    salaryByDept,
    monthlyTrends,
    quarterlyTrends,
    absenceVsPerformance: { activePoints, exitedPoints },
  };
}

function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length < 5 || x.length !== y.length) return null;
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom > 1e-9 ? num / denom : null;
}

export function generateKeyInsights(records: EmployeeRecord[]): DatasetInsight[] {
  if (records.length === 0) return [];

  const insights: DatasetInsight[] = [];
  const totalExited = records.filter((r) => r.employmentStatus === 'Exited').length;
  const overallRate = (totalExited / records.length) * 100;

  // 1. Department attrition spread
  const deptMap = new Map<string, { total: number; exited: number }>();
  for (const r of records) {
    const d = deptMap.get(r.department) ?? { total: 0, exited: 0 };
    d.total++;
    if (r.employmentStatus === 'Exited') d.exited++;
    deptMap.set(r.department, d);
  }
  const deptStats = Array.from(deptMap.entries())
    .map(([dept, v]) => ({ dept, total: v.total, exited: v.exited, rate: (v.exited / v.total) * 100 }))
    .sort((a, b) => b.rate - a.rate);

  if (deptStats.length >= 2) {
    const top = deptStats[0];
    const bottom = deptStats[deptStats.length - 1];
    insights.push({
      id: 'dept-attrition',
      topic: 'Department Concentration',
      headline: `${top.dept} records the highest exit share at ${formatPercent(top.rate)}`,
      metricBadge: `${top.exited}/${top.total} exited`,
      detail: `${top.dept} exceeds the ${formatPercent(overallRate)} overall workforce exit rate by ${(top.rate - overallRate).toFixed(1)} percentage points, compared with ${bottom.dept} at ${formatPercent(bottom.rate)} (${bottom.exited}/${bottom.total}).`,
      evidenceNote: 'Descriptive departmental comparison; does not isolate role mix or tenure differences.',
      tone: top.rate > overallRate + 3 ? 'warning' : 'neutral',
    });
  }

  // 2. Overtime vs attrition
  const otYes = records.filter((r) => r.overtime === 'Yes');
  const otNo = records.filter((r) => r.overtime === 'No');
  if (otYes.length > 0 && otNo.length > 0) {
    const otYesRate = (otYes.filter((r) => r.employmentStatus === 'Exited').length / otYes.length) * 100;
    const otNoRate = (otNo.filter((r) => r.employmentStatus === 'Exited').length / otNo.length) * 100;
    const diff = otYesRate - otNoRate;
    insights.push({
      id: 'overtime-link',
      topic: 'Workload & Overtime',
      headline:
        diff >= 1
          ? `Overtime staff exhibit a +${diff.toFixed(1)} pp higher exit rate`
          : diff <= -1
            ? `Non-overtime staff show a +${Math.abs(diff).toFixed(1)} pp higher exit rate`
            : `Overtime and non-overtime exit rates are nearly identical`,
      metricBadge: `${formatPercent(otYesRate)} vs ${formatPercent(otNoRate)}`,
      detail: `Employees working overtime (n=${otYes.length}) recorded a ${formatPercent(otYesRate)} exit rate versus ${formatPercent(otNoRate)} among employees without overtime (n=${otNo.length}).`,
      evidenceNote: 'Observed association only; overtime may correlate with specific roles or deadlines.',
      tone: diff >= 3 ? 'warning' : 'neutral',
    });
  }

  // 3. Job satisfaction vs attrition
  const lowSat = records.filter((r) => r.jobSatisfactionScore <= 2);
  const highSat = records.filter((r) => r.jobSatisfactionScore >= 4);
  const satCorr = pearsonCorrelation(
    records.map((r) => r.jobSatisfactionScore),
    records.map((r) => (r.employmentStatus === 'Exited' ? 1 : 0))
  );
  if (lowSat.length > 0 && highSat.length > 0) {
    const lowRate = (lowSat.filter((r) => r.employmentStatus === 'Exited').length / lowSat.length) * 100;
    const highRate = (highSat.filter((r) => r.employmentStatus === 'Exited').length / highSat.length) * 100;
    insights.push({
      id: 'satisfaction-link',
      topic: 'Job Satisfaction',
      headline:
        lowRate > highRate
          ? `Low satisfaction (1–2) correlates with higher exits (${formatPercent(lowRate)} vs ${formatPercent(highRate)})`
          : `Satisfaction shows modest linear contrast across cohorts (${formatPercent(lowRate)} vs ${formatPercent(highRate)})`,
      metricBadge: satCorr !== null ? `r = ${satCorr.toFixed(2)}` : `${formatPercent(lowRate)}`,
      detail: `Employees scoring 1–2 in job satisfaction (n=${lowSat.length}) exited at ${formatPercent(lowRate)}, compared with ${formatPercent(highRate)} for scores 4–5 (n=${highSat.length}).`,
      evidenceNote: 'Survey scores reflect snapshot sentiment and correlate with exits rather than proving single-factor causation.',
      tone: lowRate > highRate + 3 ? 'warning' : 'positive',
    });
  }

  // 4. Training exposure & retention
  const activeTrain = mean(records.filter((r) => r.employmentStatus === 'Active').map((r) => r.trainingHours));
  const exitedTrain = mean(records.filter((r) => r.employmentStatus === 'Exited').map((r) => r.trainingHours));
  const trainCorr = pearsonCorrelation(
    records.map((r) => r.trainingHours),
    records.map((r) => (r.employmentStatus === 'Exited' ? 1 : 0))
  );
  insights.push({
    id: 'training-retention',
    topic: 'Training Exposure',
    headline:
      activeTrain > exitedTrain + 1.5
        ? `Retained employees averaged ${(activeTrain - exitedTrain).toFixed(1)} more training hours`
        : `Training hours are broadly comparable across active and exited staff`,
    metricBadge: `${activeTrain.toFixed(1)}h vs ${exitedTrain.toFixed(1)}h`,
    detail: `Active employees completed ${activeTrain.toFixed(1)} mean training hours compared with ${exitedTrain.toFixed(1)} hours among exited employees${trainCorr !== null ? ` (Pearson r = ${trainCorr.toFixed(2)})` : ''}.`,
    evidenceNote: 'Longer-tenured active staff naturally accumulate more training hours; correlation does not prove causality.',
    tone: activeTrain > exitedTrain + 2 ? 'positive' : 'neutral',
  });

  // 5. Highest-attrition job roles
  const roleMap = new Map<string, { total: number; exited: number }>();
  for (const r of records) {
    const item = roleMap.get(r.jobRole) ?? { total: 0, exited: 0 };
    item.total++;
    if (r.employmentStatus === 'Exited') item.exited++;
    roleMap.set(r.jobRole, item);
  }
  const eligibleRoles = Array.from(roleMap.entries())
    .filter(([, v]) => v.total >= 5)
    .map(([role, v]) => ({ role, total: v.total, exited: v.exited, rate: (v.exited / v.total) * 100 }))
    .sort((a, b) => b.rate - a.rate);

  if (eligibleRoles.length >= 2) {
    const topRole = eligibleRoles[0];
    const secondRole = eligibleRoles[1];
    insights.push({
      id: 'role-hotspots',
      topic: 'Job Role Hotspots',
      headline: `${topRole.role} shows the steepest role exit rate (${formatPercent(topRole.rate)})`,
      metricBadge: `${topRole.exited}/${topRole.total} exited`,
      detail: `Among roles with at least 5 records, ${topRole.role} (${formatPercent(topRole.rate)}) and ${secondRole.role} (${formatPercent(secondRole.rate)}, ${secondRole.exited}/${secondRole.total}) lead recorded attrition. Avg salary in ${topRole.role}: ${formatNaira(mean(records.filter((r) => r.jobRole === topRole.role).map((r) => r.salaryNgn)))}.`,
      evidenceNote: 'Filtered to roles with n ≥ 5 to prevent small-sample noise.',
      tone: 'warning',
    });
  }

  // 6. Absence days & performance rating relationship
  const activeAbs = mean(records.filter((r) => r.employmentStatus === 'Active').map((r) => r.absenceDays));
  const exitedAbs = mean(records.filter((r) => r.employmentStatus === 'Exited').map((r) => r.absenceDays));
  const activePerf = mean(records.filter((r) => r.employmentStatus === 'Active').map((r) => r.performanceRating));
  const exitedPerf = mean(records.filter((r) => r.employmentStatus === 'Exited').map((r) => r.performanceRating));
  insights.push({
    id: 'absence-performance',
    topic: 'Absence & Performance',
    headline: `Exited staff averaged ${exitedAbs.toFixed(1)} absence days and ${exitedPerf.toFixed(2)} performance rating`,
    metricBadge: `Active: ${activeAbs.toFixed(1)}d / ${activePerf.toFixed(2)}★`,
    detail: `Active staff averaged ${activeAbs.toFixed(1)} absence days and ${activePerf.toFixed(2)}/5.0 performance, versus ${exitedAbs.toFixed(1)} days and ${exitedPerf.toFixed(2)}/5.0 for exited staff.`,
    evidenceNote: 'Aggregate comparison across all employment types; individual risk depends on multivariate combinations.',
    tone: 'neutral',
  });

  return insights;
}
