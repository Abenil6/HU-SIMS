import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  studentService,
  type Student,
  type CreateStudentData,
  type CreateStudentResponse,
  type UpdateStudentData,
} from '@/services/studentService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch a list of students with pagination and filters
 */
export function useStudents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  grade?: string;
  stream?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: queryKeys.students.list(params || {}),
    queryFn: () => studentService.getStudents(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single student by ID
 */
export function useStudent(id: string) {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => studentService.getStudent(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new student
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudentData): Promise<CreateStudentResponse> =>
      studentService.createStudent(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      toast.success(response.message || 'Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create student');
    },
  });
}

/**
 * Hook to update a student
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentData }) =>
      studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.refetchQueries({ queryKey: queryKeys.students.all });
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });
}

/**
 * Hook to delete a student
 */
export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => studentService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete student');
    },
  });
}

/**
 * Hook to bulk delete students
 */
export function useBulkDeleteStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => studentService.bulkDeleteStudents(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success('Students deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete students');
    },
  });
}

/**
 * Hook to link a parent to a student
 */
export function useLinkParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, parentId }: { studentId: string; parentId: string }) =>
      studentService.linkParent(studentId, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      queryClient.refetchQueries({ queryKey: queryKeys.students.all });
      toast.success('Parent linked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to link parent');
    },
  });
}

/**
 * Hook to unlink a parent from a student
 */
export function useUnlinkParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, parentId }: { studentId: string; parentId: string }) =>
      studentService.unlinkParent(studentId, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      queryClient.refetchQueries({ queryKey: queryKeys.students.all });
      toast.success('Parent unlinked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unlink parent');
    },
  });
}

/**
 * Hook to bulk upload students from parsed CSV data
 */
export function useBulkUploadStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      students,
      defaultGrade,
      defaultStream,
    }: {
      students: Array<{ firstName: string; lastName: string; email: string; grade?: string; stream?: string }>;
      defaultGrade?: string;
      defaultStream?: string;
    }) => studentService.bulkCreateStudents(students, defaultGrade, defaultStream),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: ['admin-users-students-classes'] });
      toast.success(`Uploaded ${data.successCount} students, ${data.failed} failed`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload students');
    },
  });
}

/**
 * Hook to transfer a student
 */
export function useTransferStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { newGrade: string; newStream?: string; transferDate: string };
    }) => studentService.transferStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success('Student transferred successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to transfer student');
    },
  });
}

/**
 * Hook to graduate a student
 */
export function useGraduateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, graduationDate }: { id: string; graduationDate: string }) =>
      studentService.graduateStudent(id, graduationDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success('Student graduated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to graduate student');
    },
  });
}
