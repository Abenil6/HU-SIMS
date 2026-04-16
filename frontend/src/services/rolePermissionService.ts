import { apiGet, apiPut } from "./api";

export interface RolePermissionRecord {
  role: string;
  name: string;
  description: string;
  userCount: number;
  permissions: Record<string, string[]>;
}

export interface RolesPermissionsResponse {
  roles: RolePermissionRecord[];
  availableActions: string[];
  availableResources: string[];
  roleMetadata: Record<string, { name: string; description: string }>;
  defaultPermissions: Record<string, Record<string, string[]>>;
}

export const rolePermissionService = {
  getRolesPermissions: async (): Promise<RolesPermissionsResponse> => {
    const response: any = await apiGet("/system/roles-permissions");
    return response?.data ?? response;
  },

  updateRolePermissions: async (
    role: string,
    permissions: Record<string, string[]>,
  ): Promise<{ role: string; permissions: Record<string, string[]> }> => {
    const response: any = await apiPut(`/system/roles-permissions/${role}`, {
      permissions,
    });
    return response?.data ?? response;
  },
};
