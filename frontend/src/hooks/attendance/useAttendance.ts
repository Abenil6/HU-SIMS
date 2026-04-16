import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService, type AttendanceRecord } from '@/services/attendanceService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch attendance records with filters
 */
export function useAttendance(params?: {
  grade?: string;
  section?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.attendance.list(params || {}),
    queryFn: () => attendanceService.getAttendance(params || {}),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single attendance record by ID
 */
export function useAttendanceRecord(id: string) {
  return useQuery({
    queryKey: queryKeys.attendance.detail(id),
    queryFn: async () => {
      const response = await attendanceService.getAttendance({ studentId: id });
      return (response as any)?.data?.[0] || null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to record attendance
 */
export function useRecordAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      student: string;
      date: string;
      status: "Present" | "Absent" | "Late" | "Excused";
      period?: number;
      subject?: string;
      remarks?: string;
    }) => attendanceService.markAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success('Attendance recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record attendance');
    },
  });
}

/**
 * Hook to update attendance
 */
export function useUpdateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; remarks?: string } }) =>
      attendanceService.updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success('Attendance updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update attendance');
    },
  });
}

/**
 * Hook to delete attendance
 */
export function useDeleteAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids }: { ids: string[] }) => attendanceService.bulkUpdate({ ids, status: 'A' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success('Attendance deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete attendance');
    },
  });
}

/**
 * Hook to record bulk attendance
 */
export function useBulkRecordAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      date: string;
      classGrade: string;
      classStream?: string;
      period?: number;
      subject?: string;
      records: Array<{ student: string; status: "Present" | "Absent" | "Late" | "Excused"; remarks?: string }>;
    }) => attendanceService.bulkMarkAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success('Attendance recorded for all students');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record attendance');
    },
  });
}

/**
 * Hook to fetch student attendance summary
 */
export function useStudentAttendanceSummary(studentId: string) {
  return useQuery({
    queryKey: queryKeys.attendance.byStudent(studentId),
    queryFn: () => attendanceService.getStudentSummary(studentId),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch class attendance summary
 */
export function useClassAttendanceSummary(grade: string, section: string, month: string) {
  return useQuery({
    queryKey: queryKeys.attendance.byClass(`${grade}-${section}-${month}`),
    queryFn: () => attendanceService.getClassSummary(grade, section, month),
    enabled: !!(grade && section && month),
    staleTime: 5 * 60 * 1000,
  });
}
