import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  academicService,
  type Grade as AcademicRecord,
  type AssessmentType,
} from '@/services/academicService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

export interface CreateGradeData {
  studentId: string;
  subject: string;
  assessmentType: AssessmentType;
  score: number;
  maxScore: number;
  weight: number;
  semester: string;
  academicYear: string;
}

export function useAcademicRecords(params?: {
  studentId?: string;
  classId?: string;
  academicYear?: string;
  semester?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.academicRecords.list(params || {}),
    queryFn: async () => {
      const payload: Parameters<typeof academicService.getGrades>[0] = {
        limit: params?.limit ?? 1000,
      };
      if (params?.studentId) payload.studentId = params.studentId;
      if (params?.classId) payload.grade = params.classId;
      if (params?.academicYear) payload.academicYear = params.academicYear;
      if (params?.semester) payload.semester = params.semester;

      return academicService.getGrades(payload);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAcademicRecord(id: string) {
  return useQuery({
    queryKey: queryKeys.academicRecords.detail(id),
    queryFn: async () => {
      const response = (await academicService.getGrades({ limit: 1000 })) as {
        data?: AcademicRecord[];
      };
      return (response.data || []).find((record) => record.id === id) || null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentAcademicRecords(studentId: string) {
  return useQuery({
    queryKey: queryKeys.academicRecords.byStudent(studentId),
    queryFn: () => academicService.getGrades({ studentId, limit: 1000 }),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGradeData) => academicService.enterGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicRecords.all });
      toast.success('Grade saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save grade');
    },
  });
}

export function useUpdateAcademicRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AcademicRecord>;
    }) =>
      academicService.updateGrade(id, {
        score: Number(data.score ?? 0),
        maxScore: data.maxScore,
        weight: data.weight,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicRecords.all });
      toast.success('Record updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update record');
    },
  });
}

export function useDeleteAcademicRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => academicService.deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicRecords.all });
      toast.success('Record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete record');
    },
  });
}

export function useStudentGPA(studentId: string) {
  return useQuery({
    queryKey: [...queryKeys.academicRecords.byStudent(studentId), 'gpa'],
    queryFn: () =>
      academicService.calculateAverage({
        studentId,
      }),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentCGPA(studentId: string) {
  return useQuery({
    queryKey: [...queryKeys.academicRecords.byStudent(studentId), 'cgpa'],
    queryFn: () =>
      academicService.calculateAverage({
        studentId,
      }),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentTranscript(studentId: string) {
  return useQuery({
    queryKey: [...queryKeys.academicRecords.byStudent(studentId), 'transcript'],
    queryFn: () =>
      academicService.getStudentOverallResult(studentId, 'Semester 1', '2025-2026'),
    enabled: !!studentId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useHonorRollStudents() {
  return useQuery({
    queryKey: ['academicRecords', 'honor-roll'],
    queryFn: () =>
      academicService.getHonorRollStatus({
        academicYear: '2025-2026',
        semester: 'Semester 1',
      }),
    staleTime: 10 * 60 * 1000,
  });
}
