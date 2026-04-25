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

  // Get daily attendance report
  getDailyAttendance: async (grade: string, section: string, date: string) =>
    apiGet("/attendance/report/daily", {
      date,
      className: section ? `Grade ${grade} ${section}` : `Grade ${grade}`,
    }),

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

  // Delete one attendance record
  deleteAttendance: async (id: string) => apiDelete(`/attendance/${id}`),

  // Get student attendance summary
  getStudentSummary: async (studentId: string, academicYear?: string) =>
    apiGet("/attendance/summary/student", { studentId, academicYear }),

  // Get class attendance summary
  getClassSummary: async (grade: string, section: string, month: string, academicYear?: string) =>
    apiGet("/attendance/summary/class", {
      className: section ? `Grade ${grade} ${section}` : `Grade ${grade}`,
      month,
      academicYear: academicYear || String(new Date().getFullYear()),
    }),

  // Get attendance report (daily endpoint supported by backend)
  getReport: async (params: {
    grade?: string;
    section?: string;
    startDate: string;
    endDate: string;
    type?: "daily" | "monthly" | "summary";
  }) => apiGet("/attendance/report/daily", {
    date: params.startDate,
    className: params.section ? `Grade ${params.grade || ""} ${params.section}`.trim() : undefined,
  }),

  // Export attendance (client-side export uses fetched data where needed)
  exportAttendance: async (params: {
    grade: string;
    section: string;
    month: string;
    format?: "csv" | "pdf";
  }) => apiGet("/attendance/report/daily", {
    date: `${new Date().getFullYear()}-${params.month}-01`,
    className: params.section ? `Grade ${params.grade} ${params.section}` : `Grade ${params.grade}`,
    responseType: "blob",
  }),
};

export default attendanceService;
