import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementService, type Announcement, type CreateAnnouncementData } from '@/services/announcementService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch announcements with filters
 */
export function useAnnouncements(params?: {
  targetAudience?: string;
  priority?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.announcements.list(params || {}),
    queryFn: () => announcementService.getAnnouncements(params),
    staleTime: 2 * 60 * 1000,
    enabled: params?.enabled ?? true,
  });
}

/**
 * Hook to fetch active announcements
 */
export function useActiveAnnouncements(enabled = true) {
  return useQuery({
    queryKey: queryKeys.announcements.active(),
    queryFn: () => announcementService.getActiveAnnouncements(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * Hook to fetch a single announcement by ID
 */
export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: () => announcementService.getAnnouncement(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create an announcement
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementData) => announcementService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      toast.success('Announcement created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create announcement');
    },
  });
}

/**
 * Hook to update an announcement
 */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAnnouncementData> }) =>
      announcementService.updateAnnouncement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      toast.success('Announcement updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update announcement');
    },
  });
}

/**
 * Hook to delete an announcement
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      toast.success('Announcement deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete announcement');
    },
  });
}

/**
 * Hook to publish an announcement
 */
export function usePublishAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => announcementService.publishAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      toast.success('Announcement published successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish announcement');
    },
  });
}

/**
 * Hook to mark announcement as read
 */
export function useMarkAnnouncementRead() {
  return useMutation({
    mutationFn: (id: string) => announcementService.markAsRead(id),
    onSuccess: () => {
      toast.success('Marked as read');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark as read');
    },
  });
}
