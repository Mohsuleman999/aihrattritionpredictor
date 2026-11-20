import {
  CalibrationBin,
  EmployeeRecord,
  FeatureImportanceItem,
  ModelMetadata,
  PredictionInput,
  PredictionResult,
  RiskDriver,
  ValidationMetrics,
} from '../types/hr';
import { classifyRisk } from '../utils/formatters';

interface FeatureSpec {
  key: string;
  label: string;
  group: string;
  kind: 'numeric' | 'binary' | 'onehot';
  categoryValue?: string;
}

interface FittedPreprocessor {
  specs: FeatureSpec[];
  means: number[];
  stds: number[];
  includeTenure: boolean;
  departments: string[];
  jobRoles: string[];
  employmentTypes: string[];
}

export interface TrainedAttritionModel {
  metadata: ModelMetadata;
  preprocessor: FittedPreprocessor | null;
  weights: number[]; // length = specs.length + 1 (index 0 = calibrated intercept)
  rawIntercept: number;
  priorShift: number;
  baseExitRate: number;
}

function sigmoid(z: number): number {
  if (z >= 35) return 1 - 1e-15;
  if (z <= -35) return 1e-15;
  return 1 / (1 + Math.exp(-z));
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > maxVal) {
        maxVal = v;
        pivotRow = r;
      }
    }
    if (maxVal < 1e-12) return null;
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }
    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (Math.abs(factor) < 1e-15) continue;
      for (let j = col; j <= n; j++) {
        M[r][j] -= factor * M[col][j];
      }
    }
  }
  return M.map((row) => row[n]);
}

function extractRawFeatureVector(
  item: {
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
  },
  prep: Omit<FittedPreprocessor, 'means' | 'stds'>
): number[] {
  const vec: number[] = [
    Math.log1p(Math.max(0, item.salaryNgn)),
    item.performanceRating,
    item.trainingHours,
    item.absenceDays,
    item.jobSatisfactionScore,
    item.overtime === 'Yes' ? 1 : 0,
  ];
  if (prep.includeTenure) {
    vec.push(item.yearsSinceHire ?? 0);
  }
  for (const d of prep.departments) {
    vec.push(item.department === d ? 1 : 0);
  }
  for (const r of prep.jobRoles) {
    vec.push(item.jobRole === r ? 1 : 0);
  }
  for (const e of prep.employmentTypes) {
    vec.push(item.employmentType === e ? 1 : 0);
  }
  return vec;
}

function fitPreprocessor(trainRecords: EmployeeRecord[], includeTenure: boolean): FittedPreprocessor {
  const deptCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  for (const r of trainRecords) {
    deptCounts.set(r.department, (deptCounts.get(r.department) ?? 0) + 1);
    roleCounts.set(r.jobRole, (roleCounts.get(r.jobRole) ?? 0) + 1);
    typeCounts.set(r.employmentType, (typeCounts.get(r.employmentType) ?? 0) + 1);
  }

  // Keep categories with >= 2 samples in training fold to avoid singular spikes; sort deterministically
  const departments = Array.from(deptCounts.entries())
    .filter(([, c]) => c >= 2)
    .map(([k]) => k)
    .sort();
  const jobRoles = Array.from(roleCounts.entries())
    .filter(([, c]) => c >= 2)
    .map(([k]) => k)
    .sort();
  const employmentTypes = Array.from(typeCounts.entries())
    .filter(([, c]) => c >= 2)
    .map(([k]) => k)
    .sort();

  const specs: FeatureSpec[] = [
    { key: 'salaryLog', label: 'Salary (NGN, log scale)', group: 'Compensation', kind: 'numeric' },
    { key: 'performanceRating', label: 'Performance Rating', group: 'Performance', kind: 'numeric' },
    { key: 'trainingHours', label: 'Training Hours', group: 'Development', kind: 'numeric' },
    { key: 'absenceDays', label: 'Absence Days', group: 'Attendance', kind: 'numeric' },
    { key: 'jobSatisfactionScore', label: 'Job Satisfaction Score', group: 'Engagement', kind: 'numeric' },
    { key: 'overtime', label: 'Overtime (Yes)', group: 'Workload', kind: 'binary' },
  ];

  if (includeTenure) {
    specs.push({ key: 'yearsSinceHire', label: 'Years Since Hire', group: 'Tenure', kind: 'numeric' });
  }
  for (const d of departments) {
    specs.push({ key: `dept:${d}`, label: `Department: ${d}`, group: 'Department', kind: 'onehot', categoryValue: d });
  }
  for (const r of jobRoles) {
    specs.push({ key: `role:${r}`, label: `Job Role: ${r}`, group: 'Job Role', kind: 'onehot', categoryValue: r });
  }
  for (const e of employmentTypes) {
    specs.push({
      key: `type:${e}`,
      label: `Employment Type: ${e}`,
      group: 'Employment Type',
      kind: 'onehot',
      categoryValue: e,
    });
  }

  const basePrep = { specs, includeTenure, departments, jobRoles, employmentTypes };
  const rawMatrix = trainRecords.map((rec) => extractRawFeatureVector(rec, basePrep));
  const d = specs.length;
  const n = rawMatrix.length;

  const means = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      means[j] += rawMatrix[i][j];
    }
  }
  for (let j = 0; j < d; j++) means[j] /= n;

  const stds = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      const diff = rawMatrix[i][j] - means[j];
      stds[j] += diff * diff;
    }
  }
  for (let j = 0; j < d; j++) {
    const s = Math.sqrt(stds[j] / Math.max(1, n));
    stds[j] = s > 1e-6 ? s : 1;
  }

  return {
    ...basePrep,
    means,
    stds,
  };
}

function transformRecord(
  item: Parameters<typeof extractRawFeatureVector>[0],
  prep: FittedPreprocessor
): number[] {
  const raw = extractRawFeatureVector(item, prep);
  const z = new Array<number>(raw.length + 1);
  z[0] = 1; // intercept
  for (let j = 0; j < raw.length; j++) {
    z[j + 1] = (raw[j] - prep.means[j]) / prep.stds[j];
  }
  return z;
}

function fitLogisticRegressionIRLS(
  X: number[][],
  y: number[],
  l2Lambda = 8.0
): { weights: number[]; rawIntercept: number; priorShift: number } {
  const n = X.length;
  const p = X[0].length;
  const posCount = y.reduce((s, v) => s + v, 0);
  const negCount = n - posCount;

  // Balanced class weights for decision boundary stability under imbalance
  const wPos = posCount > 0 ? n / (2 * posCount) : 1;
  const wNeg = negCount > 0 ? n / (2 * negCount) : 1;
  const sampleWeights = y.map((yi) => (yi === 1 ? wPos : wNeg));

  const beta = new Array<number>(p).fill(0);

  const computeLoss = (wVec: number[]): number => {
    let loss = 0;
    for (let i = 0; i < n; i++) {
      let z = 0;
      for (let j = 0; j < p; j++) z += X[i][j] * wVec[j];
      const pred = sigmoid(z);
      loss -= sampleWeights[i] * (y[i] * Math.log(pred + 1e-15) + (1 - y[i]) * Math.log(1 - pred + 1e-15));
    }
    for (let j = 1; j < p; j++) {
      loss += 0.5 * l2Lambda * wVec[j] * wVec[j];
    }
    return loss;
  };

  let currentLoss = computeLoss(beta);

  for (let iter = 0; iter < 30; iter++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));

    for (let i = 0; i < n; i++) {
      let z = 0;
      const xi = X[i];
      for (let j = 0; j < p; j++) z += xi[j] * beta[j];
      const pred = sigmoid(z);
      const wi = sampleWeights[i];
      const err = wi * (pred - y[i]);
      const hessW = wi * Math.max(pred * (1 - pred), 1e-6);

      for (let j = 0; j < p; j++) {
        grad[j] += err * xi[j];
        const xij = xi[j];
        for (let k = j; k < p; k++) {
          H[j][k] += hessW * xij * xi[k];
        }
      }
    }

    for (let j = 0; j < p; j++) {
      if (j > 0) {
        grad[j] += l2Lambda * beta[j];
        H[j][j] += l2Lambda;
      } else {
        H[0][0] += 1e-6;
      }
      for (let k = 0; k < j; k++) {
        H[j][k] = H[k][j];
      }
    }

    const step = solveLinearSystem(H, grad);
    if (!step) break;

    let stepNorm = 0;
    for (let j = 0; j < p; j++) stepNorm += step[j] * step[j];
    if (Math.sqrt(stepNorm) < 1e-6) break;

    // Backtracking line search
    let alpha = 1.0;
    let accepted = false;
    while (alpha >= 1e-4) {
      const candidate = beta.map((b, j) => b - alpha * step[j]);
      const candLoss = computeLoss(candidate);
      if (candLoss <= currentLoss + 1e-9) {
        for (let j = 0; j < p; j++) beta[j] = candidate[j];
        currentLoss = candLoss;
        accepted = true;
        break;
      }
      alpha *= 0.5;
    }
    if (!accepted) break;
  }

  // Analytical Bayes prior-odds correction to restore calibrated probabilities
  // from balanced class weighting back to true observed training base rate
  const rawIntercept = beta[0];
  const priorShift = Math.log(wPos / wNeg);
  const calibratedWeights = [...beta];
  calibratedWeights[0] = rawIntercept - priorShift;

  return {
    weights: calibratedWeights,
    rawIntercept,
    priorShift,
  };
}

function computeRocAuc(yTrue: number[], yScores: number[]): number | null {
  const posScores: number[] = [];
  const negScores: number[] = [];
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1) posScores.push(yScores[i]);
    else negScores.push(yScores[i]);
  }
  if (posScores.length === 0 || negScores.length === 0) return null;

  let wins = 0;
  for (const p of posScores) {
    for (const n of negScores) {
      if (p > n) wins += 1;
      else if (p === n) wins += 0.5;
    }
  }
  return wins / (posScores.length * negScores.length);
}

function evaluateSplit(
  trainRecords: EmployeeRecord[],
  testRecords: EmployeeRecord[],
  includeTenure: boolean,
  splitMethod: 'chronological' | 'stratified',
  splitRationale: string,
  splitLimitation: string
): ValidationMetrics {
  const prep = fitPreprocessor(trainRecords, includeTenure);
  const XTrain = trainRecords.map((r) => transformRecord(r, prep));
  const yTrain: number[] = trainRecords.map((r) => (r.attritionStatus === 'Yes' ? 1 : 0));

  const { weights } = fitLogisticRegressionIRLS(XTrain, yTrain);

  const XTest = testRecords.map((r) => transformRecord(r, prep));
  const yTest: number[] = testRecords.map((r) => (r.attritionStatus === 'Yes' ? 1 : 0));

  const probs = XTest.map((row) => {
    let z = 0;
    for (let j = 0; j < row.length; j++) z += row[j] * weights[j];
    return sigmoid(z);
  });

  // Use training base exit rate as balanced classification threshold for confusion matrix
  const trainBaseRate = yTrain.reduce((a, b) => a + b, 0) / yTrain.length;
  const threshold = Math.max(0.2, Math.min(0.5, trainBaseRate));

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let brierSum = 0;
  let probSum = 0;

  for (let i = 0; i < yTest.length; i++) {
    const p = probs[i];
    const actual = yTest[i];
    const pred = p >= threshold ? 1 : 0;
    if (actual === 1 && pred === 1) tp++;
    else if (actual === 0 && pred === 1) fp++;
    else if (actual === 0 && pred === 0) tn++;
    else fn++;

    brierSum += (p - actual) * (p - actual);
    probSum += p;
  }

  const accuracy = (tp + tn) / Math.max(1, yTest.length);
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const rocAuc = computeRocAuc(yTest, probs);
  const brierScore = brierSum / Math.max(1, yTest.length);

  // Calibration bins (0-20%, 20-40%, 40-60%, 60-100%)
  const binEdges = [
    { label: '0–20%', min: 0, max: 0.2 },
    { label: '20–40%', min: 0.2, max: 0.4 },
    { label: '40–60%', min: 0.4, max: 0.6 },
    { label: '60–100%', min: 0.6, max: 1.01 },
  ];

  const calibrationBins: CalibrationBin[] = [];
  let ece = 0;
  for (const edge of binEdges) {
    const idxs: number[] = [];
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] >= edge.min && probs[i] < edge.max) idxs.push(i);
    }
    if (idxs.length > 0) {
      const avgP = idxs.reduce((s, idx) => s + probs[idx], 0) / idxs.length;
      const obs = idxs.reduce((s, idx) => s + yTest[idx], 0) / idxs.length;
      ece += (idxs.length / probs.length) * Math.abs(avgP - obs);
      calibrationBins.push({
        binLabel: edge.label,
        avgPredicted: avgP,
        observedRate: obs,
        count: idxs.length,
      });
    }
  }

  const calibrationStatus: ValidationMetrics['calibrationStatus'] =
    ece < 0.08 ? 'Well-Calibrated' : ece < 0.14 ? 'Moderately Calibrated' : 'Recalibration Advised';

  const testPositives = yTest.reduce((a, b) => a + b, 0);

  return {
    splitMethod,
    splitRationale,
    splitLimitation,
    trainCount: trainRecords.length,
    testCount: testRecords.length,
    trainPositives: yTrain.reduce((a, b) => a + b, 0),
    testPositives,
    accuracy,
    precision,
    recall,
    f1Score,
    rocAuc,
    brierScore,
    ece,
    calibrationStatus,
    meanPredictedProb: probSum / Math.max(1, yTest.length),
    observedExitRate: testPositives / Math.max(1, yTest.length),
    confusionMatrix: { tp, fp, tn, fn },
    calibrationBins,
  };
}

function deterministicShuffle<T>(arr: T[], seed = 42): T[] {
  const copy = [...arr];
  let state = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function createStratifiedSplit(records: EmployeeRecord[], testRatio = 0.2): {
  train: EmployeeRecord[];
  test: EmployeeRecord[];
} {
  const pos = deterministicShuffle(
    records.filter((r) => r.attritionStatus === 'Yes'),
    101
  );
  const neg = deterministicShuffle(
    records.filter((r) => r.attritionStatus === 'No'),
    202
  );

  const posTestCount = Math.max(1, Math.round(pos.length * testRatio));
  const negTestCount = Math.max(1, Math.round(neg.length * testRatio));

  return {
    test: [...pos.slice(0, posTestCount), ...neg.slice(0, negTestCount)],
    train: [...pos.slice(posTestCount), ...neg.slice(negTestCount)],
  };
}

export function trainAttritionModel(records: EmployeeRecord[]): TrainedAttritionModel {
  const positives = records.filter((r) => r.attritionStatus === 'Yes').length;
  const negatives = records.length - positives;
  const baseExitRate = records.length > 0 ? positives / records.length : 0;

  const excludedFeatures = [
    'Employee_ID',
    'Attrition_Status',
    'Exit_Date',
    'Employment_Status',
    'Age',
    'Gender',
    'Manager',
  ];

  if (records.length < 30 || positives < 5 || negatives < 5) {
    return {
      metadata: {
        isValid: false,
        algorithmName: 'L2-Regularized Calibrated Logistic Regression',
        unavailableReason: `Insufficient labeled data to train a reliable supervised model (${records.length} rows: ${positives} exited, ${negatives} active). At least 30 records with 5+ exited and 5+ active examples are required.`,
        trainingSampleSize: records.length,
        positiveCount: positives,
        negativeCount: negatives,
        baseExitRate,
        usedTenureFeature: false,
        tenureFeatureNote: 'Not evaluated due to insufficient training sample.',
        excludedFeatures,
        validation: null,
        alternateValidation: null,
        featureImportance: [],
      },
      preprocessor: null,
      weights: [],
      rawIntercept: 0,
      priorShift: 0,
      baseExitRate,
    };
  }

  const validHireCount = records.filter((r) => r.hireTimestamp !== null).length;
  const includeTenure = validHireCount >= Math.floor(records.length * 0.8);
  const tenureFeatureNote = includeTenure
    ? 'Years since Hire_Date measured to dataset snapshot date (no Exit_Date used, zero future-leakage).'
    : 'Excluded because Hire_Date is missing for >20% of records.';

  // Build Stratified 80/20 split
  const stratified = createStratifiedSplit(records, 0.2);

  // Build Chronological Hire-Cohort 80/20 split if supported by reliable Hire_Date records
  let chronoMetrics: ValidationMetrics | null = null;
  if (includeTenure) {
    const dated = [...records]
      .filter((r) => r.hireTimestamp !== null)
      .sort((a, b) => (a.hireTimestamp ?? 0) - (b.hireTimestamp ?? 0));
    const splitIdx = Math.floor(dated.length * 0.8);
    const chronoTrain = dated.slice(0, splitIdx);
    const chronoTest = dated.slice(splitIdx);
    const chronoTestPos = chronoTest.filter((r) => r.attritionStatus === 'Yes').length;
    const chronoTestNeg = chronoTest.length - chronoTestPos;

    if (chronoTestPos >= 5 && chronoTestNeg >= 5) {
      chronoMetrics = evaluateSplit(
        chronoTrain,
        chronoTest,
        includeTenure,
        'chronological',
        '80/20 chronological hire-cohort split (earliest 80% hires train, latest 20% hires validate).',
        'Single-snapshot datasets lack longitudinal feature timestamps; recent hire cohorts exhibit right-censoring and shifted exit base rates.'
      );
    }
  }

  const stratifiedMetrics = evaluateSplit(
    stratified.train,
    stratified.test,
    includeTenure,
    'stratified',
    '80/20 stratified holdout preserving exact class proportions across this cross-sectional workforce snapshot.',
    chronoMetrics && (chronoMetrics.rocAuc ?? 0) < 0.58
      ? `Stratified splits assume stationarity across hire cohorts. Chronological hire-cohort validation yielded lower discrimination (ROC-AUC ${chronoMetrics.rocAuc?.toFixed(3) ?? 'N/A'}) because single-snapshot records lack point-in-time historical features and recent hires have shorter observation windows.`
      : 'Stratified splits evaluate across mixed hire cohorts and assume stationarity across time.'
  );

  // Use chronological validation when supported by stable temporal generalization; otherwise use stratified validation
  const chronoSupported =
    chronoMetrics !== null && (chronoMetrics.rocAuc ?? 0) >= 0.58;
  const primaryValidation = chronoSupported ? chronoMetrics : stratifiedMetrics;
  const alternateValidation = chronoSupported ? stratifiedMetrics : chronoMetrics;

  // Train final calibrated model on 100% of records for active employee scoring
  const fullPrep = fitPreprocessor(records, includeTenure);
  const XFull = records.map((r) => transformRecord(r, fullPrep));
  const yFull = records.map((r) => (r.attritionStatus === 'Yes' ? 1 : 0));
  const { weights, rawIntercept, priorShift } = fitLogisticRegressionIRLS(XFull, yFull);

  const featureImportance: FeatureImportanceItem[] = fullPrep.specs
    .map((spec, idx) => {
      const coef = weights[idx + 1];
      return {
        featureKey: spec.key,
        label: spec.label,
        importance: Math.abs(coef),
        coefficient: coef,
        direction: coef >= 0 ? ('increases-risk' as const) : ('reduces-risk' as const),
      };
    })
    .sort((a, b) => b.importance - a.importance);

  return {
    metadata: {
      isValid: true,
      algorithmName: 'L2-Regularized Calibrated Logistic Regression',
      unavailableReason: null,
      trainingSampleSize: records.length,
      positiveCount: positives,
      negativeCount: negatives,
      baseExitRate,
      usedTenureFeature: includeTenure,
      tenureFeatureNote,
      excludedFeatures,
      validation: primaryValidation,
      alternateValidation,
      featureImportance,
    },
    preprocessor: fullPrep,
    weights,
    rawIntercept,
    priorShift,
    baseExitRate,
  };
}

export function predictAttrition(
  model: TrainedAttritionModel,
  input: PredictionInput
): PredictionResult | null {
  if (!model.metadata.isValid || !model.preprocessor) return null;

  const prep = model.preprocessor;
  const zVec = transformRecord(
    {
      department: input.department,
      jobRole: input.jobRole,
      employmentType: input.employmentType,
      salaryNgn: input.salaryNgn,
      performanceRating: input.performanceRating,
      trainingHours: input.trainingHours,
      absenceDays: input.absenceDays,
      jobSatisfactionScore: input.jobSatisfactionScore,
      overtime: input.overtime,
      yearsSinceHire: input.yearsSinceHire,
    },
    prep
  );

  let logit = 0;
  for (let j = 0; j < zVec.length; j++) {
    logit += zVec[j] * model.weights[j];
  }
  const probability = sigmoid(logit);
  const baselineProbability = sigmoid(model.weights[0]);

  // Group one-hot features so Department, Job Role, Employment Type each appear as one clear driver
  const groupedImpacts = new Map<
    string,
    { label: string; inputValue: string; logOddsImpact: number }
  >();

  for (let idx = 0; idx < prep.specs.length; idx++) {
    const spec = prep.specs[idx];
    const impact = zVec[idx + 1] * model.weights[idx + 1];
    if (spec.kind === 'onehot') {
      const existing = groupedImpacts.get(spec.group);
      const val =
        spec.group === 'Department'
          ? input.department
          : spec.group === 'Job Role'
            ? input.jobRole
            : input.employmentType;
      groupedImpacts.set(spec.group, {
        label: spec.group,
        inputValue: val,
        logOddsImpact: (existing?.logOddsImpact ?? 0) + impact,
      });
    } else {
      let displayVal = '';
      if (spec.key === 'salaryLog') displayVal = `₦${Math.round(input.salaryNgn).toLocaleString('en-NG')}`;
      else if (spec.key === 'performanceRating') displayVal = `${input.performanceRating} / 5`;
      else if (spec.key === 'trainingHours') displayVal = `${input.trainingHours} hrs`;
      else if (spec.key === 'absenceDays') displayVal = `${input.absenceDays} days`;
      else if (spec.key === 'jobSatisfactionScore') displayVal = `${input.jobSatisfactionScore} / 5`;
      else if (spec.key === 'overtime') displayVal = input.overtime;
      else if (spec.key === 'yearsSinceHire')
        displayVal = input.yearsSinceHire !== null ? `${input.yearsSinceHire.toFixed(1)} yrs` : 'N/A';

      groupedImpacts.set(spec.key, {
        label: spec.label.replace(' (NGN, log scale)', '').replace(' (Yes)', ''),
        inputValue: displayVal,
        logOddsImpact: impact,
      });
    }
  }

  const drivers: RiskDriver[] = Array.from(groupedImpacts.values())
    .map((item) => {
      const probWithoutFeature = sigmoid(logit - item.logOddsImpact);
      const probabilityImpactPp = (probability - probWithoutFeature) * 100;
      const direction: RiskDriver['direction'] =
        item.logOddsImpact >= 0 ? 'risk-up' : 'risk-down';
      const absPp = Math.abs(probabilityImpactPp).toFixed(1);
      const explanation =
        direction === 'risk-up'
          ? `Increases predicted exit probability by +${absPp} pp relative to workforce baseline.`
          : `Reduces predicted exit probability by −${absPp} pp relative to workforce baseline.`;

      return {
        featureLabel: item.label,
        inputValue: item.inputValue,
        logOddsImpact: item.logOddsImpact,
        probabilityImpactPp,
        direction,
        explanation,
      };
    })
    .sort((a, b) => Math.abs(b.probabilityImpactPp) - Math.abs(a.probabilityImpactPp));

  return {
    probability,
    riskCategory: classifyRisk(probability),
    drivers,
    baselineProbability,
  };
}
