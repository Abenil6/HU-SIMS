import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  stream?: string;
  date: string;
  period?: number;
  status: "Present" | "Absent" | "Late" | "Excused";
  markedBy: string;
  remarks?: string;
  createdAt: string;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export const attendanceService = {
  // Get attendance records
  getAttendance: async (params: {
    grade?: string;
    section?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) => apiGet("/attendance", { ...params, limit: params.limit || 1000 }),

  // Get daily attendance for a class
  getDailyAttendance: async (grade: string, section: string, date: string) =>
    apiGet(`/attendance/daily/${grade}/${section}/${date}`),

  // Mark attendance
  markAttendance: async (data: {
    student: string;
    date: string;
    status: "Present" | "Absent" | "Late" | "Excused";
    period?: number;
    subject?: string;
    remarks?: string;
  }) => apiPost("/attendance/mark", data),

  // Bulk mark attendance for selected class
  bulkMarkAttendance: async (data: {
    date: string;
    classGrade: string;
    classStream?: string;
    period?: number;
    subject?: string;
    records: Array<{ student: string; status: "Present" | "Absent" | "Late" | "Excused"; remarks?: string }>;
  }) => apiPost("/attendance/bulk", data),

  // Update single record
  updateAttendance: async (id: string, data: { status: string; remarks?: string }) =>
    apiPut(`/attendance/${id}`, data),

  // Bulk update attendance
  bulkUpdate: async (data: { ids: string[]; status: string }) =>
    apiPut("/attendance/bulk", data),

  // Get student attendance summary
  getStudentSummary: async (studentId: string, month?: string) =>
    apiGet(`/attendance/student/${studentId}/summary`, { month }),

  // Get class attendance summary
  getClassSummary: async (grade: string, section: string, month: string) =>
    apiGet(`/attendance/class/${grade}/${section}/summary`, { month }),

  // Get attendance report
  getReport: async (params: {
    grade?: string;
    section?: string;
    startDate: string;
    endDate: string;
    type?: "daily" | "monthly" | "summary";
  }) => apiGet("/attendance/report", params),

  // Export attendance
  exportAttendance: async (params: {
    grade: string;
    section: string;
    month: string;
    format?: "csv" | "pdf";
  }) => apiGet("/attendance/export", { ...params, responseType: "blob" }),
};

export default attendanceService;
