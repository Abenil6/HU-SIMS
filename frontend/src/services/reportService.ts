import { apiGet, apiGetBlob, apiPost } from "./api";

/**
 * Reports Management System
 * 
 * Generates various school reports:
 * - Student Progress Reports
 * - Attendance Reports
 * - Academic Performance Reports
 * - Class Statistics
 * - Teacher Workload Reports
 */

// Report types
export type ReportType =
  | "student_report_card"
  | "student_transcript"
  | "student_progress"
  | "attendance_summary"
  | "academic_performance"
  | "class_statistics"
  | "teacher_workload"
  | "financial"
  | "exam_analysis"
  | "promotion_list";

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  parameters: ReportParameter[];
  generatedAt: string;
  status: "ready" | "generating" | "failed";
  downloadUrl?: string;
}

export interface ReportParameter {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "daterange";
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  parameters: ReportParameter[];
  format: "pdf" | "excel" | "csv";
  schedule?: {
    frequency: "daily" | "weekly" | "monthly" | "termly";
    recipients: string[];
  };
}

export interface ReportResult {
  reportId: string;
  generatedAt: string;
  data: Record<string, unknown>[];
  summary: Record<string, number>;
  downloadUrl: string;
}

// Report generation helpers
export function getReportTypeLabel(type: ReportType): string {
  const labels: Record<ReportType, string> = {
    student_report_card: "Student Report Card",
    student_transcript: "Student Transcript",
    student_progress: "Student Progress Report",
    attendance_summary: "Attendance Summary",
    academic_performance: "Academic Performance Report",
    class_statistics: "Class Statistics",
    teacher_workload: "Teacher Workload Report",
    financial: "Financial Report",
    exam_analysis: "Exam Analysis",
    promotion_list: "Promotion List",
  };
  return labels[type];
}

export function getReportDescription(type: ReportType): string {
  const descriptions: Record<ReportType, string> = {
    student_report_card:
      "Semester report card with subject marks, averages, rank, and behavior",
    student_transcript:
      "Official Grades 9-12 transcript with semester marks, cumulative averages, and rank",
    student_progress: "Detailed progress report for individual students",
    attendance_summary: "Attendance records and statistics",
    academic_performance: "Overall academic performance analysis",
    class_statistics: "Class-wise statistics and rankings",
    teacher_workload: "Teacher workload and class assignments",
    financial: "Financial statements and fee collection",
    exam_analysis: "Exam results analysis and statistics",
    promotion_list: "Students eligible for promotion",
  };
  return descriptions[type];
}

// API Service
export const reportService = {
  getReports: async () => apiGet("/reports"),
  getReport: async (id: string) => apiGet(`/reports/${id}`),
  downloadReport: async (
    reportId: string,
    format: "json" | "csv" | "html" = "json",
  ) => apiGetBlob(`/reports/${reportId}/export`, { format }),
  generateReportCard: async (params: {
    studentId: string;
    academicYear: string;
    semester?: string;
    behaviorGrade?: "A" | "B" | "C";
  }) => apiPost("/reports/report-card", params),
  generateStudentTranscriptOfficial: async (params: {
    studentId: string;
  }) => apiPost("/reports/transcript", params),
  generateAttendanceSummary: async (params: {
    studentId?: string;
    academicYear: string;
    month: string;
    grade?: string;
  }) => apiPost("/reports/attendance-summary", params),
  generateAcademicPerformance: async (params: {
    grade: string;
    semester: string;
    academicYear: string;
  }) => apiPost("/reports/academic-performance", params),
  generateClassProgress: async (params: {
    grade: string;
    semester: string;
    academicYear: string;
  }) =>
    apiPost("/reports/class-progress", {
      class: `Grade ${params.grade}`,
      semester: params.semester,
      academicYear: params.academicYear,
    }),
};

export default reportService;
