import { apiGet, apiPost, apiPut, apiDelete } from "./api";

/**
 * Percentage-Based Grading System
 * 
 * Students are graded using percentages (0-100)
 * No letter grades (A, B, C, etc.)
 * 
 * Grade Components:
 * - Tests (weighted)
 * - Assignments (weighted)
 * - Mid Exams (weighted)
 * - Final Exams (weighted)
 */

// Grade interfaces for percentage-based scoring
export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  grade: string; // Numeric grade level (9, 10, 11, 12)
  stream?: string;
  section: string;
  subject: string;
  // Assessment types simplified
  assessmentType: AssessmentType; // test, assignment, mid_exam, final_exam
  score: number; // Raw score
  maxScore: number; // Maximum possible score
  percentage: number; // Percentage score (0-100)
  weight: number; // Weight of this assessment (decimal, e.g., 0.2 = 20%)
  semester: string;
  academicYear: string;
  enteredBy: string;
  createdAt: string;
}

export type AssessmentType = 
  | "test"
  | "assignment"
  | "mid_exam"
  | "final_exam";

export interface SubjectResult {
  subject: string;
  assessments: Grade[];
  averagePercentage: number; // Weighted average
  totalWeight: number;
}

export interface StudentResult {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  section: string;
  subjects: SubjectResult[];
  overallAverage: number; // Overall average across all subjects
  semester: string;
  academicYear: string;
  status: "passed" | "failed" | "incomplete";
}

// Grade calculation helpers
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 10000) / 100;
}

export function calculateWeightedAverage(assessments: Grade[]): number {
  if (assessments.length === 0) return 0;
  
  const totalWeight = assessments.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = assessments.reduce((sum, a) => {
    return sum + (a.percentage * a.weight);
  }, 0);
  
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function getStatus(percentage: number): "passed" | "failed" | "incomplete" {
  if (percentage === 0) return "incomplete";
  return percentage >= 50 ? "passed" : "failed";
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return "#2e7d32"; // Excellent - Green
  if (percentage >= 80) return "#4caf50"; // Very Good - Green
  if (percentage >= 70) return "#2196f3"; // Good - Blue
  if (percentage >= 60) return "#ff9800"; // Satisfactory - Orange
  if (percentage >= 50) return "#ffc107"; // Pass - Amber
  return "#f44336"; // Fail - Red
}

export function getGradeDescription(percentage: number): string {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 80) return "Very Good";
  if (percentage >= 70) return "Good";
  if (percentage >= 60) return "Satisfactory";
  if (percentage >= 50) return "Pass";
  return "Fail";
}

// API Service
export const academicService = {
  // ============ GRADES ============
  
  // Get all grades with filters
  getGrades: async (params: {
    studentId?: string;
    grade?: string;
    section?: string;
    subject?: string;
    assessmentType?: AssessmentType;
    semester?: string;
    academicYear?: string;
    page?: number;
    limit?: number;
  }) => apiGet("/academic-records/grades", { ...params, limit: params.limit || 1000 }),

  // Enter new grade
  enterGrade: async (data: {
    studentId: string;
    subject: string;
    assessmentType: AssessmentType;
    score: number;
    maxScore: number;
    weight: number;
    semester: string;
    academicYear: string;
  }) => {
    const percentage = calculatePercentage(data.score, data.maxScore);
    return apiPost("/academic-records/grades", { ...data, percentage });
  },

  // Bulk enter grades
  bulkEnterGrades: async (grades: Array<{
    studentId: string;
    subject: string;
    assessmentType: AssessmentType;
    score: number;
    maxScore: number;
    weight: number;
    semester: string;
    academicYear: string;
  }>) => {
    const gradesWithPercentage = grades.map(g => ({
      ...g,
      percentage: calculatePercentage(g.score, g.maxScore)
    }));
    return apiPost("/academic-records/grades/bulk", { grades: gradesWithPercentage });
  },

  // Update grade
  updateGrade: async (id: string, data: { 
    score: number; 
    maxScore?: number;
    weight?: number;
  }) => {
    const percentage = calculatePercentage(data.score, data.maxScore || 100);
    return apiPut(`/academic-records/grades/${id}`, { ...data, percentage });
  },

  // Delete grade
  deleteGrade: async (id: string) => apiDelete(`/academic-records/grades/${id}`),

  // ============ STUDENT RESULTS ============

  // Get student result for a subject
  getStudentSubjectResult: async (studentId: string, subject: string, semester: string, academicYear: string) =>
    apiGet(`/academic-records/student/${studentId}/subject`, { subject, semester, academicYear }),

  // Get student overall result
  getStudentOverallResult: async (studentId: string, semester: string, academicYear: string) =>
    apiGet(`/academic-records/student/${studentId}/overall`, { semester, academicYear }),

  // Get class results
  getClassResults: async (grade: string, section: string, semester: string, academicYear: string) =>
    apiGet(`/academic-records/class/${grade}/${section}/results`, { semester, academicYear }),

  // ============ CALCULATIONS ============

  // Calculate weighted average
  calculateAverage: async (params: {
    studentId?: string;
    grade?: string;
    section?: string;
    subject?: string;
    semester?: string;
    academicYear?: string;
  }) => apiGet("/academic-records/calculate/average", params),

  // Calculate class statistics
  calculateClassStats: async (grade: string, section: string, subject: string, semester: string, academicYear: string) =>
    apiGet(`/academic-records/stats/${grade}/${section}`, { subject, semester, academicYear }),

  // ============ LISTS ============

  // Get students by score range
  getStudentsByScoreRange: async (params: {
    grade: string;
    section: string;
    subject: string;
    semester: string;
    academicYear: string;
    minScore?: number;
    maxScore?: number;
  }) => apiGet("/academic-records/by-range", params),

  // Get top performers
  getTopPerformers: async (grade: string, section: string, semester: string, academicYear: string, limit: number = 10) =>
    apiGet("/academic-records/top-performers", { grade, section, semester, academicYear, limit }),

  // Get failing students (below 50%)
  getFailingStudents: async (grade: string, semester: string, academicYear: string) =>
    apiGet("/academic-records/failing", { grade, semester, academicYear }),

  // ============ REPORTS ============

  // Generate student report card (percentage only, no letter grades)
  generateReportCard: async (studentId: string, semester: string, academicYear: string) =>
    apiGet(`/academic-records/report-card/${studentId}`, { semester, academicYear }),

  // Generate class report sheet
  generateClassReport: async (grade: string, section: string, semester: string, academicYear: string) =>
    apiGet(`/academic-records/class-report/${grade}/${section}`, { semester, academicYear }),

  // ============ EXPORT ============

  // Export grades to CSV
  exportGrades: async (params: { 
    grade: string; 
    section: string; 
    subject: string; 
    semester: string; 
    academicYear: string;
  }) => apiGet("/academic-records/export", { ...params, responseType: "blob" }),

  // Export report cards
  exportReportCards: async (params: { 
    grade: string; 
    section: string; 
    semester: string; 
    academicYear: string;
  }) => apiGet("/academic-records/export/reports", { ...params, responseType: "blob" }),

  // ============ HONOR ROLL ============

  // Get student honor roll status
  getHonorRollStatus: async (params: {
    studentId?: string;
    academicYear: string;
    semester: string;
  }) => apiGet("/academic-records/honor-roll/status", params),

  // Update honor roll status for a semester
  updateHonorRollStatus: async (data: {
    academicYear: string;
    semester: string;
  }) => apiPost("/academic-records/honor-roll/update", data),

  // Get honor roll list for a semester
  getHonorRollList: async (params: {
    academicYear: string;
    semester: string;
    honorRollType?: string;
  }) => apiGet("/academic-records/honor-roll/list", params),
};

export default academicService;
