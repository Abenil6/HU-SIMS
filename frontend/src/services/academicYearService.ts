import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import { debug } from "@/lib/debug";

export interface Semester {
  name: string;
  startDate: string;
  endDate: string;
  examPeriodStart?: string;
  examPeriodEnd?: string;
  resultDate?: string;
}

export interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  semesters: Semester[];
  isActive: boolean;
  status: "Planning" | "Active" | "Completed";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const academicYearService = {
  // Get all academic years
  getAcademicYears: async (params?: {
    status?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => {
    debug.academicYear('Fetching academic years with params:', params);
    const response = await apiGet("/academic-years", params);
    debug.academicYear('Response:', response);
    return response;
  },

  // Get active academic year
  getActiveAcademicYear: async () => {
    debug.academicYear('Fetching active academic year');
    const response = await apiGet("/academic-years/active");
    debug.academicYear('Response:', response);
    return response;
  },

  // Get academic year by ID
  getAcademicYearById: async (id: string) => {
    debug.academicYear('Fetching academic year by ID:', id);
    const response = await apiGet(`/academic-years/${id}`);
    debug.academicYear('Response:', response);
    return response;
  },

  // Create new academic year
  createAcademicYear: async (data: Partial<AcademicYear>) => {
    debug.academicYear('Creating academic year:', data);
    const response = await apiPost("/academic-years", data);
    debug.academicYear('Created:', response);
    return response;
  },

  // Update academic year
  updateAcademicYear: async (id: string, data: Partial<AcademicYear>) => {
    debug.academicYear('Updating academic year:', id, data);
    const response = await apiPut(`/academic-years/${id}`, data);
    debug.academicYear('Updated:', response);
    return response;
  },

  // Delete academic year
  deleteAcademicYear: async (id: string) => {
    debug.academicYear('Deleting academic year:', id);
    const response = await apiDelete(`/academic-years/${id}`);
    debug.academicYear('Deleted:', response);
    return response;
  },

  // Set academic year as active
  setAsActive: async (id: string) => {
    debug.academicYear('Setting academic year as active:', id);
    const response = await apiPut(`/academic-years/${id}/activate`);
    debug.academicYear('Activated:', response);
    return response;
  },

  // Update semester details
  updateSemester: async (id: string, semesterName: string, data: Partial<Semester>) => {
    debug.academicYear('Updating semester:', id, semesterName, data);
    const response = await apiPut(`/academic-years/${id}/semester/${semesterName}`, data);
    debug.academicYear('Semester updated:', response);
    return response;
  },
};

export default academicYearService;
