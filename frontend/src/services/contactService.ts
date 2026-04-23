import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface ContactMessage {
  _id: string;
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'New' | 'Read' | 'Replied' | 'Archived';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  ipAddress?: string;
  userAgent?: string;
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: string;
  emailSent: boolean;
  emailSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats {
  totalMessages: number;
  newMessages: number;
  readMessages: number;
  repliedMessages: number;
  archivedMessages: number;
  byPriority: {
    Low: number;
    Medium: number;
    High: number;
    Urgent: number;
  };
}

export const contactService = {
  // Get all contact messages (admin only)
  getAllMessages: async (params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) => {
    return apiGet<{ success: boolean; data: ContactMessage[]; pagination?: any }>('/contact/admin', params);
  },

  // Get contact message statistics (admin only)
  getStats: async () => {
    return apiGet<{ success: boolean; data: ContactStats }>('/contact/admin/stats');
  },

  // Get a single contact message by ID (admin only)
  getMessageById: async (id: string) => {
    return apiGet<{ success: boolean; data: ContactMessage }>(`/contact/admin/${id}`);
  },

  // Update contact message status (admin only)
  updateStatus: async (id: string, status: 'New' | 'Read' | 'Replied' | 'Archived') => {
    return apiPut<{ success: boolean; data: ContactMessage }>(`/contact/admin/${id}`, { status });
  },

  // Respond to a contact message (admin only)
  respondToMessage: async (id: string, response: string) => {
    return apiPost<{ success: boolean; data: ContactMessage }>(`/contact/admin/${id}/respond`, { response });
  },

  // Delete a contact message (admin only)
  deleteMessage: async (id: string) => {
    return apiDelete<{ success: boolean; message: string }>(`/contact/admin/${id}`);
  },

  // Submit a contact form (public)
  submitContactForm: async (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    return apiPost<{ success: boolean; message: string }>('/contact', data);
  },
};

export default contactService;
