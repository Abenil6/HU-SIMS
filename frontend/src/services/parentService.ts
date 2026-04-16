import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface Parent {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: string;
  occupation?: string;
  relationship: string; // father, mother, guardian
  studentIds: string[];
  students: Array<{
    id: string;
    studentId: string;
    name: string;
  }>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParentData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: string;
  occupation?: string;
  relationship: string;
  studentIds?: string[];
}

export type UpdateParentData = Partial<CreateParentData>;

export interface ParentsListResponse {
  success: boolean;
  data: Parent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const parentService = {
  getParents: async (params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<ParentsListResponse> =>
    apiGet<ParentsListResponse>("/parents", { ...params, limit: params?.limit || 1000 }),

  getParent: async (id: string) => apiGet(`/parents/${id}`),

  createParent: async (data: CreateParentData) => apiPost("/parents", data),

  updateParent: async (id: string, data: UpdateParentData) =>
    apiPut(`/parents/${id}`, data),

  deleteParent: async (id: string) => apiDelete(`/parents/${id}`),

  linkStudent: async (parentId: string, studentId: string) =>
    apiPost(`/parents/${parentId}/link-student`, { studentId }),

  unlinkStudent: async (parentId: string, studentId: string) =>
    apiDelete(`/parents/${parentId}/unlink-student/${studentId}`),

  getParentByStudent: async (studentId: string) => {
    const res: any = await apiGet(`/parents/student/${studentId}`);
    return res?.data ?? res;
  },

  getChildren: async (parentId: string) => {
    const res: any = await apiGet(`/parents/${parentId}/children`);
    return res?.data ?? res;
  },

  getParentChildren: async (parentId: string) => {
    const res: any = await apiGet(`/parents/${parentId}/children`);
    return res?.data ?? res;
  },
};

export default parentService;
