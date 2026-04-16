import { apiGet, apiPost, apiPut, apiDelete, apiUpload, apiUploadPut } from "./api";

// Types
export interface Material {
  id: string;
  title: string;
  description: string;
  type: "study_material" | "assignment" | "resource";
  subject: string;
  grade: string;
  section: string;
  teacherId: string;
  teacherName: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  dueDate?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  status: "draft" | "published" | "archived";
  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialData {
  title: string;
  description: string;
  type: "study_material" | "assignment" | "resource";
  subject: string;
  grade: string;
  section: string;
  file?: File;
  dueDate?: string;
}

export interface MaterialListResponse {
  materials: Material[];
  total: number;
  page: number;
  limit: number;
}

// Material API
export const materialService = {
  // Get all materials with filters
  getMaterials: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    subject?: string;
    grade?: string;
    type?: string;
    status?: string;
  }): Promise<MaterialListResponse> => {
    return apiGet<MaterialListResponse>("/materials", params);
  },

  // Get single material by ID
  getMaterial: async (id: string): Promise<Material> => {
    return apiGet<Material>(`/materials/${id}`);
  },

  // Get materials by teacher
  getMaterialsByTeacher: async (teacherId: string): Promise<Material[]> => {
    return apiGet<Material[]>(`/materials/teacher/${teacherId}`);
  },

  // Get materials for student
  getMaterialsForStudent: async (params?: {
    grade?: string;
    section?: string;
  }): Promise<Material[]> => {
    return apiGet<Material[]>("/materials/student", params);
  },

  // Create new material
  createMaterial: async (data: CreateMaterialData): Promise<Material> => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("type", data.type);
    formData.append("subject", data.subject);
    formData.append("grade", data.grade);
    formData.append("section", data.section);
    if (data.file) {
      formData.append("file", data.file);
    }
    if (data.dueDate) {
      formData.append("dueDate", data.dueDate);
    }
    return apiUpload<Material>("/materials", formData);
  },

  // Update material
  updateMaterial: async (
    id: string,
    data: Partial<CreateMaterialData>,
  ): Promise<Material> => {
    const hasFile = data.file instanceof File;
    if (hasFile) {
      const formData = new FormData();
      if (data.title !== undefined) formData.append("title", data.title);
      if (data.description !== undefined) formData.append("description", data.description);
      if (data.type !== undefined) formData.append("type", data.type);
      if (data.subject !== undefined) formData.append("subject", data.subject);
      if (data.grade !== undefined) formData.append("grade", data.grade);
      if (data.section !== undefined) formData.append("section", data.section);
      if (data.file) formData.append("file", data.file);
      if (data.dueDate !== undefined) formData.append("dueDate", data.dueDate);
      return apiUploadPut<Material>(`/materials/${id}`, formData);
    }

    return apiPut<Material>(`/materials/${id}`, data);
  },

  // Delete material
  deleteMaterial: async (id: string): Promise<void> => {
    return apiDelete(`/materials/${id}`);
  },

  // Publish material
  publishMaterial: async (id: string): Promise<Material> => {
    return apiPost<Material>(`/materials/${id}/publish`);
  },

  // Archive material
  archiveMaterial: async (id: string): Promise<Material> => {
    return apiPost<Material>(`/materials/${id}/archive`);
  },

  // Mark as read/viewed
  markAsViewed: async (id: string): Promise<void> => {
    return apiPost(`/materials/${id}/view`);
  },

  // Download material
  downloadMaterial: async (id: string): Promise<Blob> => {
    return apiGet(`/materials/${id}/download`, {
      responseType: "blob",
    }) as unknown as Promise<Blob>;
  },

  // Get subjects list
  getSubjects: async (): Promise<string[]> => {
    return apiGet<string[]>("/materials/subjects");
  },

  // Get grades list
  getGrades: async (): Promise<string[]> => {
    return apiGet<string[]>("/materials/grades");
  },
};

export default materialService;
