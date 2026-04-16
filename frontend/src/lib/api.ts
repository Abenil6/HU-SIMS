import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for JWT
api.interceptors.request.use(
  (config) => {
    const directToken = localStorage.getItem('token');
    const persisted = localStorage.getItem('auth-storage');
    const storeToken = (() => {
      try {
        return persisted ? JSON.parse(persisted)?.state?.token : null;
      } catch {
        return null;
      }
    })();
    const token = directToken || storeToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      const authStore = useAuthStore.getState();
      authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  verifyEmail: (token: string, newPassword: string) =>
    api.post('/auth/verify-email', { token, newPassword }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  getProfile: () =>
    api.get('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/admin/users', { params }),

  getById: (id: string) =>
    api.get(`/admin/users/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/admin/users', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/admin/users/${id}`),

  resendVerify: (id: string) =>
    api.post(`/admin/users/${id}/resend-verify`),

  activate: (id: string) =>
    api.post(`/admin/users/${id}/activate`),

  deactivate: (id: string) =>
    api.post(`/admin/users/${id}/deactivate`),

  resetPassword: (id: string) =>
    api.post(`/admin/users/${id}/reset-password`),

  getStudentsByClass: (grade: string, section?: string) =>
    api.get('/admin/users/students-by-class', { params: { grade, section } }),
};

// Students API
export const studentsAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/students', { params }),

  getById: (id: string) =>
    api.get(`/students/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/students', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/students/${id}`, data),

  delete: (id: string) =>
    api.delete(`/students/${id}`),

  getAcademicRecords: (id: string) =>
    api.get(`/students/${id}/academic-records`),

  getAttendance: (id: string, params?: Record<string, unknown>) =>
    api.get(`/attendance/summary/student`, { params: { studentId: id, ...params } }),
};

// Teachers API
export const teachersAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/teachers', { params }),

  getById: (id: string) =>
    api.get(`/teachers/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/teachers', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/teachers/${id}`, data),

  delete: (id: string) =>
    api.delete(`/teachers/${id}`),

  getClasses: (id: string) =>
    api.get(`/teachers/${id}/classes`),

  getSchedule: (id: string) =>
    api.get(`/teachers/${id}/schedule`),
};

// Parents API
export const parentsAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/parents', { params }),

  getById: (id: string) =>
    api.get(`/parents/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/parents', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/parents/${id}`, data),

  delete: (id: string) =>
    api.delete(`/parents/${id}`),

  linkStudent: (id: string, studentId: string) =>
    api.post(`/parents/${id}/link-student`, { studentId }),

  getStudents: (id: string) =>
    api.get(`/parents/${id}/students`),
};

// Academic Records API
export const academicRecordsAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/academic-records', { params }),

  getById: (id: string) =>
    api.get(`/academic-records/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/academic-records', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/academic-records/${id}`, data),

  delete: (id: string) =>
    api.delete(`/academic-records/${id}`),

  submit: (id: string) =>
    api.post(`/academic-records/${id}/submit`),

  approve: (id: string) =>
    api.post(`/academic-records/${id}/approve`),

  reject: (id: string) =>
    api.post(`/academic-records/${id}/reject`),

  unlock: (id: string) =>
    api.post(`/academic-records/${id}/unlock`),

  lock: (id: string) =>
    api.post(`/academic-records/${id}/lock`),

  getPendingApprovals: () =>
    api.get('/academic-records/approvals/pending'),

  getStudentPerformance: (studentId: string) =>
    api.get('/academic-records/performance/student', { params: { studentId } }),

  getClassPerformance: (grade: string) =>
    api.get('/academic-records/performance/class', { params: { class: grade } }),
};

// Timetable API
export const timetableAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/timetables', { params }),

  getById: (id: string) =>
    api.get(`/timetables/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/timetables', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/timetables/${id}`, data),

  delete: (id: string) =>
    api.delete(`/timetables/${id}`),

  addPeriod: (id: string, data: Record<string, unknown>) =>
    api.post(`/timetables/${id}/periods`, data),

  removePeriod: (id: string, periodId: string) =>
    api.delete(`/timetables/${id}/periods`, { data: { periodId } }),

  getTeacherSchedule: (teacherId: string) =>
    api.get('/timetables/teacher/schedule', { params: { teacherId } }),

  getClassSchedule: (className: string) =>
    api.get('/timetables/class/schedule', { params: { class: className } }),

  checkConflicts: (data: Record<string, unknown>) =>
    api.post('/timetables/check-conflicts', data),
};

// Attendance API
export const attendanceAPI = {
  mark: (data: Record<string, unknown>) =>
    api.post('/attendance/mark', data),

  bulkMark: (data: Record<string, unknown>) =>
    api.post('/attendance/bulk', data),

  sync: (data: Record<string, unknown>) =>
    api.post('/attendance/sync', data),

  getAll: (params?: Record<string, unknown>) =>
    api.get('/attendance', { params }),

  getById: (id: string) =>
    api.get(`/attendance/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/attendance/${id}`, data),

  delete: (id: string) =>
    api.delete(`/attendance/${id}`),

  getStudentSummary: (studentId: string, params?: Record<string, unknown>) =>
    api.get('/attendance/summary/student', { params: { studentId, ...params } }),

  getClassSummary: (className: string, params?: Record<string, unknown>) =>
    api.get('/attendance/summary/class', { params: { class: className, ...params } }),

  getDailyReport: (date: string) =>
    api.get('/attendance/report/daily', { params: { date } }),
};

// Reports API
export const reportsAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/reports', { params }),

  getById: (id: string) =>
    api.get(`/reports/${id}`),

  generateTranscript: (data: Record<string, unknown>) =>
    api.post('/reports/transcript', data),

  generateClassProgress: (data: Record<string, unknown>) =>
    api.post('/reports/class-progress', data),

  generateAttendanceSummary: (data: Record<string, unknown>) =>
    api.post('/reports/attendance-summary', data),

  export: (id: string) =>
    api.get(`/reports/${id}/export`, { responseType: 'blob' }),

  officialize: (id: string) =>
    api.post(`/reports/${id}/official`),

  delete: (id: string) =>
    api.delete(`/reports/${id}`),
};

// Messages API
export const messagesAPI = {
  send: (data: Record<string, unknown>) =>
    api.post('/messages', data),

  sendBulk: (data: Record<string, unknown>) =>
    api.post('/messages/broadcast', data),

  getInbox: (params?: Record<string, unknown>) =>
    api.get('/messages', { params }),

  getSent: (params?: Record<string, unknown>) =>
    api.get('/messages/sent', { params }),

  getById: (id: string) =>
    api.get(`/messages/${id}`),

  markAsRead: (id: string) =>
    api.put(`/messages/${id}/read`),

  delete: (id: string) =>
    api.delete(`/messages/${id}`),
};

// Certificates API
export const certificatesAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/certificates', { params }),

  getById: (id: string) =>
    api.get(`/certificates/${id}`),

  generate: (data: Record<string, unknown>) =>
    api.post('/certificates/generate', data),

  verify: (certificateNumber: string) =>
    api.get(`/certificates/verify/${certificateNumber}`),

  delete: (id: string) =>
    api.delete(`/certificates/${id}`),
};

// Announcements API
export const announcementsAPI = {
  getMyAnnouncements: (params?: Record<string, unknown>) =>
    api.get('/announcements', { params }),

  getAll: (params?: Record<string, unknown>) =>
    api.get('/announcements/admin', { params }),

  create: (data: Record<string, unknown>) =>
    api.post('/announcements/admin', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/announcements/admin/${id}`, data),

  delete: (id: string) =>
    api.delete(`/announcements/admin/${id}`),

  togglePublish: (id: string) =>
    api.post(`/announcements/admin/${id}/toggle-publish`),

  getDashboardStats: () =>
    api.get('/announcements/dashboard/stats'),

  getRecentActivity: () =>
    api.get('/announcements/dashboard/activity'),
};
