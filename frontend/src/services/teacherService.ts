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
  getMyStudents: () => Promise<any[]>;
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
      const response = await apiGet<TeachersListResponse>("/teachers", { limit: 1000 });
      const list = Array.isArray(response?.data) ? response.data : [];
      const teacher = list.find((item) => item.id === id || item._id === id);
      if (!teacher) {
        throw new Error("Teacher not found");
      }
      return teacher;
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
      const teacher = await teacherService.getTeacher(id);
      const existing = Array.isArray(teacher.teacherProfile?.subjects)
        ? teacher.teacherProfile?.subjects || []
        : teacher.subjects || [];
      const next = Array.from(new Set([...existing, subject]));
      await apiPut(`/teachers/${id}`, { subjects: next });
    } catch (error) {
      console.error("Error assigning subject:", error);
      throw error;
    }
  },
  removeSubject: async (id: string, subject: string): Promise<void> => {
    try {
      const teacher = await teacherService.getTeacher(id);
      const existing = Array.isArray(teacher.teacherProfile?.subjects)
        ? teacher.teacherProfile?.subjects || []
        : teacher.subjects || [];
      const next = existing.filter((item) => item !== subject);
      await apiPut(`/teachers/${id}`, { subjects: next });
    } catch (error) {
      console.error("Error removing subject:", error);
      throw error;
    }
  },
  assignClass: async (id: string, grade: string, section: string): Promise<void> => {
    try {
      const teacher = await teacherService.getTeacher(id);
      const existing: Array<{ grade: string; section?: string; stream?: string }> = Array.isArray(
        teacher.teacherProfile?.classes,
      )
        ? teacher.teacherProfile?.classes || []
        : teacher.classes || [];
      const key = `${grade}:${section}`;
      const dedup = new Map(existing.map((item) => [`${item.grade}:${item.section || item.stream || ""}`, item]));
      dedup.set(key, { grade, section });
      await apiPut(`/teachers/${id}`, { classes: Array.from(dedup.values()) });
    } catch (error) {
      console.error("Error assigning class:", error);
      throw error;
    }
  },
  removeClass: async (id: string, grade: string, section: string): Promise<void> => {
    try {
      const teacher = await teacherService.getTeacher(id);
      const existing: Array<{ grade: string; section?: string; stream?: string }> = Array.isArray(
        teacher.teacherProfile?.classes,
      )
        ? teacher.teacherProfile?.classes || []
        : teacher.classes || [];
      const next = existing.filter(
        (item) => !(item.grade === grade && (item.section || item.stream || "") === section),
      );
      await apiPut(`/teachers/${id}`, { classes: next });
    } catch (error) {
      console.error("Error removing class:", error);
      throw error;
    }
  },
  getTeachersBySubject: async (subject: string): Promise<Teacher[]> => {
    try {
      const response = await apiGet<TeachersListResponse>("/teachers", { subject, limit: 1000 });
      return response?.data || [];
    } catch (error) {
      console.error("Error fetching teachers by subject:", error);
      throw error;
    }
  },
  getMyStudents: async (): Promise<any[]> => {
    try {
      const response = await apiGet<{ success: boolean; data: any[] }>("/teachers/students");
      return response?.data || [];
    } catch (error) {
      console.error("Error fetching teacher's students:", error);
      throw error;
    }
  },
};

export default teacherService;
