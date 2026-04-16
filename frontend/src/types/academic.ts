/**
 * Academic Type Definitions
 */

import type { Grade, Semester, Stream, GradeStatus, AttendanceStatus } from '@/constants/academic';

// Academic Record with marks breakdown
export interface AcademicRecord {
  _id: string;
  student: string | Student;
  teacher: string | Teacher;
  subject: string;
  marks: {
    midExam: number;        // out of 20
    finalExam: number;      // out of 40
    classQuiz: number;      // out of 10
    continuousAssessment: number; // out of 10
    assignment: number;     // out of 20
  };
  totalMarks: number;       // calculated, out of 100
  status: GradeStatus;
  isLocked: boolean;
  academicYear: string;
  semester: Semester;
  comments?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  honorRoll: boolean;
  honorRollType?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Student with grade and optional stream
export interface Student {
  _id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'Student';
  grade: Grade;
  stream?: Stream; // Only for Grade 11-12
  rollNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Teacher
export interface Teacher {
  _id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'Teacher';
  subject: string;
  qualification?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Parent
export interface Parent {
  _id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'Parent';
  occupation?: string;
  phone?: string;
  relationship?: string;
  status: 'Active' | 'Inactive';
  children: string[]; // Array of student IDs
  createdAt: Date;
  updatedAt: Date;
}

// Attendance record
export interface AttendanceRecord {
  _id: string;
  student: string | Student;
  teacher: string | Teacher;
  date: string;
  status: AttendanceStatus;
  period?: number;
  subject?: string;
  remarks?: string;
  offlineId?: string; // For offline sync
  createdAt: Date;
  updatedAt: Date;
}

// Timetable entry
export interface TimetableEntry {
  _id: string;
  grade: Grade;
  stream?: Stream;
  day: string;
  period: number;
  subject: string;
  teacher: string | Teacher;
  startTime: string;
  endTime: string;
  room?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Exam schedule
export interface ExamSchedule {
  _id: string;
  subject: string;
  grade: Grade;
  stream?: Stream;
  examType: 'Midterm' | 'Final';
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Certificate
export interface Certificate {
  _id: string;
  student: string | Student;
  type: 'Completion' | 'Transfer';
  certificateNumber: string;
  issueDate: string;
  status: 'Draft' | 'Issued' | 'Cancelled';
  remarks?: string;
  issuedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message
export interface Message {
  _id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  readStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Announcement
export interface Announcement {
  _id: string;
  title: string;
  content: string;
  targetRoles: string[];
  targetGrades?: Grade[];
  priority: 'Low' | 'Normal' | 'High';
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Academic Year
export interface AcademicYear {
  _id: string;
  year: string; // e.g., "2025-2026"
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Report Card
export interface ReportCard {
  student: Student;
  academicYear: string;
  semester: Semester;
  grades: AcademicRecord[];
  averageMarks: number;
  classRank: number;
  totalStudents: number;
  attendanceRate: number;
  honorRoll: boolean;
  honorRollType?: string;
}

// Student Performance Summary
export interface StudentPerformance {
  studentId: string;
  academicYear: string;
  totalRecords: number;
  approvedRecords: number;
  averageMarks: number;
  classRank?: number;
  marksBySubject: {
    [subject: string]: {
      total: number;
      count: number;
      average: number;
    };
  };
  semesterData: {
    [semester: string]: {
      total: number;
      count: number;
      average?: number;
    };
  };
}

// Class Performance Summary
export interface ClassPerformance {
  grade: Grade;
  stream?: Stream;
  academicYear: string;
  semester: Semester;
  totalStudents: number;
  averageMarks: number;
  rankings: {
    studentId: string;
    studentName: string;
    averageMarks: number;
    rank: number;
  }[];
}

// Absence Alert
export interface AbsenceAlert {
  _id: string;
  student: string | Student;
  parent: string | Parent;
  date: string;
  reason: string;
  status: 'Pending' | 'Acknowledged' | 'Resolved';
  notificationSent: boolean;
  parentResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalParents?: number;
  attendanceRate?: number;
  pendingApprovals?: number;
  pendingAlerts?: number;
  averageGrade?: number;
}

// Form data types
export interface StudentFormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
  grade: Grade;
  stream?: Stream;
  rollNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  parentId?: string;
}

export interface TeacherFormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
  subject: string;
  qualification?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
}

export interface ParentFormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
  occupation?: string;
  phone?: string;
  relationship?: string;
  children?: string[];
}

export interface AcademicRecordFormData {
  student: string;
  teacher: string;
  subject: string;
  academicYear: string;
  semester: Semester;
  marks: {
    midExam: number;
    finalExam: number;
    classQuiz: number;
    continuousAssessment: number;
    assignment: number;
  };
  comments?: string;
}

export interface AttendanceFormData {
  student: string;
  teacher: string;
  date: string;
  status: AttendanceStatus;
  period?: number;
  subject?: string;
  remarks?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
