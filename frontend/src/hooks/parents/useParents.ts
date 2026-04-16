import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parentService, type Parent, type CreateParentData, type UpdateParentData } from '@/services/parentService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch a list of parents with pagination and filters
 */
export function useParents(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: queryKeys.parents.list(params || {}),
    queryFn: () => parentService.getParents(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single parent by ID
 */
export function useParent(id: string) {
  return useQuery({
    queryKey: queryKeys.parents.detail(id),
    queryFn: () => parentService.getParent(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new parent
 */
export function useCreateParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParentData) => parentService.createParent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      toast.success('Parent created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create parent');
    },
  });
}

/**
 * Hook to update a parent
 */
export function useUpdateParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateParentData }) =>
      parentService.updateParent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      toast.success('Parent updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update parent');
    },
  });
}

/**
 * Hook to delete a parent
 */
export function useDeleteParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => parentService.deleteParent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      toast.success('Parent deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete parent');
    },
  });
}

/**
 * Hook to link a student to a parent
 */
export function useLinkStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      parentService.linkStudent(parentId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      toast.success('Student linked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to link student');
    },
  });
}

/**
 * Hook to unlink a student from a parent
 */
export function useUnlinkStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      parentService.unlinkStudent(parentId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parents.all });
      toast.success('Student unlinked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unlink student');
    },
  });
}

/**
 * Hook to fetch parent's children
 */
export function useParentChildren(parentId: string) {
  return useQuery({
    queryKey: [...queryKeys.parents.detail(parentId), 'children'],
    queryFn: () => parentService.getParentChildren(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
  });
}
