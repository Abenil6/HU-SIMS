import { apiGet, apiPost } from "./api";

export interface NotificationReadStateMap {
  [key: string]: string;
}

export const notificationReadStateService = {
  getReadStates: async (keys?: string[]) => {
    const response = await apiGet<{ success: boolean; data: NotificationReadStateMap }>(
      "/notification-read-states",
      keys?.length ? { keys: keys.join(",") } : undefined,
    );

    return (response as any)?.data ?? response;
  },

  markAsRead: async (key: string) =>
    apiPost("/notification-read-states/read", { key }),

  markManyAsRead: async (keys: string[]) =>
    apiPost("/notification-read-states/read-many", { keys }),
};

export default notificationReadStateService;
