/**
 * Query Keys for TanStack Query
 * 
 * Centralized query key definitions to ensure consistency
 * across the application and avoid typos.
 */

export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'],
  },
  
  // Users
  users: {
    all: ['users'],
    lists: () => [...queryKeys.users.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.users.lists(), filters],
    details: () => [...queryKeys.users.all, 'detail'],
    detail: (id: string) => [...queryKeys.users.details(), id],
  },
  
  // Students
  students: {
    all: ['students'],
    lists: () => [...queryKeys.students.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.students.lists(), filters],
    details: () => [...queryKeys.students.all, 'detail'],
    detail: (id: string) => [...queryKeys.students.details(), id],
  },
  
  // Teachers
  teachers: {
    all: ['teachers'],
    lists: () => [...queryKeys.teachers.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.teachers.lists(), filters],
    details: () => [...queryKeys.teachers.all, 'detail'],
    detail: (id: string) => [...queryKeys.teachers.details(), id],
  },
  
  // Parents
  parents: {
    all: ['parents'],
    lists: () => [...queryKeys.parents.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.parents.lists(), filters],
    details: () => [...queryKeys.parents.all, 'detail'],
    detail: (id: string) => [...queryKeys.parents.details(), id],
  },
  
  // Academic Records
  academicRecords: {
    all: ['academicRecords'],
    lists: () => [...queryKeys.academicRecords.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.academicRecords.lists(), filters],
    details: () => [...queryKeys.academicRecords.all, 'detail'],
    detail: (id: string) => [...queryKeys.academicRecords.details(), id],
    byStudent: (studentId: string) => [...queryKeys.academicRecords.all, 'student', studentId],
  },
  
  // Attendance
  attendance: {
    all: ['attendance'],
    lists: () => [...queryKeys.attendance.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.attendance.lists(), filters],
    details: () => [...queryKeys.attendance.all, 'detail'],
    detail: (id: string) => [...queryKeys.attendance.details(), id],
    byStudent: (studentId: string) => [...queryKeys.attendance.all, 'student', studentId],
    byClass: (classId: string) => [...queryKeys.attendance.all, 'class', classId],
  },
  
  // Timetable
  timetables: {
    all: ['timetables'],
    lists: () => [...queryKeys.timetables.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.timetables.lists(), filters],
    details: () => [...queryKeys.timetables.all, 'detail'],
    detail: (id: string) => [...queryKeys.timetables.details(), id],
    byClass: (classId: string) => [...queryKeys.timetables.all, 'class', classId],
    byTeacher: (teacherId: string) => [...queryKeys.timetables.all, 'teacher', teacherId],
    byStudent: (studentId: string) => [...queryKeys.timetables.all, 'student', studentId],
  },
  
  // Messages
  messages: {
    all: ['messages'],
    scope: (userId?: string) => [...queryKeys.messages.all, userId || 'anonymous'],
    lists: () => [...queryKeys.messages.all, 'list'],
    list: (userId: string | undefined, filters: Record<string, unknown>) => [
      ...queryKeys.messages.scope(userId),
      'list',
      filters,
    ],
    details: (userId?: string) => [...queryKeys.messages.scope(userId), 'detail'],
    detail: (userId: string | undefined, id: string) => [
      ...queryKeys.messages.details(userId),
      id,
    ],
    inbox: (userId?: string) => [...queryKeys.messages.scope(userId), 'inbox'],
    sent: (userId?: string) => [...queryKeys.messages.scope(userId), 'sent'],
    drafts: (userId?: string) => [...queryKeys.messages.scope(userId), 'drafts'],
    recipients: (userId?: string) => [...queryKeys.messages.scope(userId), 'recipients'],
  },
  
  // Announcements
  announcements: {
    all: ['announcements'],
    lists: () => [...queryKeys.announcements.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.announcements.lists(), filters],
    details: () => [...queryKeys.announcements.all, 'detail'],
    detail: (id: string) => [...queryKeys.announcements.details(), id],
    active: () => [...queryKeys.announcements.all, 'active'],
  },
  
  // Certificates
  certificates: {
    all: ['certificates'],
    lists: () => [...queryKeys.certificates.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.certificates.lists(), filters],
    details: () => [...queryKeys.certificates.all, 'detail'],
    detail: (id: string) => [...queryKeys.certificates.details(), id],
    byStudent: (studentId: string) => [...queryKeys.certificates.all, 'student', studentId],
  },
  
  // Reports
  reports: {
    all: ['reports'],
    lists: () => [...queryKeys.reports.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.reports.lists(), filters],
    details: () => [...queryKeys.reports.all, 'detail'],
    detail: (id: string) => [...queryKeys.reports.details(), id],
    byStudent: (studentId: string) => [...queryKeys.reports.all, 'student', studentId],
  },
  
  // Classes
  classes: {
    all: ['classes'],
    lists: () => [...queryKeys.classes.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.classes.lists(), filters],
    details: () => [...queryKeys.classes.all, 'detail'],
    detail: (id: string) => [...queryKeys.classes.details(), id],
  },
  
  // Dashboard Stats
  dashboard: {
    all: ['dashboard'],
    stats: (role: string) => [...queryKeys.dashboard.all, 'stats', role],
  },

  // Exam Schedules
  examSchedules: {
    all: ['examSchedules'],
    lists: () => [...queryKeys.examSchedules.all, 'list'],
    list: (filters: Record<string, unknown>) => [...queryKeys.examSchedules.lists(), filters],
    details: () => [...queryKeys.examSchedules.all, 'detail'],
    detail: (id: string) => [...queryKeys.examSchedules.details(), id],
    byStudent: (studentId: string) => [...queryKeys.examSchedules.all, 'student', studentId],
  },
};
