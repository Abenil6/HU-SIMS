import { apiDelete, apiGet, apiPost, apiPut } from "./api";

export interface SchoolClass {
  id: string;
  _id?: string;
  name: string;
  grade: string;
  stream: string;
  academicYear?: string;
  capacity: number;
  students: number;
  classTeacher: string;
  classTeacherId?: string;
  subjects: string[];
  status: "Active" | "Inactive";
}

interface ClassListResponse {
  success: boolean;
  data: SchoolClass[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const normalizeClass = (item: any): SchoolClass => ({
  id: String(item?.id || item?._id || ""),
  _id: String(item?.id || item?._id || ""),
  name: item?.name || "",
  grade: item?.grade || "",
  stream: item?.stream || "",
  academicYear: item?.academicYear || "",
  capacity: Number(item?.capacity || 45),
  students: Number(item?.students || 0),
  classTeacher: item?.classTeacher || "-",
  classTeacherId: item?.classTeacherId || "",
  subjects: Array.isArray(item?.subjects) ? item.subjects : [],
  status: item?.status === "Inactive" ? "Inactive" : "Active",
});

export const classService = {
  getClasses: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    grade?: string;
    stream?: string;
    status?: string;
  }): Promise<ClassListResponse> => {
    const response = await apiGet<ClassListResponse>("/classes", params);
    return {
      ...response,
      data: Array.isArray(response?.data) ? response.data.map(normalizeClass) : [],
    };
  },

  createClass: async (data: {
    name: string;
    grade: string;
    stream?: string;
    capacity?: number;
    subjects?: string[];
    status?: "Active" | "Inactive";
    academicYear?: string;
  }): Promise<SchoolClass> => {
    const response = await apiPost<{ success: boolean; data: SchoolClass }>("/classes", data);
    return normalizeClass(response?.data || response);
  },

  updateClass: async (
    id: string,
    data: Partial<{
      name: string;
      grade: string;
      stream: string;
      capacity: number;
      subjects: string[];
      status: "Active" | "Inactive";
      academicYear: string;
    }>,
  ): Promise<SchoolClass> => {
    const response = await apiPut<{ success: boolean; data: SchoolClass }>(`/classes/${id}`, data);
    return normalizeClass(response?.data || response);
  },

  deleteClass: async (id: string): Promise<void> => {
    await apiDelete(`/classes/${id}`);
  },
};

export default classService;
