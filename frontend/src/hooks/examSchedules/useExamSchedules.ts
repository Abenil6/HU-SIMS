import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examScheduleService, type ExamSchedule } from '@/services/examScheduleService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

export interface CreateExamScheduleData {
  examName: string;
  examType: 'Midterm' | 'Final' | 'Mock';
  subject: string;
  grade: number;
  section?: string;
  academicYear: string;
  semester: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  room?: string;
  invigilator?: string;
  instructions?: string;
  notes?: string;
  maxMarks?: number;
}

export interface AutoGenerateScheduleData {
  grade: number;
  section?: string;
  academicYear: string;
  semester: string;
  examType: 'Midterm' | 'Final' | 'Mock';
  startDate: string;
  endDate: string;
}

export function useExamSchedules(params?: {
  academicYear?: string;
  semester?: string;
  grade?: number;
  section?: string;
  subject?: string;
  examType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.examSchedules.list(params || {}),
    queryFn: () => examScheduleService.getExamSchedules(params || {}),
    staleTime: 2 * 60 * 1000,
  });
}

export function useExamSchedule(id: string) {
  return useQuery({
    queryKey: queryKeys.examSchedules.detail(id),
    queryFn: () => examScheduleService.getExamScheduleById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExamScheduleData) => 
      examScheduleService.createExamSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examSchedules.all });
      toast.success('Exam schedule created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create exam schedule');
    },
  });
}

export function useUpdateExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamSchedule> }) =>
      examScheduleService.updateExamSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examSchedules.all });
      toast.success('Exam schedule updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update exam schedule');
    },
  });
}

export function useDeleteExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => examScheduleService.deleteExamSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examSchedules.all });
      toast.success('Exam schedule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete exam schedule');
    },
  });
}

export function useAutoGenerateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutoGenerateScheduleData) =>
      examScheduleService.autoGenerateSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examSchedules.all });
      toast.success('Schedule auto-generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to auto-generate schedule');
    },
  });
}

export function useRegenerateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutoGenerateScheduleData) =>
      examScheduleService.regenerateSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examSchedules.all });
      toast.success('Schedule regenerated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to regenerate schedule');
    },
  });
}
