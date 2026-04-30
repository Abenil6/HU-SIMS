import { apiGet } from "./api";

export interface PublicConfig {
  siteName: string;
  requireEmailVerification: boolean;
  minPasswordLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  twoFactorAuth: boolean;
}

export const systemService = {
  getPublicConfig: async (): Promise<PublicConfig> => {
    const response: any = await apiGet("/system/public-config");
    return response.data;
  },
};
