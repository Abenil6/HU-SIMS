import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherService, type Teacher, type CreateTeacherData } from '@/services/teacherService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch a list of teachers with pagination and filters
 */
export function useTeachers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  subject?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: queryKeys.teachers.list(params || {}),
    queryFn: () => teacherService.getTeachers(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single teacher by ID
 */
export function useTeacher(id: string) {
  return useQuery({
    queryKey: queryKeys.teachers.detail(id),
    queryFn: () => teacherService.getTeacher(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new teacher
 */
export function useCreateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeacherData) => teacherService.createTeacher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      toast.success('Teacher created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create teacher');
    },
  });
}

/**
 * Hook to update a teacher
 */
export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTeacherData> }) =>
      teacherService.updateTeacher(id, data),
    onSuccess: (_, variables) => {
      // Invalidate all teacher queries to refresh dashboard and list data
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.detail(variables.id) });
      toast.success('Teacher updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update teacher');
    },
  });
}

/**
 * Hook to delete a teacher
 */
export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => teacherService.deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      toast.success('Teacher deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete teacher');
    },
  });
}

/**
 * Hook to update teacher subjects
 */
export function useUpdateTeacherSubjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, subject, action }: { id: string; subject: string; action: 'assign' | 'remove' }) =>
      action === 'assign' 
        ? teacherService.assignSubject(id, subject)
        : teacherService.removeSubject(id, subject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      toast.success('Teacher subjects updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update teacher subjects');
    },
  });
}

/**
 * Hook to update teacher classes
 */
export function useUpdateTeacherClasses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, grade, section, action }: { id: string; grade: string; section: string; action: 'assign' | 'remove' }) =>
      action === 'assign'
        ? teacherService.assignClass(id, grade, section)
        : teacherService.removeClass(id, grade, section),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      toast.success('Teacher classes updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update teacher classes');
    },
  });
}
