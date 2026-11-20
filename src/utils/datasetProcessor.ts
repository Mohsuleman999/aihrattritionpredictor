import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnProfile, DataQualityReport, EmployeeRecord } from '../types/hr';

const EXPECTED_COLUMNS = [
  'Employee_ID',
  'Age',
  'Gender',
  'Department',
  'Job_Role',
  'Employment_Type',
  'Hire_Date',
  'Salary_NGN',
  'Performance_Rating',
  'Training_Hours',
  'Absence_Days',
  'Job_Satisfaction_Score',
  'Overtime',
  'Manager',
  'Employment_Status',
  'Exit_Date',
  'Attrition_Status',
] as const;

type CanonicalKey = (typeof EXPECTED_COLUMNS)[number];

function normalizeHeaderName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIAS_MAP: Record<string, CanonicalKey> = {
  employeeid: 'Employee_ID',
  empid: 'Employee_ID',
  id: 'Employee_ID',
  age: 'Age',
  gender: 'Gender',
  sex: 'Gender',
  department: 'Department',
  dept: 'Department',
  jobrole: 'Job_Role',
  role: 'Job_Role',
  title: 'Job_Role',
  employmenttype: 'Employment_Type',
  contracttype: 'Employment_Type',
  hiredate: 'Hire_Date',
  datehired: 'Hire_Date',
  startdate: 'Hire_Date',
  salaryngn: 'Salary_NGN',
  salary: 'Salary_NGN',
  monthlysalary: 'Salary_NGN',
  performancerating: 'Performance_Rating',
  performance: 'Performance_Rating',
  traininghours: 'Training_Hours',
  training: 'Training_Hours',
  absencedays: 'Absence_Days',
  absences: 'Absence_Days',
  jobsatisfactionscore: 'Job_Satisfaction_Score',
  jobsatisfaction: 'Job_Satisfaction_Score',
  satisfactionscore: 'Job_Satisfaction_Score',
  overtime: 'Overtime',
  manager: 'Manager',
  supervisor: 'Manager',
  employmentstatus: 'Employment_Status',
  status: 'Employment_Status',
  exitdate: 'Exit_Date',
  terminationdate: 'Exit_Date',
  attritionstatus: 'Attrition_Status',
  attrition: 'Attrition_Status',
};

function isEmptyCell(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const t = val.trim().toLowerCase();
    return t === '' || t === 'na' || t === 'n/a' || t === 'null' || t === 'nan' || t === '-';
  }
  return false;
}

function parseNumber(val: unknown): { value: number | null; hadCurrencyArtifact: boolean } {
  if (typeof val === 'number') {
    return { value: Number.isFinite(val) ? val : null, hadCurrencyArtifact: false };
  }
  if (typeof val !== 'string') return { value: null, hadCurrencyArtifact: false };
  const trimmed = val.trim();
  if (!trimmed) return { value: null, hadCurrencyArtifact: false };
  const hadArtifact = /[₦?]|ngn/i.test(trimmed);
  const cleaned = trimmed.replace(/[₦?,\s]/g, '').replace(/ngn/gi, '');
  if (!cleaned || isNaN(Number(cleaned))) {
    return { value: null, hadCurrencyArtifact: hadArtifact };
  }
  const num = Number(cleaned);
  return { value: Number.isFinite(num) ? num : null, hadCurrencyArtifact: hadArtifact };
}

function parseDateValue(val: unknown): { iso: string | null; ts: number | null; invalid: boolean } {
  if (isEmptyCell(val)) return { iso: null, ts: null, invalid: false };

  // Handle Excel serial numbers
  if (typeof val === 'number' && Number.isFinite(val) && val > 20000 && val < 80000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + Math.round(val) * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().slice(0, 10);
      return { iso, ts: Date.parse(iso), invalid: false };
    }
  }

  const str = String(val).trim();
  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { iso, ts: Date.parse(iso), invalid: false };
    }
  }

  // Fallback Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    const iso = dt.toISOString().slice(0, 10);
    return { iso, ts: Date.parse(iso), invalid: false };
  }

  return { iso: null, ts: null, invalid: true };
}

function toTitleCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function normalizeYesNo(val: unknown): { value: 'Yes' | 'No' | null; normalized: boolean } {
  if (isEmptyCell(val)) return { value: null, normalized: false };
  const raw = String(val).trim();
  const low = raw.toLowerCase();
  if (low === 'yes' || low === 'y' || low === '1' || low === 'true') {
    return { value: 'Yes', normalized: raw !== 'Yes' };
  }
  if (low === 'no' || low === 'n' || low === '0' || low === 'false') {
    return { value: 'No', normalized: raw !== 'No' };
  }
  return { value: null, normalized: false };
}

function normalizeEmploymentType(val: unknown): { value: string | null; normalized: boolean } {
  if (isEmptyCell(val)) return { value: null, normalized: false };
  const raw = String(val).trim();
  const low = raw.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
  if (low === 'full time' || low === 'fulltime' || low === 'ft') {
    return { value: 'Full-time', normalized: raw !== 'Full-time' };
  }
  if (low === 'part time' || low === 'parttime' || low === 'pt') {
    return { value: 'Part-time', normalized: raw !== 'Part-time' };
  }
  if (low === 'contract' || low === 'contractor' || low === 'temp') {
    return { value: 'Contract', normalized: raw !== 'Contract' };
  }
  const titled = toTitleCase(raw);
  return { value: titled, normalized: titled !== raw };
}

function normalizeGender(val: unknown): { value: string | null; normalized: boolean } {
  if (isEmptyCell(val)) return { value: null, normalized: false };
  const raw = String(val).trim();
  const low = raw.toLowerCase();
  if (low === 'm' || low === 'male') return { value: 'Male', normalized: raw !== 'Male' };
  if (low === 'f' || low === 'female') return { value: 'Female', normalized: raw !== 'Female' };
  const titled = toTitleCase(raw);
  return { value: titled, normalized: titled !== raw };
}

function normalizeEmploymentStatus(val: unknown): { value: 'Active' | 'Exited' | null; normalized: boolean } {
  if (isEmptyCell(val)) return { value: null, normalized: false };
  const raw = String(val).trim();
  const low = raw.toLowerCase();
  if (low === 'active' || low === 'current' || low === 'employed') {
    return { value: 'Active', normalized: raw !== 'Active' };
  }
  if (low === 'exited' || low === 'left' || low === 'resigned' || low === 'terminated' || low === 'inactive') {
    return { value: 'Exited', normalized: raw !== 'Exited' };
  }
  return { value: null, normalized: false };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(values: string[], fallback: string): string {
  if (values.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = fallback;
  let bestCount = -1;
  for (const [k, c] of counts.entries()) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export function parseCsvText(csvText: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data || [];
}

export async function parseUploadedFile(file: File): Promise<Record<string, unknown>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    return parseCsvText(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('The uploaded Excel workbook contains no sheets.');
    }
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    return rows;
  }
  throw new Error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.');
}

interface IntermediateRow {
  employeeId: string;
  age: number | null;
  gender: string | null;
  department: string | null;
  jobRole: string | null;
  employmentType: string | null;
  hireDate: string | null;
  hireTimestamp: number | null;
  salaryNgn: number | null;
  performanceRating: number | null;
  trainingHours: number | null;
  absenceDays: number | null;
  jobSatisfactionScore: number | null;
  overtime: 'Yes' | 'No' | null;
  manager: string | null;
  employmentStatus: 'Active' | 'Exited' | null;
  exitDate: string | null;
  exitTimestamp: number | null;
  attritionStatus: 'Yes' | 'No' | null;
}

export function cleanAndAnalyzeDataset(
  rawRows: Record<string, unknown>[],
  sourceName: string
): { records: EmployeeRecord[]; report: DataQualityReport } {
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Dataset is empty. Please upload a file containing employee records.');
  }

  // Build header mapping from actual file columns
  const rawKeys = Object.keys(rawRows[0] ?? {});
  const keyMap = new Map<string, CanonicalKey>();
  for (const rawKey of rawKeys) {
    const canonical = HEADER_ALIAS_MAP[normalizeHeaderName(rawKey)];
    if (canonical && !Array.from(keyMap.values()).includes(canonical)) {
      keyMap.set(rawKey, canonical);
    }
  }

  const missingColumns: string[] = [];
  for (const col of EXPECTED_COLUMNS) {
    if (!Array.from(keyMap.values()).includes(col)) {
      missingColumns.push(col);
    }
  }

  const warnings: string[] = [];
  if (missingColumns.length > 0) {
    warnings.push(`Missing expected column(s): ${missingColumns.join(', ')}. Downstream metrics adjust or fall back cleanly.`);
  }

  let currencyArtifactsCleaned = 0;
  let categoryNormalizations = 0;
  let statusReconciliations = 0;
  let invalidDatesCount = 0;
  const missingByColumn = new Map<CanonicalKey, number>();
  for (const col of EXPECTED_COLUMNS) missingByColumn.set(col, 0);

  const uniqueValuesByCol = new Map<CanonicalKey, Set<string>>();
  for (const col of EXPECTED_COLUMNS) uniqueValuesByCol.set(col, new Set());

  const seenIds = new Set<string>();
  const duplicateIdsList: string[] = [];
  const parsedRows: IntermediateRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const mapped: Partial<Record<CanonicalKey, unknown>> = {};
    for (const [rawK, canK] of keyMap.entries()) {
      mapped[canK] = raw[rawK];
    }

    const rawId = isEmptyCell(mapped.Employee_ID) ? `ROW_${i + 1}` : String(mapped.Employee_ID).trim();
    if (isEmptyCell(mapped.Employee_ID)) {
      missingByColumn.set('Employee_ID', (missingByColumn.get('Employee_ID') ?? 0) + 1);
    }

    if (seenIds.has(rawId)) {
      duplicateIdsList.push(rawId);
      continue; // Deduplicate keeping first valid occurrence
    }
    seenIds.add(rawId);
    uniqueValuesByCol.get('Employee_ID')?.add(rawId);

    const ageParsed = parseNumber(mapped.Age);
    const validAge =
      ageParsed.value !== null && ageParsed.value >= 16 && ageParsed.value <= 85
        ? Math.round(ageParsed.value)
        : null;
    if (validAge === null) missingByColumn.set('Age', (missingByColumn.get('Age') ?? 0) + 1);
    else uniqueValuesByCol.get('Age')?.add(String(validAge));

    const genderNorm = normalizeGender(mapped.Gender);
    if (genderNorm.normalized) categoryNormalizations++;
    if (genderNorm.value === null) missingByColumn.set('Gender', (missingByColumn.get('Gender') ?? 0) + 1);
    else uniqueValuesByCol.get('Gender')?.add(genderNorm.value);

    const deptRaw = isEmptyCell(mapped.Department) ? null : toTitleCase(String(mapped.Department));
    if (deptRaw && deptRaw !== String(mapped.Department).trim()) categoryNormalizations++;
    if (deptRaw === null) missingByColumn.set('Department', (missingByColumn.get('Department') ?? 0) + 1);
    else uniqueValuesByCol.get('Department')?.add(deptRaw);

    const roleRaw = isEmptyCell(mapped.Job_Role) ? null : toTitleCase(String(mapped.Job_Role));
    if (roleRaw && roleRaw !== String(mapped.Job_Role).trim()) categoryNormalizations++;
    if (roleRaw === null) missingByColumn.set('Job_Role', (missingByColumn.get('Job_Role') ?? 0) + 1);
    else uniqueValuesByCol.get('Job_Role')?.add(roleRaw);

    const empTypeNorm = normalizeEmploymentType(mapped.Employment_Type);
    if (empTypeNorm.normalized) categoryNormalizations++;
    if (empTypeNorm.value === null) missingByColumn.set('Employment_Type', (missingByColumn.get('Employment_Type') ?? 0) + 1);
    else uniqueValuesByCol.get('Employment_Type')?.add(empTypeNorm.value);

    const hireParsed = parseDateValue(mapped.Hire_Date);
    if (hireParsed.invalid) invalidDatesCount++;
    if (hireParsed.iso === null) missingByColumn.set('Hire_Date', (missingByColumn.get('Hire_Date') ?? 0) + 1);
    else uniqueValuesByCol.get('Hire_Date')?.add(hireParsed.iso);

    const salaryParsed = parseNumber(mapped.Salary_NGN);
    if (salaryParsed.hadCurrencyArtifact) currencyArtifactsCleaned++;
    const validSalary = salaryParsed.value !== null && salaryParsed.value >= 0 ? salaryParsed.value : null;
    if (validSalary === null) missingByColumn.set('Salary_NGN', (missingByColumn.get('Salary_NGN') ?? 0) + 1);
    else uniqueValuesByCol.get('Salary_NGN')?.add(String(validSalary));

    const perfParsed = parseNumber(mapped.Performance_Rating);
    const validPerf =
      perfParsed.value !== null && perfParsed.value >= 1 && perfParsed.value <= 5 ? perfParsed.value : null;
    if (validPerf === null) missingByColumn.set('Performance_Rating', (missingByColumn.get('Performance_Rating') ?? 0) + 1);
    else uniqueValuesByCol.get('Performance_Rating')?.add(String(validPerf));

    const trainParsed = parseNumber(mapped.Training_Hours);
    const validTrain = trainParsed.value !== null && trainParsed.value >= 0 ? trainParsed.value : null;
    if (validTrain === null) missingByColumn.set('Training_Hours', (missingByColumn.get('Training_Hours') ?? 0) + 1);
    else uniqueValuesByCol.get('Training_Hours')?.add(String(validTrain));

    const absParsed = parseNumber(mapped.Absence_Days);
    const validAbs = absParsed.value !== null && absParsed.value >= 0 ? absParsed.value : null;
    if (validAbs === null) missingByColumn.set('Absence_Days', (missingByColumn.get('Absence_Days') ?? 0) + 1);
    else uniqueValuesByCol.get('Absence_Days')?.add(String(validAbs));

    const satParsed = parseNumber(mapped.Job_Satisfaction_Score);
    const validSat =
      satParsed.value !== null && satParsed.value >= 1 && satParsed.value <= 5 ? satParsed.value : null;
    if (validSat === null) missingByColumn.set('Job_Satisfaction_Score', (missingByColumn.get('Job_Satisfaction_Score') ?? 0) + 1);
    else uniqueValuesByCol.get('Job_Satisfaction_Score')?.add(String(validSat));

    const overtimeNorm = normalizeYesNo(mapped.Overtime);
    if (overtimeNorm.normalized) categoryNormalizations++;
    if (overtimeNorm.value === null) missingByColumn.set('Overtime', (missingByColumn.get('Overtime') ?? 0) + 1);
    else uniqueValuesByCol.get('Overtime')?.add(overtimeNorm.value);

    const managerRaw = isEmptyCell(mapped.Manager) ? null : String(mapped.Manager).trim().replace(/\s+/g, ' ');
    if (managerRaw === null) missingByColumn.set('Manager', (missingByColumn.get('Manager') ?? 0) + 1);
    else uniqueValuesByCol.get('Manager')?.add(managerRaw);

    const exitParsed = parseDateValue(mapped.Exit_Date);
    if (exitParsed.invalid) invalidDatesCount++;
    if (exitParsed.iso !== null) uniqueValuesByCol.get('Exit_Date')?.add(exitParsed.iso);

    let empStatusNorm = normalizeEmploymentStatus(mapped.Employment_Status);
    if (empStatusNorm.normalized) categoryNormalizations++;
    let attritionNorm = normalizeYesNo(mapped.Attrition_Status);
    if (attritionNorm.normalized) categoryNormalizations++;

    // Reconcile Employment_Status & Attrition_Status safely
    if (empStatusNorm.value === null && attritionNorm.value !== null) {
      empStatusNorm = { value: attritionNorm.value === 'Yes' ? 'Exited' : 'Active', normalized: true };
      statusReconciliations++;
      missingByColumn.set('Employment_Status', (missingByColumn.get('Employment_Status') ?? 0) + 1);
    } else if (attritionNorm.value === null && empStatusNorm.value !== null) {
      attritionNorm = { value: empStatusNorm.value === 'Exited' ? 'Yes' : 'No', normalized: true };
      statusReconciliations++;
      missingByColumn.set('Attrition_Status', (missingByColumn.get('Attrition_Status') ?? 0) + 1);
    } else if (empStatusNorm.value === null && attritionNorm.value === null) {
      const inferredExited = exitParsed.iso !== null;
      empStatusNorm = { value: inferredExited ? 'Exited' : 'Active', normalized: true };
      attritionNorm = { value: inferredExited ? 'Yes' : 'No', normalized: true };
      statusReconciliations++;
      missingByColumn.set('Employment_Status', (missingByColumn.get('Employment_Status') ?? 0) + 1);
      missingByColumn.set('Attrition_Status', (missingByColumn.get('Attrition_Status') ?? 0) + 1);
    } else if (
      (empStatusNorm.value === 'Exited' && attritionNorm.value === 'No') ||
      (empStatusNorm.value === 'Active' && attritionNorm.value === 'Yes')
    ) {
      // Align attrition status to explicit Exit_Date or Exited status
      attritionNorm = { value: empStatusNorm.value === 'Exited' ? 'Yes' : 'No', normalized: true };
      statusReconciliations++;
    }

    if (empStatusNorm.value === 'Exited' && exitParsed.iso === null) {
      missingByColumn.set('Exit_Date', (missingByColumn.get('Exit_Date') ?? 0) + 1);
    }

    uniqueValuesByCol.get('Employment_Status')?.add(empStatusNorm.value!);
    uniqueValuesByCol.get('Attrition_Status')?.add(attritionNorm.value!);

    parsedRows.push({
      employeeId: rawId,
      age: validAge,
      gender: genderNorm.value,
      department: deptRaw,
      jobRole: roleRaw,
      employmentType: empTypeNorm.value,
      hireDate: hireParsed.iso,
      hireTimestamp: hireParsed.ts,
      salaryNgn: validSalary,
      performanceRating: validPerf,
      trainingHours: validTrain,
      absenceDays: validAbs,
      jobSatisfactionScore: validSat,
      overtime: overtimeNorm.value,
      manager: managerRaw,
      employmentStatus: empStatusNorm.value,
      exitDate: exitParsed.iso,
      exitTimestamp: exitParsed.ts,
      attritionStatus: attritionNorm.value,
    });
  }

  // Compute imputation baselines from valid observed rows
  const ageMedian = Math.round(median(parsedRows.map((r) => r.age).filter((v): v is number => v !== null))) || 33;
  const salaryMedian = median(parsedRows.map((r) => r.salaryNgn).filter((v): v is number => v !== null)) || 500000;
  const perfMedian = median(parsedRows.map((r) => r.performanceRating).filter((v): v is number => v !== null)) || 3;
  const trainMedian = median(parsedRows.map((r) => r.trainingHours).filter((v): v is number => v !== null)) || 25;
  const absMedian = median(parsedRows.map((r) => r.absenceDays).filter((v): v is number => v !== null)) || 6;
  const satMedian = median(parsedRows.map((r) => r.jobSatisfactionScore).filter((v): v is number => v !== null)) || 3;

  const genderMode = mode(parsedRows.map((r) => r.gender).filter((v): v is string => v !== null), 'Unspecified');
  const deptMode = mode(parsedRows.map((r) => r.department).filter((v): v is string => v !== null), 'General');
  const roleMode = mode(parsedRows.map((r) => r.jobRole).filter((v): v is string => v !== null), 'Associate');
  const empTypeMode = mode(parsedRows.map((r) => r.employmentType).filter((v): v is string => v !== null), 'Full-time');
  const overtimeMode = mode(parsedRows.map((r) => r.overtime).filter((v): v is 'Yes' | 'No' => v !== null), 'No') as 'Yes' | 'No';
  const managerMode = mode(parsedRows.map((r) => r.manager).filter((v): v is string => v !== null), 'Unassigned');

  // Determine dataset snapshot date (latest valid Hire_Date or Exit_Date) for leak-free Hire_Date tenure
  const allTimestamps = parsedRows
    .flatMap((r) => [r.hireTimestamp, r.exitTimestamp])
    .filter((ts): ts is number => ts !== null);
  const maxTimestamp = allTimestamps.length > 0 ? Math.max(...allTimestamps) : null;
  const snapshotDate = maxTimestamp ? new Date(maxTimestamp).toISOString().slice(0, 10) : null;

  const hireTimestamps = parsedRows.map((r) => r.hireTimestamp).filter((ts): ts is number => ts !== null);
  const exitTimestamps = parsedRows.map((r) => r.exitTimestamp).filter((ts): ts is number => ts !== null);

  const minHireDate = hireTimestamps.length > 0 ? new Date(Math.min(...hireTimestamps)).toISOString().slice(0, 10) : null;
  const maxHireDate = hireTimestamps.length > 0 ? new Date(Math.max(...hireTimestamps)).toISOString().slice(0, 10) : null;
  const minExitDate = exitTimestamps.length > 0 ? new Date(Math.min(...exitTimestamps)).toISOString().slice(0, 10) : null;
  const maxExitDate = exitTimestamps.length > 0 ? new Date(Math.max(...exitTimestamps)).toISOString().slice(0, 10) : null;

  const records: EmployeeRecord[] = parsedRows.map((r) => {
    const yearsSinceHire =
      r.hireTimestamp !== null && maxTimestamp !== null
        ? Math.max(0, (maxTimestamp - r.hireTimestamp) / (365.25 * 86400000))
        : null;

    return {
      employeeId: r.employeeId,
      age: r.age ?? ageMedian,
      ageImputed: r.age === null,
      gender: r.gender ?? genderMode,
      department: r.department ?? deptMode,
      jobRole: r.jobRole ?? roleMode,
      employmentType: r.employmentType ?? empTypeMode,
      hireDate: r.hireDate,
      hireTimestamp: r.hireTimestamp,
      salaryNgn: r.salaryNgn ?? salaryMedian,
      salaryImputed: r.salaryNgn === null,
      performanceRating: r.performanceRating ?? perfMedian,
      performanceImputed: r.performanceRating === null,
      trainingHours: r.trainingHours ?? trainMedian,
      trainingImputed: r.trainingHours === null,
      absenceDays: r.absenceDays ?? absMedian,
      absenceImputed: r.absenceDays === null,
      jobSatisfactionScore: r.jobSatisfactionScore ?? satMedian,
      satisfactionImputed: r.jobSatisfactionScore === null,
      overtime: r.overtime ?? overtimeMode,
      manager: r.manager ?? managerMode,
      employmentStatus: r.employmentStatus ?? 'Active',
      exitDate: r.exitDate,
      exitTimestamp: r.exitTimestamp,
      attritionStatus: r.attritionStatus ?? 'No',
      yearsSinceHire,
    };
  });

  if (currencyArtifactsCleaned > 0) {
    warnings.push(
      `Cleaned ${currencyArtifactsCleaned} salary entries containing currency encoding artifacts (e.g. "?395,000") into numeric NGN values.`
    );
  }
  if (duplicateIdsList.length > 0) {
    warnings.push(`Removed ${duplicateIdsList.length} duplicate Employee_ID row(s).`);
  }

  const columnTypes: Record<CanonicalKey, ColumnProfile['detectedType']> = {
    Employee_ID: 'identifier',
    Age: 'numerical',
    Gender: 'categorical',
    Department: 'categorical',
    Job_Role: 'categorical',
    Employment_Type: 'categorical',
    Hire_Date: 'date',
    Salary_NGN: 'numerical',
    Performance_Rating: 'numerical',
    Training_Hours: 'numerical',
    Absence_Days: 'numerical',
    Job_Satisfaction_Score: 'numerical',
    Overtime: 'categorical',
    Manager: 'categorical',
    Employment_Status: 'categorical',
    Exit_Date: 'date',
    Attrition_Status: 'categorical',
  };

  const columnNotes: Record<CanonicalKey, string> = {
    Employee_ID: 'Unique identifier; excluded from ML features.',
    Age: 'Descriptive analytics only; excluded from ML scoring.',
    Gender: 'Protected demographic attribute; excluded from ML scoring.',
    Department: 'One-hot encoded predictor.',
    Job_Role: 'One-hot encoded predictor.',
    Employment_Type: 'One-hot encoded predictor.',
    Hire_Date: 'Used for trends & leak-free years-since-hire feature.',
    Salary_NGN: 'Cleaned numeric compensation in NGN (₦).',
    Performance_Rating: 'Ordinal performance score (1–5).',
    Training_Hours: 'Cumulative/annual training hours.',
    Absence_Days: 'Recorded absence days.',
    Job_Satisfaction_Score: 'Employee satisfaction score (1–5).',
    Overtime: 'Binary indicator (Yes/No).',
    Manager: 'Used for executive filtering only.',
    Employment_Status: 'Identifies active vs exited workforce.',
    Exit_Date: 'Used only for historical exit trend; strictly excluded from ML.',
    Attrition_Status: 'Supervised ML target variable (Yes = 1, No = 0).',
  };

  const columns: ColumnProfile[] = EXPECTED_COLUMNS.map((col) => {
    const uniq = uniqueValuesByCol.get(col) ?? new Set<string>();
    return {
      name: col,
      detectedType: columnTypes[col],
      missingCount: missingByColumn.get(col) ?? 0,
      uniqueCount: uniq.size,
      sampleValues: Array.from(uniq).slice(0, 3),
      notes: columnNotes[col],
    };
  });

  const missingValuesTotal = Array.from(missingByColumn.values()).reduce((a, b) => a + b, 0);

  return {
    records,
    report: {
      sourceName,
      rawRowCount: rawRows.length,
      cleanRowCount: records.length,
      duplicateIdsRemoved: duplicateIdsList.length,
      duplicateIdsList,
      missingValuesTotal,
      currencyArtifactsCleaned,
      categoryNormalizations,
      statusReconciliations,
      invalidDatesCount,
      snapshotDate,
      minHireDate,
      maxHireDate,
      minExitDate,
      maxExitDate,
      columns,
      warnings,
    },
  };
}
