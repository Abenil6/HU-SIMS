import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messageService, type CreateMessageData } from '@/services/messageService';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

/**
 * Hook to fetch messages with filters
 */
export function useMessages(params?: {
  folder?: 'inbox' | 'sent' | 'drafts';
  page?: number;
  limit?: number;
  search?: string;
}) {
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);

  return useQuery({
    queryKey: queryKeys.messages.list(userId, params || {}),
    queryFn: () => messageService.getMessages(params),
    enabled: Boolean(userId),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single message by ID
 */
export function useMessage(id: string) {
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);

  return useQuery({
    queryKey: queryKeys.messages.detail(userId, id),
    queryFn: () => messageService.getMessage(id),
    enabled: Boolean(userId && id),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch inbox messages
 */
export function useInbox() {
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);

  return useQuery({
    queryKey: queryKeys.messages.inbox(userId),
    queryFn: () => messageService.getInbox(),
    enabled: Boolean(userId),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to fetch sent messages
 */
export function useSentMessages() {
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);

  return useQuery({
    queryKey: queryKeys.messages.sent(userId),
    queryFn: () => messageService.getSent(),
    enabled: Boolean(userId),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to fetch draft messages
 */
export function useDrafts() {
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);

  return useQuery({
    queryKey: queryKeys.messages.drafts(userId),
    queryFn: () => messageService.getDrafts(),
    enabled: Boolean(userId),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageData) => messageService.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      toast.success('Message sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => messageService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      toast.success('Message deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete message');
    },
  });
}

/**
 * Hook to mark message as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => messageService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      toast.success('Message marked as read');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark as read');
    },
  });
}

/**
 * Hook to send bulk messages
 */
export function useSendBulkMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageData & { recipientIds: string[] }) =>
      messageService.sendBulkMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      toast.success('Messages sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send messages');
    },
  });
}
