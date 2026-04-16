import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timetableService, type Timetable, type CreateTimetableData } from '@/services/timetableService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch timetables with filters
 */
export function useTimetables(params?: {
  classId?: string;
  class?: string;
  stream?: string;
  semester?: string;
  academicYear?: string;
  teacherId?: string;
  studentId?: string;
  day?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.timetables.list(params || {}),
    queryFn: () => timetableService.getTimetables(params),
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch a single timetable by ID
 */
export function useTimetable(id: string) {
  return useQuery({
    queryKey: queryKeys.timetables.detail(id),
    queryFn: () => timetableService.getTimetable(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch class timetable
 */
export function useClassTimetable(classId: string) {
  return useQuery({
    queryKey: queryKeys.timetables.byClass(classId),
    queryFn: () => timetableService.getTimetables({ classId }),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch teacher timetable
 */
export function useTeacherTimetable(teacherId: string) {
  return useQuery({
    queryKey: queryKeys.timetables.byTeacher(teacherId),
    queryFn: () => timetableService.getTimetables({ teacherId }),
    enabled: !!teacherId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch student timetable
 */
export function useStudentTimetable(studentId: string) {
  return useQuery({
    queryKey: queryKeys.timetables.byStudent(studentId),
    queryFn: () => timetableService.getStudentTimetable(studentId),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a timetable
 */
export function useCreateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTimetableData) => timetableService.createTimetable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetables.all });
      toast.success('Timetable created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create timetable');
    },
  });
}

/**
 * Hook to update a timetable
 */
export function useUpdateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTimetableData> }) =>
      timetableService.updateTimetable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetables.all });
      toast.success('Timetable updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update timetable');
    },
  });
}

/**
 * Hook to delete a timetable
 */
export function useDeleteTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.deleteTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetables.all });
      toast.success('Timetable deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete timetable');
    },
  });
}

/**
 * Hook to add a schedule to timetable
 */
export function useAddSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timetableId, schedule }: { timetableId: string; schedule: any }) =>
      timetableService.addSchedule(timetableId, schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetables.all });
      toast.success('Schedule added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add schedule');
    },
  });
}

/**
 * Hook to check timetable conflicts
 */
export function useCheckTimetableConflicts(timetableId: string) {
  return useQuery({
    queryKey: [...queryKeys.timetables.detail(timetableId), 'conflicts'],
    queryFn: () => timetableService.checkConflicts({ timetableId }),
    enabled: !!timetableId,
    staleTime: 2 * 60 * 1000,
  });
}
