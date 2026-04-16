/**
 * Custom Hooks Barrel Export
 * 
 * Central export for all custom hooks
 */

// API Mutation helpers
export { useMutationWithToast, useQueryWithErrorHandling } from './useApiMutation';

// Students
export {
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useBulkDeleteStudents,
  useLinkParent,
  useUnlinkParent,
  useBulkUploadStudents,
  useTransferStudent,
  useGraduateStudent,
} from './students/useStudents';

// Users
export {
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useBulkDeleteUsers,
  useUpdateUserStatus,
  useUploadAvatar,
  useTeachers,
  useParents,
  useStudentsList,
} from './users/useUsers';

// Teachers
export {
  useTeachers as useTeacherList,
  useTeacher,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
  useUpdateTeacherSubjects,
  useUpdateTeacherClasses,
} from './teachers/useTeachers';

// Parents
export {
  useParents as useParentList,
  useParent,
  useCreateParent,
  useUpdateParent,
  useDeleteParent,
  useLinkStudent,
  useUnlinkStudent,
  useParentChildren,
} from './parents/useParents';

// Attendance
export {
  useAttendance,
  useAttendanceRecord,
  useRecordAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
  useBulkRecordAttendance,
  useStudentAttendanceSummary,
  useClassAttendanceSummary,
} from './attendance/useAttendance';

// Academic Records
export {
  useAcademicRecords,
  useAcademicRecord,
  useStudentAcademicRecords,
  useCreateGrade,
  useUpdateAcademicRecord,
  useDeleteAcademicRecord,
  useStudentGPA,
  useStudentCGPA,
  useStudentTranscript,
  useHonorRollStudents,
} from './academic/useAcademicRecords';

// Timetable
export {
  useTimetables,
  useTimetable,
  useClassTimetable,
  useTeacherTimetable,
  useStudentTimetable,
  useCreateTimetable,
  useUpdateTimetable,
  useDeleteTimetable,
  useAddSchedule,
  useCheckTimetableConflicts,
} from './timetable/useTimetable';

// Messages
export {
  useMessages,
  useMessage,
  useInbox,
  useSentMessages,
  useDrafts,
  useSendMessage,
  useDeleteMessage,
  useMarkAsRead,
  useSendBulkMessage,
} from './messages/useMessages';

// Announcements
export {
  useAnnouncements,
  useActiveAnnouncements,
  useAnnouncement,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useMarkAnnouncementRead,
} from './announcements/useAnnouncements';

// Certificates
export {
  useCertificates,
  useCertificate,
  useStudentCertificates,
  useGenerateCertificate,
  useDownloadCertificate,
  useVerifyCertificate,
  useCreateCertificate,
  useUpdateCertificate,
  useDeleteCertificate,
} from './certificates/useCertificates';
