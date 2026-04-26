import { apiGet, apiPost, apiPut } from "./api";
import type { AppearanceSettings } from "@/types/user";

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImage?: string;
  signature?: string;
  appearanceSettings?: AppearanceSettings;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

// Auth API
export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    return apiPost<LoginResponse>("/auth/login", credentials);
  },

  logout: async (): Promise<void> => {
    await apiPost("/auth/logout", {});
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await apiGet<{ success: boolean; data: AuthUser }>("/auth/me");
    return response?.data ?? (response as unknown as AuthUser);
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    throw new Error("Refresh token endpoint is not available in the current backend API.");
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    return apiPost("/auth/change-password", data);
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    profileImage?: string;
    signature?: string;
    appearanceSettings?: AppearanceSettings;
  }): Promise<AuthUser> => {
    const response = await apiPut<{ success: boolean; data: AuthUser }>(
      "/auth/me",
      data,
    );
    return response?.data ?? (response as unknown as AuthUser);
  },

  updateAppearance: async (
    appearanceSettings: AppearanceSettings,
  ): Promise<AuthUser> => {
    const response = await apiPut<{ success: boolean; data: AuthUser }>(
      "/auth/appearance",
      appearanceSettings,
    );
    return response?.data ?? (response as unknown as AuthUser);
  },

  forgotPassword: async (email: string): Promise<void> => {
    return apiPost("/auth/forgot-password", { email });
  },

  resetPassword: async (
    token: string,
    password: string
  ): Promise<void> => {
    return apiPost("/auth/reset-password", { token, password });
  },

  verifyEmail: async (token: string, password: string): Promise<void> => {
    return apiPost("/auth/verify-email", { token, password });
  },
};

export default authService;
