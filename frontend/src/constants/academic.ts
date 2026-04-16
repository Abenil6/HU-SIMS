/**
 * Academic Constants
 * Based on Ethiopian school system requirements
 */

// Grade levels (9-12 only, no sections)
export const GRADES = ['9', '10', '11', '12'] as const;
export type Grade = typeof GRADES[number];

// Academic streams for Grade 11-12
export const STREAMS = {
  NATURAL: 'Natural Science',
  SOCIAL: 'Social Science',
} as const;
export type Stream = typeof STREAMS[keyof typeof STREAMS];

// Subjects by grade level
export const SUBJECTS = {
  // Grade 9-10 (Common subjects)
  GRADE_9_10: [
    'Mathematics',
    'English',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Civics',
    'Amharic',
    'Physical Education',
  ],
  
  // Grade 11-12 Natural Science Stream
  NATURAL_SCIENCE: [
    'Mathematics',
    'English',
    'Physics',
    'Chemistry',
    'Biology',
    'Amharic',
    'Physical Education',
  ],
  
  // Grade 11-12 Social Science Stream
  SOCIAL_SCIENCE: [
    'Mathematics',
    'English',
    'History',
    'Geography',
    'Economics',
    'Civics',
    'Amharic',
    'Physical Education',
  ],
} as const;

// Get subjects for a specific grade and stream
export const getSubjectsForGrade = (grade: string, stream?: string): string[] => {
  if (grade === '9' || grade === '10') {
    return [...SUBJECTS.GRADE_9_10];
  }
  
  if (grade === '11' || grade === '12') {
    if (stream === STREAMS.NATURAL) {
      return [...SUBJECTS.NATURAL_SCIENCE];
    }
    if (stream === STREAMS.SOCIAL) {
      return [...SUBJECTS.SOCIAL_SCIENCE];
    }
    // Default to natural science if no stream specified
    return [...SUBJECTS.NATURAL_SCIENCE];
  }
  
  return [];
};

// Academic year (Ethiopian context: September to June)
export const ACADEMIC_YEAR = {
  START_MONTH: 9, // September
  END_MONTH: 6,   // June
} as const;

// Semesters
export const SEMESTERS = ['Semester 1', 'Semester 2'] as const;
export type Semester = typeof SEMESTERS[number];

// Grading system (out of 100)
export const GRADING_COMPONENTS = {
  MID_EXAM: { max: 20, label: 'Mid Exam' },
  FINAL_EXAM: { max: 40, label: 'Final Exam' },
  CLASS_QUIZ: { max: 10, label: 'Class Quiz' },
  CONTINUOUS_ASSESSMENT: { max: 10, label: 'Continuous Assessment' },
  ASSIGNMENT: { max: 20, label: 'Assignment' },
} as const;

export const TOTAL_MARKS = 100;

// Attendance statuses
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
} as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

// School schedule
export const SCHOOL_SCHEDULE = {
  PERIODS_PER_DAY: 7,
  PERIOD_DURATION: 45, // minutes
  TEA_BREAK_AFTER_PERIOD: 3,
  TEA_BREAK_DURATION: 15, // minutes
  LUNCH_BREAK_AFTER_PERIOD: 5,
  LUNCH_BREAK_DURATION: 90, // minutes (1.5 hours)
  SCHOOL_DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
} as const;

// Period times (calculated based on 8:00 AM start)
export const PERIOD_TIMES = [
  { period: 1, start: '08:00', end: '08:45' },
  { period: 2, start: '08:45', end: '09:30' },
  { period: 3, start: '09:30', end: '10:15' },
  { break: 'Tea Break', start: '10:15', end: '10:30' },
  { period: 4, start: '10:30', end: '11:15' },
  { period: 5, start: '11:15', end: '12:00' },
  { break: 'Lunch Break', start: '12:00', end: '13:30' },
  { period: 6, start: '13:30', end: '14:15' },
  { period: 7, start: '14:15', end: '15:00' },
] as const;

// Grade approval workflow statuses
export const GRADE_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;
export type GradeStatus = typeof GRADE_STATUS[keyof typeof GRADE_STATUS];

// Certificate types
export const CERTIFICATE_TYPES = {
  COMPLETION: 'Completion',
  TRANSFER: 'Transfer',
} as const;
export type CertificateType = typeof CERTIFICATE_TYPES[keyof typeof CERTIFICATE_TYPES];

// User roles
export const USER_ROLES = {
  SYSTEM_ADMIN: 'SystemAdmin',
  SCHOOL_ADMIN: 'SchoolAdmin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
} as const;
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Messaging rules (who can message whom)
export const MESSAGING_RULES = {
  [USER_ROLES.TEACHER]: [USER_ROLES.STUDENT, USER_ROLES.PARENT],
  [USER_ROLES.PARENT]: [USER_ROLES.TEACHER],
  [USER_ROLES.SCHOOL_ADMIN]: [
    USER_ROLES.TEACHER,
    USER_ROLES.STUDENT,
    USER_ROLES.PARENT,
    USER_ROLES.SYSTEM_ADMIN,
  ],
  [USER_ROLES.SYSTEM_ADMIN]: [USER_ROLES.SCHOOL_ADMIN],
  [USER_ROLES.STUDENT]: [], // Students cannot send messages
} as const;

// Can user send message to role?
export const canSendMessageTo = (fromRole: UserRole, toRole: UserRole): boolean => {
  const allowedRoles = MESSAGING_RULES[fromRole] || [];
  return (allowedRoles as readonly UserRole[]).includes(toRole);
};

// Announcement target options
export const ANNOUNCEMENT_TARGETS = {
  ALL: 'All',
  TEACHERS: 'Teachers',
  STUDENTS: 'Students',
  PARENTS: 'Parents',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
  GRADE_12: 'Grade 12',
} as const;
export type AnnouncementTarget = typeof ANNOUNCEMENT_TARGETS[keyof typeof ANNOUNCEMENT_TARGETS];
