import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface Teacher {
  id: string;
  _id?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender: "Male" | "Female";
  qualification: string;
  subjects: string[];
  classes: Array<{ grade: string; section: string }>;
  status: "active" | "inactive" | "Active" | "Inactive" | "Pending";
  teacherProfile?: {
    qualifications?: string[];
    subjects?: string[];
    classes?: Array<{ grade: string; section?: string; stream?: string }>;
    gender?: "Male" | "Female";
    specialization?: string;
    homeAddress?: {
      street?: string;
      city?: string;
      state?: string;
    };
  };
  address?: {
    street?: string;
    city?: string;
    region?: string;
  };
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherData {
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender: "Male" | "Female";
  qualification: string;
  subjects: string[];
  classes?: Array<{ grade: string; section: string }>;
}

export interface TeachersListResponse {
  success: boolean;
  data: Teacher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TeacherService {
  getTeachers: (params?: { page?: number; limit?: number; search?: string; subject?: string; status?: string }) => Promise<TeachersListResponse>;
  getTeacher: (id: string) => Promise<Teacher>;
  createTeacher: (data: CreateTeacherData) => Promise<Teacher>;
  updateTeacher: (id: string, data: Partial<CreateTeacherData>) => Promise<Teacher>;
  deleteTeacher: (id: string) => Promise<void>;
  assignSubject: (id: string, subject: string) => Promise<void>;
  removeSubject: (id: string, subject: string) => Promise<void>;
  assignClass: (id: string, grade: string, section: string) => Promise<void>;
  removeClass: (id: string, grade: string, section: string) => Promise<void>;
  getTeachersBySubject: (subject: string) => Promise<Teacher[]>;
}

export const teacherService: TeacherService = {
  getTeachers: async (params?: { page?: number; limit?: number; search?: string; subject?: string; status?: string }): Promise<TeachersListResponse> => {
    try {
      return await apiGet<TeachersListResponse>("/teachers", { ...params, limit: params?.limit || 1000 });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      throw error;
    }
  },
  getTeacher: async (id: string): Promise<Teacher> => {
    try {
      return await apiGet(`/teachers/${id}`);
    } catch (error) {
      console.error("Error fetching teacher:", error);
      throw error;
    }
  },
  createTeacher: async (data: CreateTeacherData): Promise<Teacher> => {
    try {
      return await apiPost("/teachers", data);
    } catch (error) {
      console.error("Error creating teacher:", error);
      throw error;
    }
  },
  updateTeacher: async (id: string, data: Partial<CreateTeacherData>): Promise<Teacher> => {
    try {
      return await apiPut(`/teachers/${id}`, data);
    } catch (error) {
      console.error("Error updating teacher:", error);
      throw error;
    }
  },
  deleteTeacher: async (id: string): Promise<void> => {
    try {
      await apiDelete(`/teachers/${id}`);
    } catch (error) {
      console.error("Error deleting teacher:", error);
      throw error;
    }
  },
  assignSubject: async (id: string, subject: string): Promise<void> => {
    try {
      await apiPost(`/teachers/${id}/subjects`, { subject });
    } catch (error) {
      console.error("Error assigning subject:", error);
      throw error;
    }
  },
  removeSubject: async (id: string, subject: string): Promise<void> => {
    try {
      await apiDelete(`/teachers/${id}/subjects/${subject}`);
    } catch (error) {
      console.error("Error removing subject:", error);
      throw error;
    }
  },
  assignClass: async (id: string, grade: string, section: string): Promise<void> => {
    try {
      await apiPost(`/teachers/${id}/classes`, { grade, section });
    } catch (error) {
      console.error("Error assigning class:", error);
      throw error;
    }
  },
  removeClass: async (id: string, grade: string, section: string): Promise<void> => {
    try {
      await apiDelete(`/teachers/${id}/classes/${grade}/${section}`);
    } catch (error) {
      console.error("Error removing class:", error);
      throw error;
    }
  },
  getTeachersBySubject: async (subject: string): Promise<Teacher[]> => {
    try {
      return await apiGet(`/teachers/subject/${subject}`);
    } catch (error) {
      console.error("Error fetching teachers by subject:", error);
      throw error;
    }
  },
};

export default teacherService;
