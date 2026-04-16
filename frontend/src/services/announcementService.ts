import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type?: string;
  priority?: string;
  targetRoles?: string[];
  targetGrades?: string[];
  published?: boolean;
  createdAt: string;
  isActive?: boolean;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type?: string;
  priority?: string;
  targetRoles?: string[];
  targetGrades?: string[];
}

export const announcementService = {
  getAnnouncements: async (params?: {
    type?: string;
    priority?: string;
    published?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiGet<{ success: boolean; data: Announcement[]; pagination?: any }>(
      "/announcements/admin",
      { ...params, limit: params?.limit || 1000 } as Record<string, unknown>
    );
    return (response as any)?.data ?? response;
  },

  getActiveAnnouncements: async () => {
    const response = await apiGet<{ success: boolean; data: Announcement[] }>(
      "/announcements",
      {}
    );
    return (response as any)?.data ?? response;
  },

  getAnnouncement: async (id: string) => {
    const response = await apiGet<{ success: boolean; data: Announcement }>(
      `/announcements/admin/${id}`
    );
    return (response as any)?.data ?? response;
  },

  createAnnouncement: async (data: CreateAnnouncementData) => {
    return apiPost("/announcements/admin", data);
  },

  updateAnnouncement: async (id: string, data: Partial<CreateAnnouncementData>) => {
    return apiPut(`/announcements/admin/${id}`, data);
  },

  deleteAnnouncement: async (id: string) => {
    return apiDelete(`/announcements/admin/${id}`);
  },

  publishAnnouncement: async (id: string) => {
    return apiPost(`/announcements/admin/${id}/toggle-publish`, {});
  },

  markAsRead: async (id: string) => {
    return apiPut(`/announcements/${id}/read`, {});
  },
};
