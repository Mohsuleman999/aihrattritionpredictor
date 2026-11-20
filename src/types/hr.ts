export type RiskCategory = 'Low' | 'Medium' | 'High' | 'Critical';

export interface EmployeeRecord {
  employeeId: string;
  age: number | null;
  ageImputed: boolean;
  gender: string;
  department: string;
  jobRole: string;
  employmentType: string;
  hireDate: string | null; // YYYY-MM-DD
  hireTimestamp: number | null;
  salaryNgn: number;
  salaryImputed: boolean;
  performanceRating: number;
  performanceImputed: boolean;
  trainingHours: number;
  trainingImputed: boolean;
  absenceDays: number;
  absenceImputed: boolean;
  jobSatisfactionScore: number;
  satisfactionImputed: boolean;
  overtime: 'Yes' | 'No';
  manager: string;
  employmentStatus: 'Active' | 'Exited';
  exitDate: string | null; // YYYY-MM-DD
  exitTimestamp: number | null;
  attritionStatus: 'Yes' | 'No';
  yearsSinceHire: number | null; // Strictly derived from Hire_Date to dataset snapshot date (no Exit_Date leakage)
}

export interface ColumnProfile {
  name: string;
  detectedType: 'numerical' | 'categorical' | 'date' | 'identifier';
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
  notes: string;
}

export interface DataQualityReport {
  sourceName: string;
  rawRowCount: number;
  cleanRowCount: number;
  duplicateIdsRemoved: number;
  duplicateIdsList: string[];
  missingValuesTotal: number;
  currencyArtifactsCleaned: number;
  categoryNormalizations: number;
  statusReconciliations: number;
  invalidDatesCount: number;
  snapshotDate: string | null;
  minHireDate: string | null;
  maxHireDate: string | null;
  minExitDate: string | null;
  maxExitDate: string | null;
  columns: ColumnProfile[];
  warnings: string[];
}

export interface FilterState {
  department: string;
  employmentType: string;
  manager: string;
  gender: string;
  jobRole: string;
  dateStart: string;
  dateEnd: string;
}

export interface KpiMetrics {
  totalEmployees: number;
  activeEmployees: number;
  exitedEmployees: number;
  recordedExitRate: number;
  avgSalaryNgn: number;
  medianSalaryNgn: number;
  activeAvgSalaryNgn: number;
  exitedAvgSalaryNgn: number;
  avgJobSatisfaction: number;
  activeAvgSatisfaction: number;
  exitedAvgSatisfaction: number;
  avgPerformanceRating: number;
  highPerformerShare: number;
  overtimeCount: number;
  overtimeShare: number;
  overtimeExitRate: number;
  nonOvertimeExitRate: number;
  distinctDepartments: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface CalibrationBin {
  binLabel: string;
  avgPredicted: number;
  observedRate: number;
  count: number;
}

export interface ValidationMetrics {
  splitMethod: 'chronological' | 'stratified';
  splitRationale: string;
  splitLimitation: string;
  trainCount: number;
  testCount: number;
  trainPositives: number;
  testPositives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number | null;
  brierScore: number;
  ece: number;
  calibrationStatus: 'Well-Calibrated' | 'Moderately Calibrated' | 'Recalibration Advised';
  meanPredictedProb: number;
  observedExitRate: number;
  confusionMatrix: ConfusionMatrix;
  calibrationBins: CalibrationBin[];
}

export interface FeatureImportanceItem {
  featureKey: string;
  label: string;
  importance: number; // Standardized |beta|
  coefficient: number; // Signed beta
  direction: 'increases-risk' | 'reduces-risk';
}

export interface ModelMetadata {
  isValid: boolean;
  algorithmName: string;
  unavailableReason: string | null;
  trainingSampleSize: number;
  positiveCount: number;
  negativeCount: number;
  baseExitRate: number;
  usedTenureFeature: boolean;
  tenureFeatureNote: string;
  excludedFeatures: string[];
  validation: ValidationMetrics | null;
  alternateValidation: ValidationMetrics | null;
  featureImportance: FeatureImportanceItem[];
}

export interface PredictionInput {
  employeeId?: string;
  age: number | null; // Descriptive only, excluded from ML model
  department: string;
  jobRole: string;
  employmentType: string;
  salaryNgn: number;
  performanceRating: number;
  trainingHours: number;
  absenceDays: number;
  jobSatisfactionScore: number;
  overtime: 'Yes' | 'No';
  yearsSinceHire: number | null;
}

export interface RiskDriver {
  featureLabel: string;
  inputValue: string;
  logOddsImpact: number;
  probabilityImpactPp: number; // Percentage-point shift vs baseline
  direction: 'risk-up' | 'risk-down';
  explanation: string;
}

export interface PredictionResult {
  probability: number; // 0 to 1
  riskCategory: RiskCategory;
  drivers: RiskDriver[];
  baselineProbability: number;
}

export interface DatasetInsight {
  id: string;
  topic: string;
  headline: string;
  metricBadge: string;
  detail: string;
  evidenceNote: string;
  tone: 'warning' | 'positive' | 'neutral';
}
