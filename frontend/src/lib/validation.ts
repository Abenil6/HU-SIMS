import { z } from "zod";

// ==================== COMMON VALIDATORS ====================

// Letters only (including spaces and hyphens for names)
const lettersOnlySchema = z
  .string()
  .min(2, "Must be at least 2 characters")
  .max(100, "Must be at most 100 characters")
  .regex(/^[a-zA-Z\s\-']+$/, "Must contain only letters, spaces, hyphens, and apostrophes");

// Numbers only (for phone numbers)
const numbersOnlySchema = z
  .string()
  .min(10, "Must be at least 10 digits")
  .max(15, "Must be at most 15 digits")
  .regex(/^\+?[\d\s\-()]+$/, "Must contain only numbers, spaces, hyphens, parentheses, and optional + prefix");

// Numbers only (optional)
const numbersOnlyOptionalSchema = z
  .union([
    z.literal(""),
    z.string()
      .min(10, "Must be at least 10 digits")
      .max(15, "Must be at most 15 digits")
      .regex(/^\+?[\d\s\-()]+$/, "Must contain only numbers, spaces, hyphens, parentheses, and optional + prefix"),
  ])
  .optional();

// Email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(120, "Email must be at most 120 characters")
  .email("Invalid email address");

// Phone validation (optional)
const phoneOptionalSchema = z
  .union([
    z.literal(""),
    z.string()
      .min(10, "Phone must be at least 10 digits")
      .max(30, "Phone must be at most 30 characters")
      .regex(/^\+?[\d\s\-()]+$/, "Must contain only numbers, spaces, hyphens, parentheses, and optional + prefix"),
  ])
  .optional();

// Password validation
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(256, "Password must be at most 256 characters");

// ==================== AUTH SCHEMAS ====================

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(256, "Password must be at most 256 characters"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const twoFactorSchema = z.object({
  challengeToken: z.string().min(8, "Invalid challenge token").max(2000, "Invalid challenge token"),
  code: z.string().min(4, "Code must be at least 4 characters").max(10, "Code must be at most 10 characters"),
});

// ==================== USER SCHEMAS ====================

export const createUserSchema = z.object({
  firstName: lettersOnlySchema,
  lastName: lettersOnlySchema,
  email: emailSchema,
  phone: phoneOptionalSchema,
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  role: z.enum(["SystemAdmin", "SchoolAdmin", "Teacher", "Student", "Parent"]),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(80, "Username must be at most 80 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, hyphens, and underscores"),
});

// System Admin Dashboard User Creation Schema (without username, with grade/stream/status)
export const systemAdminCreateUserSchema = z.object({
  firstName: lettersOnlySchema,
  lastName: lettersOnlySchema,
  email: emailSchema,
  phone: phoneOptionalSchema,
  role: z.enum(["SystemAdmin", "SchoolAdmin", "Teacher", "Student", "Parent"]),
  grade: z.string().optional(),
  stream: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((data) => {
  // If role is Student and grade is 11 or 12, stream is required
  if (data.role === "Student") {
    const grade = String(data.grade || "");
    if ((grade === "11" || grade === "12") && !data.stream) {
      return false;
    }
    if (grade !== "11" && grade !== "12" && data.stream) {
      return false;
    }
  }
  return true;
}, {
  message: "Stream is required for Grade 11 and Grade 12 students",
  path: ["stream"],
});

// System Admin Dashboard User Update Schema (create separate schema to avoid .partial() with refinements)
export const systemAdminUpdateUserSchema = z.object({
  firstName: lettersOnlySchema.optional(),
  lastName: lettersOnlySchema.optional(),
  email: emailSchema.optional(),
  phone: phoneOptionalSchema,
  role: z.enum(["SystemAdmin", "SchoolAdmin", "Teacher", "Student", "Parent"]).optional(),
  grade: z.string().optional(),
  stream: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((data) => {
  // If role is Student and grade is 11 or 12, stream is required
  if (data.role === "Student") {
    const grade = String(data.grade || "");
    if ((grade === "11" || grade === "12") && !data.stream) {
      return false;
    }
    if (grade !== "11" && grade !== "12" && data.stream) {
      return false;
    }
  }
  return true;
}, {
  message: "Stream is required for Grade 11 and Grade 12 students",
  path: ["stream"],
});

// School Admin Dashboard Student Creation Schema
export const schoolAdminCreateStudentSchema = z.object({
  firstName: lettersOnlySchema,
  lastName: lettersOnlySchema,
  email: emailSchema,
  phone: phoneOptionalSchema,
  gender: z.enum(["Male", "Female"]),
  dob: z.string().min(1, "Date of birth is required"),
  grade: z.string().min(1, "Grade is required"),
  stream: z.string().optional(),
  enrollmentDate: z.string().min(1, "Enrollment date is required"),
}).refine((data) => {
  const grade = String(data.grade);
  const stream = String(data.stream || "");
  if ((grade === "11" || grade === "12") && !stream) {
    return false;
  }
  if (grade !== "11" && grade !== "12" && stream) {
    return false;
  }
  return true;
}, {
  message: "Stream must be provided only for Grade 11 and Grade 12",
  path: ["stream"],
});

// School Admin Dashboard Student Update Schema
export const schoolAdminUpdateStudentSchema = z.object({
  firstName: lettersOnlySchema.optional(),
  lastName: lettersOnlySchema.optional(),
  email: emailSchema.optional(),
  phone: phoneOptionalSchema,
  gender: z.enum(["Male", "Female"]).optional(),
  dob: z.string().optional(),
  grade: z.string().optional(),
  stream: z.string().optional(),
  enrollmentDate: z.string().optional(),
}).refine((data) => {
  const grade = String(data.grade || "");
  const stream = String(data.stream || "");
  if ((grade === "11" || grade === "12") && !stream) {
    return false;
  }
  if (grade !== "11" && grade !== "12" && stream) {
    return false;
  }
  return true;
}, {
  message: "Stream must be provided only for Grade 11 and Grade 12",
  path: ["stream"],
});

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(["active", "inactive", "pending", "Active", "Inactive", "Pending"]).optional(),
});

export const profileUpdateSchema = z.object({
  firstName: lettersOnlySchema.optional(),
  lastName: lettersOnlySchema.optional(),
  email: emailSchema.optional(),
  phone: phoneOptionalSchema,
  profileImage: z.string().max(5000, "Profile image URL too long").optional(),
});

// ==================== TEACHER SCHEMAS ====================

export const createTeacherSchema = z.object({
  firstName: lettersOnlySchema,
  lastName: lettersOnlySchema,
  email: emailSchema,
  phone: phoneOptionalSchema,
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  qualification: z
    .string()
    .min(2, "Qualification must be at least 2 characters")
    .max(200, "Qualification must be at most 200 characters"),
  specialization: z.string().max(120, "Specialization must be at most 120 characters").optional(),
  subjects: z.array(z.string()).max(50, "Cannot have more than 50 subjects").optional(),
  classes: z.array(z.object({
    grade: z.string().min(1, "Grade is required"),
    section: z.string().optional(),
    stream: z.string().optional(),
  })).max(50, "Cannot have more than 50 classes").optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial().extend({
  status: z.string().optional(),
});

// ==================== STUDENT SCHEMAS ====================

export const studentPersonalInfoSchema = z.object({
  firstName: lettersOnlySchema,
  fatherName: lettersOnlySchema,
  grandfatherName: lettersOnlySchema,
  gender: z.enum(["Male", "Female"]),
  dob: z.string().min(1, "Date of birth is required"),
  placeOfBirthWoreda: z.string().optional(),
  placeOfBirthZone: z.string().optional(),
  placeOfBirthRegion: z.string().optional(),
  nationality: z.string().optional(),
});

export const studentContactInfoSchema = z.object({
  phone: phoneOptionalSchema,
  email: emailSchema.optional().or(z.literal("")),
  addressRegion: z.string().optional(),
  addressCity: z.string().optional(),
  addressSubCity: z.string().optional(),
  addressHouseNumber: z.string().optional(),
}).refine((data) => {
  // At least one contact method must be provided
  return !!(data.phone && data.phone !== "") || !!(data.email && data.email !== "");
}, {
  message: "At least one contact method (phone or email) is required",
  path: ["phone"],
});

export const studentGuardianSchema = z.object({
  primaryGuardianName: lettersOnlySchema,
  primaryGuardianRelationship: z.string().min(1, "Relationship is required"),
  primaryGuardianPhone: numbersOnlySchema,
  primaryGuardianEmail: emailSchema.optional().or(z.literal("")),
  primaryGuardianOccupation: z.string().optional(),
  primaryGuardianAddress: z.string().optional(),
  secondaryGuardianName: lettersOnlySchema.optional().or(z.literal("")),
  secondaryGuardianRelationship: z.string().optional(),
  secondaryGuardianPhone: numbersOnlyOptionalSchema,
  secondaryGuardianEmail: emailSchema.optional().or(z.literal("")),
  secondaryGuardianOccupation: z.string().optional(),
  secondaryGuardianAddress: z.string().optional(),
});

export const studentAcademicInfoSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  stream: z.string().optional(),
  previousSchoolName: z.string().optional(),
  previousGradeCompleted: z.string().optional(),
  entranceExamResult: z.string().optional(),
});

export const studentEnrollmentSchema = z.object({
  admissionDate: z.string().min(1, "Admission date is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  enrollmentType: z.enum(["New Admission", "Transfer Student"]).optional(),
});

// ==================== CLASS SCHEMAS ====================

export const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100, "Class name must be at most 100 characters"),
  grade: z.string().min(1, "Grade is required"),
  stream: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1").max(100, "Capacity must be at most 100"),
  classTeacher: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
});

export const updateClassSchema = createClassSchema.partial();

// ==================== MESSAGE SCHEMAS ====================

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be at most 200 characters"),
  content: z.string().min(1, "Message content is required").max(5000, "Message must be at most 5000 characters"),
  category: z.string().optional(),
});

export const replyMessageSchema = z.object({
  content: z.string().min(1, "Reply content is required").max(5000, "Reply must be at most 5000 characters"),
});

// ==================== ACADEMIC RECORD SCHEMAS ====================

export const addGradeSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  subject: z.string().min(1, "Subject is required").max(120, "Subject must be at most 120 characters"),
  grade: z.number().min(0, "Grade must be at least 0").max(100, "Grade must be at most 100"),
  assessmentType: z.string().max(50, "Assessment type must be at most 50 characters").optional(),
  comments: z.string().max(2000, "Comments must be at most 2000 characters").optional(),
});

export const bulkAddGradesSchema = z.object({
  grades: z.array(addGradeSchema).min(1, "At least one grade is required").max(500, "Cannot add more than 500 grades at once"),
});

// ==================== ATTENDANCE SCHEMAS ====================

export const markAttendanceSchema = z.object({
  class: z.string().max(120, "Class name must be at most 120 characters").optional(),
  date: z.string().optional(),
  records: z.array(z.object({
    studentId: z.string().min(1, "Student ID is required"),
    status: z.enum(["Present", "Absent", "Late", "Excused"]),
  })).min(1, "At least one attendance record is required").max(500, "Cannot mark more than 500 records at once"),
});

// ==================== ANNOUNCEMENT SCHEMAS ====================

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  content: z.string().min(1, "Content is required").max(5000, "Content must be at most 5000 characters"),
  targetAudience: z.array(z.string()).optional(),
  priority: z.enum(["Low", "Medium", "High"]).optional(),
  expiryDate: z.string().optional(),
});

// ==================== PARENT SCHEMAS ====================

export const createParentSchema = z.object({
  firstName: lettersOnlySchema,
  lastName: lettersOnlySchema,
  email: emailSchema,
  phone: phoneOptionalSchema,
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  relationship: z.string().min(1, "Relationship is required"),
  occupation: z.string().max(120, "Occupation must be at most 120 characters").optional(),
  workplace: z.string().max(120, "Workplace must be at most 120 characters").optional(),
});

export const updateParentSchema = createParentSchema.partial();

// ==================== STUDENT LIST EDIT SCHEMA ====================

export const studentListEditSchema = z.object({
  firstName: lettersOnlySchema,
  lastName: lettersOnlySchema,
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneOptionalSchema,
  gender: z.enum(["Male", "Female", "Other"]),
  dob: z.string().min(1, "Date of birth is required"),
  grade: z.string().min(1, "Grade is required"),
  stream: z.string().optional(),
  section: z.string().optional(),
  academicYear: z.string().optional(),
  admissionDate: z.string().min(1, "Admission date is required"),
  enrollmentType: z.enum(["New Admission", "Transfer Student"]).optional(),
  placeOfBirthWoreda: z.string().optional(),
  placeOfBirthZone: z.string().optional(),
  placeOfBirthRegion: z.string().optional(),
  nationality: z.string().optional(),
  addressRegion: z.string().optional(),
  addressCity: z.string().optional(),
  addressSubCity: z.string().optional(),
  addressHouseNumber: z.string().optional(),
  primaryGuardianName: lettersOnlySchema,
  primaryGuardianRelationship: z.string().min(1, "Relationship is required"),
  primaryGuardianPhone: numbersOnlySchema,
  primaryGuardianEmail: emailSchema.optional().or(z.literal("")),
  primaryGuardianOccupation: z.string().optional(),
  primaryGuardianAddress: z.string().optional(),
}).refine((data) => {
  const grade = String(data.grade);
  const stream = String(data.stream || "");
  if ((grade === "11" || grade === "12") && !stream) {
    return false;
  }
  if (grade !== "11" && grade !== "12" && stream) {
    return false;
  }
  return true;
}, {
  message: "Stream must be provided only for Grade 11 and Grade 12",
  path: ["stream"],
});

// ==================== REPORT SCHEMAS ====================

// Report Card Generation Schema
export const reportCardGenerationSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  semester: z.enum(["1", "2"], { message: "Semester is required" }),
  academicYear: z.string().min(1, "Academic year is required"),
  behaviorGrade: z.enum(["A", "B", "C"], { message: "Behavior grade is required" }),
});

// Student Transcript Generation Schema
export const studentTranscriptGenerationSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
});

// Class Statistics/Performance Generation Schema
export const classReportGenerationSchema = z.object({
  grade: z.enum(["9", "10", "11", "12"], { message: "Grade is required" }),
  semester: z.enum(["1", "2"], { message: "Semester is required" }),
  academicYear: z.string().min(1, "Academic year is required"),
});

// Attendance Summary Generation Schema
export const attendanceSummaryGenerationSchema = z.object({
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Valid month is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  reportScope: z.enum(["class", "student"], { message: "Report scope is required" }),
  grade: z.enum(["9", "10", "11", "12"]).optional(),
  studentId: z.string().optional(),
}).refine((data) => {
  if (data.reportScope === "student" && !data.studentId) {
    return false;
  }
  if (data.reportScope === "class" && !data.grade) {
    return false;
  }
  return true;
}, {
  message: "Student is required for individual reports, grade is required for class reports",
});

// ==================== TYPE EXPORTS ====================

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type SystemAdminCreateUserData = z.infer<typeof systemAdminCreateUserSchema>;
export type SystemAdminUpdateUserData = z.infer<typeof systemAdminUpdateUserSchema>;
export type SchoolAdminCreateStudentData = z.infer<typeof schoolAdminCreateStudentSchema>;
export type SchoolAdminUpdateStudentData = z.infer<typeof schoolAdminUpdateStudentSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type CreateTeacherData = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherData = z.infer<typeof updateTeacherSchema>;
export type StudentPersonalInfoData = z.infer<typeof studentPersonalInfoSchema>;
export type StudentContactInfoData = z.infer<typeof studentContactInfoSchema>;
export type StudentGuardianData = z.infer<typeof studentGuardianSchema>;
export type StudentAcademicInfoData = z.infer<typeof studentAcademicInfoSchema>;
export type StudentEnrollmentData = z.infer<typeof studentEnrollmentSchema>;
export type CreateClassData = z.infer<typeof createClassSchema>;
export type UpdateClassData = z.infer<typeof updateClassSchema>;
export type SendMessageData = z.infer<typeof sendMessageSchema>;
export type ReplyMessageData = z.infer<typeof replyMessageSchema>;
export type AddGradeData = z.infer<typeof addGradeSchema>;
export type BulkAddGradesData = z.infer<typeof bulkAddGradesSchema>;
export type MarkAttendanceData = z.infer<typeof markAttendanceSchema>;
export type CreateAnnouncementData = z.infer<typeof createAnnouncementSchema>;
export type CreateParentData = z.infer<typeof createParentSchema>;
export type UpdateParentData = z.infer<typeof updateParentSchema>;
export type StudentListEditData = z.infer<typeof studentListEditSchema>;
export type ReportCardGenerationData = z.infer<typeof reportCardGenerationSchema>;
export type StudentTranscriptGenerationData = z.infer<typeof studentTranscriptGenerationSchema>;
export type ClassReportGenerationData = z.infer<typeof classReportGenerationSchema>;
export type AttendanceSummaryGenerationData = z.infer<typeof attendanceSummaryGenerationSchema>;