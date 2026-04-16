import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import { debug } from "@/lib/debug";

export interface ExamSchedule {
  id: string;
  examName: string;
  examType: "Midterm" | "Final" | "Mock";
  subject: string;
  grade: number;
  section?: string;
  academicYear: string;
  semester: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room?: string;
  invigilator?: string;
  instructions?: string;
  notes?: string;
  maxMarks: number;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export const examScheduleService = {
  // Get all exam schedules with filters
  getExamSchedules: async (params: {
    academicYear?: string;
    semester?: string;
    grade?: number;
    section?: string;
    subject?: string;
    examType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    debug.examSchedule('Fetching exam schedules with params:', params);
    const response = await apiGet("/exam-schedules", params);
    debug.examSchedule('Response:', response);
    return response;
  },

  // Create new exam schedule
  createExamSchedule: async (data: Partial<ExamSchedule>) => {
    debug.examSchedule('Creating exam schedule:', data);
    const response = await apiPost("/exam-schedules", data);
    debug.examSchedule('Created:', response);
    return response;
  },

  // Get exam schedule by ID
  getExamScheduleById: async (id: string) => {
    debug.examSchedule('Fetching exam schedule by ID:', id);
    const response = await apiGet(`/exam-schedules/${id}`);
    debug.examSchedule('Response:', response);
    return response;
  },

  // Update exam schedule
  updateExamSchedule: async (id: string, data: Partial<ExamSchedule>) => {
    debug.examSchedule('Updating exam schedule:', id, data);
    const response = await apiPut(`/exam-schedules/${id}`, data);
    debug.examSchedule('Updated:', response);
    return response;
  },

  // Delete exam schedule
  deleteExamSchedule: async (id: string) => {
    debug.examSchedule('Deleting exam schedule:', id);
    const response = await apiDelete(`/exam-schedules/${id}`);
    debug.examSchedule('Deleted:', response);
    return response;
  },

  // Get student's upcoming exams
  getStudentUpcomingExams: async (studentId: string, params?: {
    academicYear?: string;
    semester?: string;
  }) => {
    debug.examSchedule('Fetching student upcoming exams:', studentId, params);
    const response = await apiGet(`/exam-schedules/student/${studentId}/upcoming`, params);
    debug.examSchedule('Response:', response);
    return response;
  },

  // Get exams by date range
  getExamsByDateRange: async (params: {
    startDate: string;
    endDate: string;
    academicYear?: string;
    semester?: string;
  }) => {
    debug.examSchedule('Fetching exams by date range:', params);
    const response = await apiGet("/exam-schedules/date-range", params);
    debug.examSchedule('Response:', response);
    return response;
  },

  // Auto-generate exam schedule
  autoGenerateSchedule: async (data: {
    grade: number;
    section?: string;
    academicYear: string;
    semester: string;
    examType: 'Midterm' | 'Final' | 'Mock';
    startDate: string;
    endDate: string;
  }) => {
    debug.examSchedule('Auto-generating exam schedule:', data);
    const response = await apiPost("/exam-schedules/auto-generate", data);
    debug.examSchedule('Generated:', response);
    return response;
  },

  // Regenerate/Optimize exam schedule
  regenerateSchedule: async (data: {
    grade: number;
    section?: string;
    academicYear: string;
    semester: string;
    examType: 'Midterm' | 'Final' | 'Mock';
    startDate: string;
    endDate: string;
  }) => {
    debug.examSchedule('Regenerating exam schedule:', data);
    const response = await apiPost("/exam-schedules/regenerate", data);
    debug.examSchedule('Regenerated:', response);
    return response;
  },
};

export default examScheduleService;
