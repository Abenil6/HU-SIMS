import { apiGet, apiPost, apiPut, apiDelete } from "./api";
const MAX_MESSAGES_LIMIT = 200;
const DEFAULT_MESSAGES_LIMIT = 100;

const resolveMessagesLimit = (limit?: number) => {
  if (!Number.isFinite(limit)) return DEFAULT_MESSAGES_LIMIT;
  return Math.min(Math.max(1, Number(limit)), MAX_MESSAGES_LIMIT);
};

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  subject?: string;
  content: string;
  category:
    | "General"
    | "Academic"
    | "Attendance"
    | "Emergency"
    | "Announcement"
    | "Reminder";
  isRead: boolean;
  isStarred: boolean;
  attachments?: Array<{ name: string; url: string }>;
  createdAt: string;
}

export interface MessageRecipient {
  id: string;
  name: string;
  role: string;
  email: string;
  relationship?: string;
  grade?: string;
  stream?: string;
  subjects?: string[];
  linkedStudentInfo?: Array<{
    id: string;
    name: string;
    grade?: string;
    stream?: string;
  }>;
}

export interface CreateMessageData {
  recipientId: string;
  subject?: string;
  content: string;
  category?: string;
}

export interface MessageThread {
  id: string;
  participants: Array<{ id: string; name: string; role: string }>;
  messages: Message[];
  lastMessage: Message;
  unreadCount: number;
}

export interface MessageCountResponse {
  unreadCount: number;
}

export const messageService = {
  getMessages: async (params?: {
    folder?: "inbox" | "sent" | "drafts";
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    if (params?.folder === "sent") return messageService.getSent(params);
    return messageService.getInbox(params);
  },

  // Get inbox messages
  getInbox: async (params?: { page?: number; limit?: number; category?: string }) =>
    apiGet("/messages", { ...params, limit: resolveMessagesLimit(params?.limit) }),

  // Get sent messages
  getSent: async (params?: { page?: number; limit?: number }) =>
    apiGet("/messages/sent", { ...params, limit: resolveMessagesLimit(params?.limit) }),

  // Get starred messages
  getStarred: async (params?: { page?: number; limit?: number }) =>
    apiGet("/messages/starred", { ...params, limit: resolveMessagesLimit(params?.limit) }),

  // Get single message
  getMessage: async (id: string) => apiGet(`/messages/${id}`),

  // Send message
  sendMessage: async (data: CreateMessageData) =>
    apiPost("/messages", {
      ...data,
      recipient: data.recipientId,
      body: data.content,
    }),

  // Reply to message
  replyMessage: async (
    id: string,
    content: string,
    category?: string,
    recipientId?: string,
  ) =>
    apiPost(`/messages/${id}/reply`, {
      content,
      body: content,
      ...(recipientId ? { recipientId } : {}),
      ...(category ? { category } : {}),
    }),

  // Mark as read
  markAsRead: async (id: string) => apiPut(`/messages/${id}/read`),

  // Mark as unread
  markAsUnread: async (id: string) => apiPut(`/messages/${id}/unread`),

  // Star message
  starMessage: async (id: string) => apiPut(`/messages/${id}/star`),

  // Unstar message
  unstarMessage: async (id: string) => apiPut(`/messages/${id}/unstar`),

  // Delete message
  deleteMessage: async (id: string) => apiDelete(`/messages/${id}`),

  // Bulk delete
  bulkDelete: async (ids: string[]) => apiPost("/messages/bulk-delete", { ids }),

  // Get conversations
  getConversations: async () => apiGet("/messages/conversations"),

  // Get unread count
  getUnreadCount: async () =>
    apiGet<{ success: boolean; data: MessageCountResponse }>("/messages/unread"),

  // Get recipients list
  getRecipients: async () =>
    apiGet<{ success: boolean; data: MessageRecipient[] }>("/messages/recipients"),

  getDrafts: async () => ({ success: true, data: [] }),

  sendBulkMessage: async (
    data: CreateMessageData & { recipientIds: string[] },
  ) =>
    Promise.all(
      data.recipientIds.map((recipientId) =>
        messageService.sendMessage({
          recipientId,
          subject: data.subject,
          content: data.content,
          category: data.category,
        }),
      ),
    ),
};

export default messageService;
