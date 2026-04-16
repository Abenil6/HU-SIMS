import { apiGet, apiGetBlob, apiPost, apiPut, apiDelete, apiUpload, apiUploadPut } from "./api";

export interface AcademicDocument {
  _id?: string;
  category: "Grade 8 Ministry Result" | "Previous Grade Report";
  title?: string;
  fileName: string;
  storageKey?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  // Legacy fallback for older records before filesystem storage migration
  fileData?: string;
  uploadedAt?: string;
}

export interface CreateAcademicDocumentInput {
  category: "Grade 8 Ministry Result" | "Previous Grade Report";
  title?: string;
  file: File;
}

// Types
export interface Student {
  id: string;
  _id?: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  gender: "Male" | "Female";
  dob: string;
  grade: string;
  stream?: string; // Only for Grade 11-12
  enrollmentDate: string;
  status: "active" | "inactive" | "transferred" | "graduated";
  parentIds: string[];
  address?: {
    street?: string;
    city?: string;
    region?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  studentProfile?: {
    gender?: "Male" | "Female";
    grade?: string;
    stream?: string;
    section?: string;
    grandfatherName?: string;
    placeOfBirth?: {
      woreda?: string;
      zone?: string;
      region?: string;
    };
    nationality?: string;
    linkedParents?: string[];
    enrollmentDate?: string;
    admissionDate?: string;
    academicYear?: string;
    enrollmentType?: "New Admission" | "Transfer Student";
    dateOfBirth?: string;
    previousGrades?: string;
    entranceExamResult?: string;
    previousSchool?: {
      name?: string;
      address?: string;
      phone?: string;
    };
    academicDocuments?: AcademicDocument[];
    primaryGuardian?: {
      fullName?: string;
      relationship?: string;
      phone?: string;
      email?: string;
      occupation?: string;
      address?: string;
    };
    secondaryGuardian?: {
      fullName?: string;
      relationship?: string;
      phone?: string;
      email?: string;
      occupation?: string;
      address?: string;
    };
    homeAddress?: {
      street?: string;
      city?: string;
      state?: string;
    };
    emergencyContact?: {
      name?: string;
      phone?: string;
      relationship?: string;
    };
  };
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentData {
  academicDocuments?: CreateAcademicDocumentInput[];
  studentId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  gender: "Male" | "Female";
  dob: string;
  nationality?: string;
  grandfatherName?: string;
  placeOfBirth?: {
    woreda?: string;
    zone?: string;
    region?: string;
  };
  grade: string;
  stream?: string; // Only for Grade 11-12
  enrollmentDate?: string;
  academicYear?: string;
  admissionDate?: string;
  enrollmentType?: "New Admission" | "Transfer Student";
  previousSchool?: {
    name?: string;
    address?: string;
    phone?: string;
  };
  previousGradeCompleted?: string;
  entranceExamResult?: string;
  primaryGuardian?: {
    fullName: string;
    relationship: string;
    phone: string;
    email: string;
    occupation?: string;
    address?: string;
  };
  secondaryGuardian?: {
    fullName?: string;
    relationship?: string;
    phone?: string;
    email?: string;
    occupation?: string;
    address?: string;
  };
  address?: {
    street?: string;
    city?: string;
    region?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
    email?: string;
  };
}

export interface UpdateStudentData extends Partial<CreateStudentData> {
  academicDocumentsToAdd?: CreateAcademicDocumentInput[];
  academicDocumentIdsToDelete?: string[];
  status?: "active" | "inactive" | "transferred" | "graduated";
}

export interface StudentsListResponse {
  success: boolean;
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateStudentResponse {
  success: boolean;
  message?: string;
  data: Student;
}

const normalizeStudent = (student: any): Student => {
  const normalizedId = String(student?.id || student?._id || "");
  const studentProfile = student?.studentProfile || {};

  return {
    ...student,
    id: normalizedId,
    _id: normalizedId,
    studentId: student?.studentId || studentProfile?.studentId,
    grade: student?.grade || studentProfile?.grade,
    stream: student?.stream || studentProfile?.stream || studentProfile?.section,
  };
};

const normalizeStudentsListResponse = (response: StudentsListResponse): StudentsListResponse => ({
  ...response,
  data: Array.isArray(response?.data) ? response.data.map((student) => normalizeStudent(student)) : [],
});

// Student API
export const studentService = {
  // Get all students with pagination and filters
  getStudents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    grade?: string;
    stream?: string;
    status?: string;
  }): Promise<StudentsListResponse> => {
    const response = await apiGet<StudentsListResponse>("/admin/users/students", { ...params, limit: params?.limit || 1000 });
    return normalizeStudentsListResponse(response);
  },

  // Get single student by ID
  getStudent: async (id: string): Promise<Student> => {
    const response = await apiGet<Student>(`/students/${id}`);
    return normalizeStudent(response);
  },

  // Get student by student ID
  getStudentByStudentId: async (studentId: string): Promise<Student> => {
    const response = await apiGet<Student>(`/students/by-student-id/${studentId}`);
    return normalizeStudent(response);
  },

  // Create new student
  createStudent: async (data: CreateStudentData): Promise<CreateStudentResponse> => {
    const uploadedDocuments = Array.isArray(data.academicDocuments)
      ? data.academicDocuments.filter((document): document is CreateAcademicDocumentInput =>
          Boolean((document as CreateAcademicDocumentInput).file)
        )
      : [];

    if (uploadedDocuments.length > 0) {
      const { academicDocuments, ...payload } = data;
      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append(
        "academicDocumentsMeta",
        JSON.stringify(
          uploadedDocuments.map((document) => ({
            category: document.category,
            title:
              document.title ||
              document.file.name.replace(/\.[^.]+$/, ""),
          }))
        )
      );

      uploadedDocuments.forEach((document) => {
        formData.append("academicDocuments", document.file, document.file.name);
      });

      return apiUpload<CreateStudentResponse>("/students", formData);
    }

    return apiPost<CreateStudentResponse>("/students", data);
  },

  // Bulk create students from CSV (parsed data)
  bulkCreateStudents: async (
    students: Array<{ firstName: string; lastName: string; email: string; grade?: string; stream?: string }>,
    defaultGrade?: string,
    defaultStream?: string
  ): Promise<{ successCount: number; failed: number; results: any[] }> => {
    const res = await apiPost<any>("/admin/users/bulk", {
      students,
      defaultGrade,
      defaultStream,
    });
    return {
      successCount: res.successCount ?? 0,
      failed: res.failed ?? 0,
      results: res.results ?? [],
    };
  },

  // Update student
  updateStudent: async (id: string, data: UpdateStudentData): Promise<Student> => {
    const uploadedDocuments = Array.isArray(data.academicDocumentsToAdd)
      ? data.academicDocumentsToAdd.filter((document): document is CreateAcademicDocumentInput =>
          Boolean((document as CreateAcademicDocumentInput).file)
        )
      : [];
    const deleteIds = Array.isArray(data.academicDocumentIdsToDelete)
      ? data.academicDocumentIdsToDelete.filter(Boolean)
      : [];

    if (uploadedDocuments.length > 0 || deleteIds.length > 0) {
      const {
        academicDocumentsToAdd,
        academicDocumentIdsToDelete,
        ...payload
      } = data;

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      formData.append(
        "academicDocumentsMeta",
        JSON.stringify(
          uploadedDocuments.map((document) => ({
            category: document.category,
            title:
              document.title ||
              document.file.name.replace(/\.[^.]+$/, ""),
          }))
        )
      );
      formData.append(
        "academicDocumentIdsToDelete",
        JSON.stringify(deleteIds)
      );

      uploadedDocuments.forEach((document) => {
        formData.append("academicDocuments", document.file, document.file.name);
      });

      return apiUploadPut<Student>(`/students/${id}`, formData);
    }

    return apiPut<Student>(`/students/${id}`, data);
  },

  downloadAcademicDocument: async (
    studentId: string,
    documentId: string,
    disposition: "inline" | "attachment" = "attachment"
  ): Promise<{ blob: Blob; filename?: string; contentType: string }> => {
    const response = await apiGetBlob(
      `/students/${studentId}/academic-documents/${documentId}/download`,
      { disposition }
    );
    return {
      blob: response.blob,
      filename: response.filename,
      contentType: response.contentType,
    };
  },

  // Delete student
  deleteStudent: async (id: string): Promise<void> => {
    return apiDelete(`/students/${id}`);
  },

  // Bulk delete students
  bulkDeleteStudents: async (ids: string[]): Promise<void> => {
    return apiPost("/students/bulk-delete", { ids });
  },

  // Link parent to student
  linkParent: async (studentId: string, parentId: string): Promise<Student> => {
    return apiPost<Student>(`/students/${studentId}/link-parent`, { parentId });
  },

  // Unlink parent from student
  unlinkParent: async (studentId: string, parentId: string): Promise<Student> => {
    return apiDelete(`/students/${studentId}/unlink-parent/${parentId}`);
  },

  // Get students by grade
  getStudentsByGrade: async (grade: string): Promise<Student[]> => {
    return apiGet<Student[]>(`/students/grade/${grade}`);
  },

  // Get students by section (deprecated - no sections in new system)
  getStudentsBySection: async (grade: string, section: string): Promise<Student[]> => {
    // This endpoint is deprecated but kept for backward compatibility
    return apiGet<Student[]>(`/students/grade/${grade}/section/${section}`);
  },

  // Get students by stream
  getStudentsByStream: async (grade: string, stream: string): Promise<Student[]> => {
    return apiGet<Student[]>(`/students/grade/${grade}/stream/${stream}`);
  },

  // Transfer student
  transferStudent: async (
    id: string,
    data: { newGrade: string; newStream?: string; transferDate: string }
  ): Promise<Student> => {
    return apiPost<Student>(`/students/${id}/transfer`, data);
  },

  // Graduate student
  graduateStudent: async (id: string, graduationDate: string): Promise<Student> => {
    return apiPost<Student>(`/students/${id}/graduate`, { graduationDate });
  },

  // Get student academic records
  getAcademicRecords: async (id: string): Promise<any> => {
    return apiGet(`/students/${id}/academic-records`);
  },

  // Get student attendance
  getAttendance: async (
    id: string,
    params?: { startDate?: string; endDate?: string }
  ): Promise<any> => {
    return apiGet(`/students/${id}/attendance`, params);
  },

  // Export students
  exportStudents: async (params?: {
    grade?: string;
    stream?: string;
    status?: string;
  }): Promise<Blob> => {
    return apiGet("/students/export", { ...params, responseType: "blob" }) as unknown as Promise<Blob>;
  },

  // Download student template
  downloadTemplate: async (): Promise<Blob> => {
    return apiGet("/students/template", { responseType: "blob" }) as unknown as Promise<Blob>;
  },
};

export default studentService;
