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

// Email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(120, "Email must be at most 120 characters")
  .email("Invalid email address");

// Phone validation (optional)
const phoneOptionalSchema = z
  .string()
  .max(30, "Phone must be at most 30 characters")
  .regex(/^\+?[\d\s\-()]*$/, "Must contain only numbers, spaces, hyphens, parentheses, and optional + prefix")
  .optional()
  .or(z.literal(""));

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
  secondaryGuardianPhone: numbersOnlySchema.optional().or(z.literal("")),
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

// ==================== TYPE EXPORTS ====================

export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
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