import { useEffect, useMemo, useRef, useState } from 'react';
import defaultDatasetCsv from './data/defaultDataset.csv?raw';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { DashboardHeader } from './components/DashboardHeader';
import { DataQualityModal } from './components/DataQualityModal';
import { FilterBar } from './components/FilterBar';
import { KeyInsightsPanel } from './components/KeyInsightsPanel';
import { KpiGrid } from './components/KpiGrid';
import { PredictionPanel } from './components/PredictionPanel';
import { RiskMonitoringTable } from './components/RiskMonitoringTable';
import { RiskSegmentationSection, ScoredActiveEmployee } from './components/RiskSegmentationSection';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { predictAttrition, trainAttritionModel } from './ml/attritionModel';
import { EmployeeRecord, FilterState, PredictionInput, PredictionResult } from './types/hr';
import {
  computeChartData,
  computeKpis,
  extractFilterOptions,
  filterEmployees,
  generateKeyInsights,
} from './utils/analytics';
import { cleanAndAnalyzeDataset, parseCsvText, parseUploadedFile } from './utils/datasetProcessor';

function buildInputFromEmployee(emp: EmployeeRecord): PredictionInput {
  return {
    employeeId: emp.employeeId,
    age: emp.age,
    department: emp.department,
    jobRole: emp.jobRole,
    employmentType: emp.employmentType,
    salaryNgn: emp.salaryNgn,
    performanceRating: emp.performanceRating,
    trainingHours: emp.trainingHours,
    absenceDays: emp.absenceDays,
    jobSatisfactionScore: emp.jobSatisfactionScore,
    overtime: emp.overtime,
    yearsSinceHire: emp.yearsSinceHire,
  };
}

function buildDefaultInput(records: EmployeeRecord[]): {
  selectedId: string;
  input: PredictionInput;
} {
  const firstActive = records.find((r) => r.employmentStatus === 'Active') ?? records[0];
  if (firstActive) {
    return {
      selectedId: firstActive.employeeId,
      input: buildInputFromEmployee(firstActive),
    };
  }
  return {
    selectedId: '',
    input: {
      age: 32,
      department: 'Technology',
      jobRole: 'Data Analyst',
      employmentType: 'Full-time',
      salaryNgn: 550000,
      performanceRating: 3,
      trainingHours: 25,
      absenceDays: 6,
      jobSatisfactionScore: 3,
      overtime: 'No',
      yearsSinceHire: 2,
    },
  };
}

function buildInitialBundle() {
  const raw = parseCsvText(defaultDatasetCsv);
  const { records, report } = cleanAndAnalyzeDataset(raw, 'Employee_Attrition_Dataset.csv');
  const options = extractFilterOptions(records);
  const model = trainAttritionModel(records);
  const { selectedId, input } = buildDefaultInput(records);
  const initialResult = predictAttrition(model, input);
  return { records, report, options, model, selectedId, input, initialResult };
}

export default function App() {
  const initial = useMemo(() => buildInitialBundle(), []);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('hr-dashboard-theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    window.localStorage.setItem('hr-dashboard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const [records, setRecords] = useState(initial.records);
  const [report, setReport] = useState(initial.report);
  const [isCustomDataset, setIsCustomDataset] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);

  const options = useMemo(() => extractFilterOptions(records), [records]);
  const model = useMemo(() => trainAttritionModel(records), [records]);

  const [filters, setFilters] = useState<FilterState>(() => ({
    department: 'All',
    employmentType: 'All',
    manager: 'All',
    gender: 'All',
    jobRole: 'All',
    dateStart: initial.options.minDate,
    dateEnd: initial.options.maxDate,
  }));

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initial.selectedId);
  const [predictionInput, setPredictionInput] = useState<PredictionInput>(initial.input);
  const [committedPredictionInput, setCommittedPredictionInput] = useState<PredictionInput>(initial.input);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(initial.initialResult);
  const [hasPendingEdits, setHasPendingEdits] = useState(false);

  const predictionPanelRef = useRef<HTMLDivElement>(null);

  const filteredRecords = useMemo(() => filterEmployees(records, filters), [records, filters]);
  const kpis = useMemo(() => computeKpis(filteredRecords), [filteredRecords]);
  const chartData = useMemo(() => computeChartData(filteredRecords), [filteredRecords]);
  const insights = useMemo(() => generateKeyInsights(filteredRecords), [filteredRecords]);

  // Score active employees within the current filter scope using the trained ML model
  const scoredActiveEmployees: ScoredActiveEmployee[] = useMemo(() => {
    if (!model.metadata.isValid) return [];
    return filteredRecords
      .filter((r) => r.employmentStatus === 'Active')
      .map((emp) => {
        const res = predictAttrition(model, buildInputFromEmployee(emp));
        return {
          employeeId: emp.employeeId,
          department: emp.department,
          jobRole: emp.jobRole,
          jobSatisfactionScore: emp.jobSatisfactionScore,
          overtime: emp.overtime,
          absenceDays: emp.absenceDays,
          probability: res?.probability ?? 0,
          riskCategory: res?.riskCategory ?? 'Low',
        };
      });
  }, [filteredRecords, model]);

  const applyNewDataset = (rawRows: Record<string, unknown>[], sourceName: string, custom: boolean) => {
    const { records: nextRecords, report: nextReport } = cleanAndAnalyzeDataset(rawRows, sourceName);
    const nextOptions = extractFilterOptions(nextRecords);
    const nextModel = trainAttritionModel(nextRecords);
    const { selectedId, input } = buildDefaultInput(nextRecords);
    const nextRes = predictAttrition(nextModel, input);

    setRecords(nextRecords);
    setReport(nextReport);
    setIsCustomDataset(custom);
    setUploadError(null);
    setFilters({
      department: 'All',
      employmentType: 'All',
      manager: 'All',
      gender: 'All',
      jobRole: 'All',
      dateStart: nextOptions.minDate,
      dateEnd: nextOptions.maxDate,
    });
    setSelectedEmployeeId(selectedId);
    setPredictionInput(input);
    setCommittedPredictionInput(input);
    setPredictionResult(nextRes);
    setHasPendingEdits(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadError(null);
      const rawRows = await parseUploadedFile(file);
      applyNewDataset(rawRows, file.name, true);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to parse the uploaded file. Verify CSV/Excel format.'
      );
    }
  };

  const handleResetDataset = () => {
    const raw = parseCsvText(defaultDatasetCsv);
    applyNewDataset(raw, 'Employee_Attrition_Dataset.csv', false);
  };

  const handleResetFilters = () => {
    setFilters({
      department: 'All',
      employmentType: 'All',
      manager: 'All',
      gender: 'All',
      jobRole: 'All',
      dateStart: options.minDate,
      dateEnd: options.maxDate,
    });
  };

  const handleSelectEmployee = (employeeId: string, scrollToPanel = false) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) {
      setHasPendingEdits(true);
      return;
    }
    const emp = records.find((r) => r.employeeId === employeeId);
    if (emp) {
      const nextInput = buildInputFromEmployee(emp);
      setPredictionInput(nextInput);
      setCommittedPredictionInput(nextInput);
      setPredictionResult(predictAttrition(model, nextInput));
      setHasPendingEdits(false);
      if (scrollToPanel && predictionPanelRef.current) {
        predictionPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handleInputChange = (next: PredictionInput) => {
    setPredictionInput(next);
    setHasPendingEdits(true);
  };

  const handlePredictClick = () => {
    setCommittedPredictionInput(predictionInput);
    setPredictionResult(predictAttrition(model, predictionInput));
    setHasPendingEdits(false);
  };

  const selectedLabel = selectedEmployeeId
    ? `${selectedEmployeeId} (${committedPredictionInput.department})`
    : `Custom Profile (${committedPredictionInput.department})`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Executive Header */}
      <DashboardHeader
        report={report}
        isCustomDataset={isCustomDataset}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onFileUpload={handleFileUpload}
        onResetDataset={handleResetDataset}
        onOpenDataQuality={() => setIsQualityModalOpen(true)}
        uploadError={uploadError}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Filters & 8 Executive KPI Cards */}
        <FilterBar
          filters={filters}
          options={options}
          totalCount={records.length}
          filteredCount={filteredRecords.length}
          onChange={setFilters}
          onReset={handleResetFilters}
        />

        <KpiGrid kpis={kpis} />

        {/* Main Analytical Workspace: Left/Center Charts + Right AI Prediction Panel */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            <AnalyticsCharts data={chartData} totalFiltered={filteredRecords.length} isDark={isDark} />
          </div>

          <div ref={predictionPanelRef} className="xl:col-span-4 xl:sticky xl:top-6">
            <PredictionPanel
              model={model}
              records={records}
              options={options}
              selectedEmployeeId={selectedEmployeeId}
              input={predictionInput}
              result={predictionResult}
              hasPendingEdits={hasPendingEdits}
              isDark={isDark}
              onSelectEmployee={(id) => handleSelectEmployee(id, false)}
              onInputChange={handleInputChange}
              onPredict={handlePredictClick}
            />
          </div>
        </div>

        {/* Bottom Executive Intelligence & Operations Sections */}
        <RiskSegmentationSection
          scoredActive={scoredActiveEmployees}
          modelIsValid={model.metadata.isValid}
          unavailableReason={model.metadata.unavailableReason}
        />

        <WhatIfSimulator
          model={model}
          baselineInput={committedPredictionInput}
          selectedEmployeeLabel={selectedLabel}
        />

        <KeyInsightsPanel insights={insights} />

        <RiskMonitoringTable
          scoredActive={scoredActiveEmployees}
          modelIsValid={model.metadata.isValid}
          onSelectEmployeeForPrediction={(empId) => handleSelectEmployee(empId, true)}
        />
      </main>

      <DataQualityModal
        isOpen={isQualityModalOpen}
        report={report}
        onClose={() => setIsQualityModalOpen(false)}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}
