import { apiGet, apiPost } from "./api";

// Backend-aligned certificate types/statuses
export type CertificateType =
  | "Completion"
  | "Achievement"
  | "Attendance"
  | "GoodConduct"
  | "Transcript"
  | "Transfer"
  | "Character"
  | "Bonafide";

export type CertificateStatus = "Draft" | "Issued" | "Cancelled" | "Replaced";

export interface Certificate {
  _id: string;
  certificateType: CertificateType;
  academicYear: string;
  issuedBy?: { _id: string; firstName?: string; lastName?: string };
  student?: { _id: string; firstName?: string; lastName?: string; email?: string };
  title: string;
  recipientName: string;
  description?: string;
  fatherName?: string;
  motherName?: string;
  completionDetails?: { grade?: string; section?: string; academicPerformance?: string; attendancePercentage?: number };
  transferDetails?: Record<string, unknown>;
  issueDate: string;
  validUntil?: string;
  signedBy?: { name?: string; title?: string };
  certificateNumber?: string;
  verificationCode?: string;
  status: CertificateStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateCertificateData {
  certificateType?: CertificateType;
  studentId: string;
  academicYear: string;
  signerName?: string;
  signerTitle?: string;
  // Transfer-only extras (optional)
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  dateOfAdmission?: string;
  classWhenJoining?: string;
  characterAndConduct?: string;
  reasonForLeaving?: string;
  academicRecord?: string;
  // Manual certificate fields (optional)
  title?: string;
  recipientName?: string;
  description?: string;
  notes?: string;
}

export function getCertificateTypeLabel(type: CertificateType): string {
  return type;
}

export function getCertificateStatusLabel(status: string): string {
  return status;
}

export const certificateService = {
  getCertificates: async (params?: {
    studentId?: string;
    certificateType?: CertificateType;
    status?: CertificateStatus;
    academicYear?: string;
    page?: number;
    limit?: number;
  }): Promise<{ certificates: Certificate[]; pagination?: any }> => {
    const res: any = await apiGet("/certificates", { ...params, limit: params?.limit || 1000 } as any);
    return {
      certificates: (res?.data ?? []) as Certificate[],
      pagination: res?.pagination,
    };
  },

  getCertificate: async (id: string): Promise<Certificate> => {
    const res: any = await apiGet(`/certificates/${id}`);
    return (res?.data ?? res) as Certificate;
  },

  getStudentCertificates: async (studentId: string): Promise<Certificate[]> => {
    const res = await certificateService.getCertificates({ studentId });
    return res.certificates;
  },

  generateCertificate: async (data: GenerateCertificateData): Promise<Certificate> => {
    const type = data.certificateType || "Completion";
    const payload = {
      studentId: data.studentId,
      academicYear: data.academicYear,
      signerName: data.signerName,
      signerTitle: data.signerTitle,
      fatherName: data.fatherName,
      motherName: data.motherName,
      dateOfBirth: data.dateOfBirth,
      dateOfAdmission: data.dateOfAdmission,
      classWhenJoining: data.classWhenJoining,
      characterAndConduct: data.characterAndConduct,
      reasonForLeaving: data.reasonForLeaving,
      academicRecord: data.academicRecord,
    };

    const endpoint =
      type === "Transfer"
        ? "/certificates/generate-transfer"
        : type === "Character"
          ? "/certificates/generate-character"
          : type === "Bonafide"
            ? "/certificates/generate-bonafide"
            : "/certificates/generate-completion";

    const res: any = await apiPost(endpoint, payload as any);
    return (res?.data ?? res) as Certificate;
  },

  createCertificate: async (data: GenerateCertificateData): Promise<Certificate> => {
    const res: any = await apiPost("/certificates", {
      certificateType: data.certificateType || "Completion",
      studentId: data.studentId,
      academicYear: data.academicYear,
      title: data.title || "Certificate",
      recipientName: data.recipientName || "Student",
      description: data.description,
      fatherName: data.fatherName,
      motherName: data.motherName,
      signerName: data.signerName,
      signerTitle: data.signerTitle,
      notes: data.notes,
    });
    return (res?.data ?? res) as Certificate;
  },

  updateCertificate: async (
    _id: string,
    _data: Partial<Certificate>,
  ): Promise<Certificate> => {
    throw new Error("Certificate update is not supported by the backend API.");
  },

  issueCertificate: async (id: string): Promise<Certificate> => {
    const res: any = await apiPost(`/certificates/${id}/issue`, {});
    return (res?.data ?? res) as Certificate;
  },

  deleteCertificate: async (id: string): Promise<Certificate> => {
    // Backend supports cancel (not hard delete)
    const res: any = await apiPost(`/certificates/${id}/cancel`, {
      reason: "Cancelled by admin",
    });
    return (res?.data ?? res) as Certificate;
  },

  downloadCertificate: async (id: string) => {
    // Backend supports export endpoint; frontend can open it directly in the browser
    return apiGet(`/certificates/${id}/export`);
  },

  verifyCertificate: async (certificateNumber: string) => {
    const res: any = await apiPost("/certificates/verify", { certificateNumber });
    return res?.data ?? res;
  },
};

export default certificateService;
