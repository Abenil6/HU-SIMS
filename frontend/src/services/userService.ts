import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "./api";

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  role: "SystemAdmin" | "SchoolAdmin" | "Teacher" | "Student" | "Parent";
  status: "active" | "inactive" | "pending";
  avatar?: string;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  role: string;
  grade?: string;
  stream?: string;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  status?: "active" | "inactive";
}

export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    total: number;
    active: number;
    verified: number;
  };
}

function mapStatus(status: any): User["status"] {
  if (status === "Active" || status === "active") return "active";
  if (status === "Inactive" || status === "inactive") return "inactive";
  return "pending";
}

function mapUser(u: any): User {
  return {
    id: u?.id || u?._id,
    firstName: u?.firstName || "",
    lastName: u?.lastName || "",
    email: u?.email || "",
    phone: u?.phone,
    gender: u?.gender,
    role: u?.role,
    status: mapStatus(u?.status),
    avatar: u?.avatar || u?.profileImage,
    isVerified: u?.isVerified,
    createdAt: u?.createdAt,
    updatedAt: u?.updatedAt,
  };
}

// User API
export const userService = {
  // Get all users with pagination and filters
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UsersListResponse> => {
    const res: any = await apiGet("/admin/users", { ...params, limit: params?.limit || 1000 } as any);
    const usersRaw: any[] = res?.data || [];
    const pagination = res?.pagination || {};
    return {
      users: usersRaw.map(mapUser),
      total: pagination.total ?? usersRaw.length,
      page: pagination.page ?? params?.page ?? 1,
      limit: pagination.limit ?? params?.limit ?? 1000,
      stats: res?.stats,
    };
  },

  // Get single user by ID
  getUser: async (id: string): Promise<User> => {
    const res: any = await apiGet(`/admin/users/${id}`);
    return mapUser(res?.data ?? res);
  },

  // Create new user
  createUser: async (data: CreateUserData): Promise<User> => {
    const payload = {
      ...data,
      username: data.email.split('@')[0] + '_' + Date.now(),
    };
    const res: any = await apiPost("/admin/users", payload);
    return mapUser(res?.data ?? res);
  },

  // Update user
  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const res: any = await apiPut(`/admin/users/${id}`, data as any);
    return mapUser(res?.data ?? res);
  },

  // Delete user
  deleteUser: async (id: string): Promise<void> => {
    await apiDelete(`/admin/users/${id}`);
  },

  // Bulk delete users
  bulkDeleteUsers: async (ids: string[]): Promise<void> => {
    return apiPost("/users/bulk-delete", { ids });
  },

  // Update user status
  updateUserStatus: async (
    id: string,
    status: "active" | "inactive"
  ): Promise<User> => {
    const endpoint =
      status === "active"
        ? `/admin/users/${id}/activate`
        : `/admin/users/${id}/deactivate`;
    const res: any = await apiPost(endpoint, {});
    return mapUser(res?.data ?? res);
  },

  // Upload user avatar
  uploadAvatar: async (id: string, file: File): Promise<User> => {
    const formData = new FormData();
    formData.append("avatar", file);
    return apiUpload<User>(`/users/${id}/avatar`, formData);
  },

  // Get user activity logs
  getUserLogs: async (
    id: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ logs: any[]; total: number }> => {
    return apiGet(`/users/${id}/logs`, params);
  },

  // Get teachers
  getTeachers: async (): Promise<User[]> => {
    const res: any = await apiGet("/admin/users", { role: "Teacher", limit: 200, page: 1 });
    const usersRaw: any[] = res?.data || [];
    return usersRaw.map(mapUser);
  },

  // Get parents
  getParents: async (): Promise<User[]> => {
    const res: any = await apiGet("/admin/users", { role: "Parent", limit: 200, page: 1 });
    const usersRaw: any[] = res?.data || [];
    return usersRaw.map(mapUser);
  },

  // Get students
  getStudents: async (): Promise<User[]> => {
    const res: any = await apiGet("/admin/users", { role: "Student", limit: 200, page: 1 });
    const usersRaw: any[] = res?.data || [];
    return usersRaw.map(mapUser);
  },
};

export default userService;
