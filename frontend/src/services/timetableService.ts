import { apiGet, apiPost, apiPut, apiDelete } from "./api";

/**
 * Timetable Management System
 * 
 * Manages class schedules, periods, teacher assignments
 * Supports weekly timetables with multiple sections
 */

// Timetable interfaces
export interface Period {
  id: string;
  periodNumber: number;
  startTime: string; // HH:mm format
  endTime: string;
  duration: number; // in minutes
}

export interface TimeSlot {
  id: string;
  day: DayOfWeek;
  periodId: string;
  period: Period;
  subject: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  section: string;
  room?: string;
  semester: string;
  academicYear: string;
}

export type DayOfWeek = 
  | "Monday" 
  | "Tuesday" 
  | "Wednesday" 
  | "Thursday" 
  | "Friday" 
  | "Saturday";

export interface ClassTimetable {
  id: string;
  grade: string;
  section: string;
  semester: string;
  academicYear: string;
  timeSlots: TimeSlot[];
}

export interface TimetableScheduleEntry {
  _id?: string;
  id?: string;
  day: DayOfWeek;
  period: number | {
    id?: string;
    periodNumber?: number;
    startTime?: string;
    endTime?: string;
    duration?: number;
  };
  subject: string;
  teacher?: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
}

export interface Timetable {
  _id?: string;
  id?: string;
  class: string;
  section?: string;
  stream?: string;
  academicYear: string;
  semester: string;
  schedule: TimetableScheduleEntry[];
  status?: "Draft" | "Published";
  version?: number;
  versionGroup?: string;
  isLocked?: boolean;
  generatedBySystem?: boolean;
  generationWarnings?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTimetableData {
  class?: string;
  grade?: string;
  section?: string;
  stream?: string;
  academicYear: string;
  semester: string;
  schedule?: TimetableScheduleEntry[];
  schedules?: Array<{
    day: DayOfWeek;
    period: {
      id: string;
      periodNumber: number;
      startTime: string;
      endTime: string;
    };
    subject: string;
    teacherId?: string;
    teacherName?: string;
    room?: string;
  }>;
}

export interface TeacherSchedule {
  teacherId: string;
  teacherName: string;
  timetable: TimeSlot[];
  freePeriods: Period[];
}

export interface RoomSchedule {
  room: string;
  timetable: TimeSlot[];
}

// Default periods configuration
export const defaultPeriods: Period[] = [
  { id: "1", periodNumber: 1, startTime: "08:00", endTime: "08:45", duration: 45 },
  { id: "2", periodNumber: 2, startTime: "08:45", endTime: "09:30", duration: 45 },
  { id: "3", periodNumber: 3, startTime: "09:30", endTime: "10:15", duration: 45 },
  { id: "4", periodNumber: 4, startTime: "10:30", endTime: "11:15", duration: 45 },
  { id: "5", periodNumber: 5, startTime: "11:15", endTime: "12:00", duration: 45 },
  { id: "6", periodNumber: 6, startTime: "12:00", endTime: "12:45", duration: 45 },
  { id: "7", periodNumber: 7, startTime: "12:45", endTime: "13:30", duration: 45 },
];

export const daysOfWeek: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const subjects = [
  "Mathematics",
  "English",
  "Biology",
  "Chemistry",
  "Physics",
  "Geography",
  "History",
  "Civics",
  "Information Communication Technology (ICT)",
  "Amharic",
  "Physical and Health Education (HPE)",
  "Economics",
];

// API Service
export const timetableService = {
  // New unified timetable methods (used by hooks/pages)
  getTimetables: async (params?: {
    classId?: string;
    class?: string;
    stream?: string;
    section?: string;
    semester?: string;
    academicYear?: string;
    status?: string;
    teacherId?: string;
    studentId?: string;
    day?: string;
    page?: number;
    limit?: number;
  }) => apiGet<{ success: boolean; data: Timetable[]; pagination?: any }>("/timetables", { ...params, limit: params?.limit || 1000 }),

  getTimetable: async (id: string) =>
    apiGet<{ success: boolean; data: Timetable }>(`/timetables/${id}`),

  createTimetable: async (data: CreateTimetableData) => {
    const payload: any = {
      class: data.class || data.grade,
      section: data.section,
      stream: data.stream,
      academicYear: data.academicYear,
      semester:
        String(data.semester).startsWith("Semester")
          ? data.semester
          : `Semester ${data.semester}`,
    };

    if (Array.isArray(data.schedule)) {
      payload.schedule = data.schedule;
    } else if (Array.isArray(data.schedules)) {
      payload.schedule = data.schedules.map((s) => ({
        day: s.day,
        period: s.period?.periodNumber || Number(s.period?.id || 1),
        subject: s.subject,
        teacher: s.teacherId,
        room: s.room,
        startTime: s.period?.startTime,
        endTime: s.period?.endTime,
      }));
    } else {
      payload.schedule = [];
    }

    return apiPost<{ success: boolean; data: Timetable }>("/timetables", payload);
  },

  updateTimetable: async (id: string, data: Partial<CreateTimetableData>) => {
    const payload: any = {};
    if (data.class || data.grade) payload.class = data.class || data.grade;
    if (data.section !== undefined) payload.section = data.section;
    if (data.stream !== undefined) payload.stream = data.stream;
    if (data.academicYear) payload.academicYear = data.academicYear;
    if (data.semester) {
      payload.semester =
        String(data.semester).startsWith("Semester")
          ? data.semester
          : `Semester ${data.semester}`;
    }
    if (Array.isArray(data.schedule)) {
      payload.schedule = data.schedule;
    } else if (Array.isArray(data.schedules)) {
      payload.schedule = data.schedules.map((s) => ({
        day: s.day,
        period: s.period?.periodNumber || Number(s.period?.id || 1),
        subject: s.subject,
        teacher: s.teacherId,
        room: s.room,
        startTime: s.period?.startTime,
        endTime: s.period?.endTime,
      }));
    }
    return apiPut<{ success: boolean; data: Timetable }>(`/timetables/${id}`, payload);
  },

  deleteTimetable: async (id: string) => apiDelete(`/timetables/${id}`),

  generatePrecheck: async (data: {
    class: string;
    stream?: string;
    academicYear: string;
    semester: string;
  }) => apiPost<{ success: boolean; data: any }>("/timetables/generate/precheck", data),

  generateTimetable: async (data: {
    class: string;
    stream?: string;
    academicYear: string;
    semester: string;
    force?: boolean;
  }) => apiPost<{ success: boolean; data: any }>("/timetables/generate", data),

  publishTimetable: async (id: string, lock = true) =>
    apiPost<{ success: boolean; data: Timetable }>(`/timetables/${id}/publish`, { lock }),

  unpublishTimetable: async (id: string) =>
    apiPost<{ success: boolean; data: Timetable }>(`/timetables/${id}/unpublish`),

  setTimetableLock: async (id: string, isLocked: boolean) =>
    apiPost<{ success: boolean; data: Timetable }>(`/timetables/${id}/lock`, { isLocked }),

  getVersions: async (params: {
    class: string;
    stream?: string;
    academicYear: string;
    semester: string;
  }) => apiGet<{ success: boolean; data: Timetable[] }>("/timetables/versions", params),

  compareVersions: async (leftId: string, rightId: string) =>
    apiPost<{ success: boolean; data: any }>("/timetables/versions/compare", { leftId, rightId }),

  rollbackVersion: async (id: string) =>
    apiPost<{ success: boolean; data: Timetable }>(`/timetables/${id}/rollback`),

  // ============ PERIODS ============
  
  // Get all periods
  getPeriods: async () => apiGet("/timetables/periods"),
  
  // Create period
  createPeriod: async (data: Omit<Period, "id">) => 
    apiPost("/timetables/periods", data),
  
  // Update period
  updatePeriod: async (id: string, data: Partial<Period>) => 
    apiPut(`/timetables/periods/${id}`, data),
  
  // Delete period
  deletePeriod: async (id: string) => 
    apiDelete(`/timetables/periods/${id}`),

  // ============ TIME SLOTS ============
  
  // Get time slots with filters
  getTimeSlots: async (params: {
    grade?: string;
    section?: string;
    teacherId?: string;
    day?: DayOfWeek;
    semester?: string;
    academicYear?: string;
  }) => apiGet("/timetables/slots", params),

  // Create time slot
  createTimeSlot: async (data: {
    day: DayOfWeek;
    periodId: string;
    subject: string;
    teacherId: string;
    grade: string;
    section: string;
    room?: string;
    semester: string;
    academicYear: string;
  }) => apiPost("/timetables/slots", data),

  // Bulk create time slots
  bulkCreateTimeSlots: async (slots: Array<{
    day: DayOfWeek;
    periodId: string;
    subject: string;
    teacherId: string;
    grade: string;
    section: string;
    room?: string;
    semester: string;
    academicYear: string;
  }>) => apiPost("/timetables/slots/bulk", { slots }),

  // Update time slot
  updateTimeSlot: async (id: string, data: Partial<TimeSlot>) => 
    apiPut(`/timetables/slots/${id}`, data),

  // Delete time slot
  deleteTimeSlot: async (id: string) => 
    apiDelete(`/timetables/slots/${id}`),

  // ============ CLASS TIMETABLE ============
  
  // Get class timetable (organized by day and period)
  getClassTimetable: async (grade: string, section: string, semester: string, academicYear: string) =>
    apiGet(`/timetables/class/${grade}/${section}`, { semester, academicYear }),

  // Get teacher timetable
  getTeacherTimetable: async (teacherId: string, semester?: string, academicYear?: string) =>
    apiGet(`/timetables/teacher/${teacherId}`, { semester, academicYear }),

  // Get room timetable
  getRoomTimetable: async (room: string, semester?: string, academicYear?: string) =>
    apiGet(`/timetables/room/${room}`, { semester, academicYear }),

  // ============ SCHEDULES ============
  
  // Get teacher schedules
  getAllTeacherSchedules: async (semester?: string, academicYear?: string) =>
    apiGet("/timetables/teachers", { semester, academicYear }),

  // Get class schedules
  getAllClassSchedules: async (semester?: string, academicYear?: string) =>
    apiGet("/timetables/classes", { semester, academicYear }),

  // ============ VALIDATION ============
  
  // Check for conflicts
  checkConflicts: async (params: {
    timetableId?: string;
    teacherId?: string;
    room?: string;
    grade?: string;
    section?: string;
    day?: DayOfWeek;
    periodId?: string;
    semester?: string;
    academicYear?: string;
  }) => apiGet("/timetables/check-conflicts", params),

  addSchedule: async (timetableId: string, schedule: TimetableScheduleEntry) =>
    apiPost(`/timetables/${timetableId}/schedules`, { schedule }),

  getStudentTimetable: async (studentId: string, semester?: string, academicYear?: string) =>
    apiGet(`/timetables/student/${studentId}`, { semester, academicYear }),

  // ============ EXPORT ============
  
  // Export timetable
  exportTimetable: async (params: {
    grade?: string;
    section?: string;
    format?: "pdf" | "excel" | "image";
  }) => apiGet("/timetables/export", { ...params, responseType: "blob" }),

  // Generate weekly timetable PDF
  generatePDF: async (grade: string, section: string, semester: string, academicYear: string) =>
    apiGet(`/timetables/pdf/${grade}/${section}`, { semester, academicYear, responseType: "blob" }),
};

export default timetableService;
