import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Avatar,
} from "@mui/material";
import {
  Add,
  People,
  FileDownload,
  Upload,
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Person,
  Link as LinkIcon,
  LinkOff,
  SupervisedUserCircle,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormModal } from "@/components/ui/FormModal";
import type { FormField } from "@/components/ui/FormModal";
import { TableEmptyState } from "@/components/ui/EmptyState";
import { TableLoading } from "@/components/ui/LoadingSpinner";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CreateStudentWizard } from "@/components/students/CreateStudentWizard";
import { studentService } from "@/services/studentService";
import { parentService, type Parent } from "@/services/parentService";
import type {
  Student,
  CreateStudentData,
  AcademicDocument,
} from "@/services/studentService";
import { useAuthStore } from "@/stores/authStore";
import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useBulkUploadStudents,
  useLinkParent,
  useUnlinkParent,
} from "@/hooks/students/useStudents";
import { useParents } from "@/hooks/parents/useParents";
import { GRADES, STREAMS } from "@/constants/academic";

const ACADEMIC_DOC_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ACADEMIC_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const getStudentGrade = (student: Student | null | undefined): string => {
  const rawGrade =
    (student as any)?.grade ?? (student as any)?.studentProfile?.grade ?? "";
  return String(rawGrade).replace(/^Grade\s+/i, "").trim();
};

const getStudentStream = (student: Student | null | undefined): string => {
  return (
    (student as any)?.stream ??
    (student as any)?.studentProfile?.stream ??
    (student as any)?.section ??
    (student as any)?.studentProfile?.section ??
    ""
  );
};

const getStudentEnrollmentValue = (
  student: Student | null | undefined,
): string => {
  return (
    (student as any)?.enrollmentDate ??
    (student as any)?.studentProfile?.enrollmentDate ??
    (student as any)?.studentProfile?.admissionDate ??
    (student as any)?.studentProfile?.academicYear ??
    (student as any)?.createdAt ??
    ""
  );
};

const getStudentGender = (student: Student | null | undefined): string => {
  return (student as any)?.gender ?? (student as any)?.studentProfile?.gender ?? "";
};

const getStudentFirstName = (student: Student | null | undefined): string => {
  return String((student as any)?.firstName ?? "").trim();
};

const getStudentLastName = (student: Student | null | undefined): string => {
  return String((student as any)?.lastName ?? "").trim();
};

const getStudentDob = (student: Student | null | undefined): string => {
  const dob = (student as any)?.dob ?? (student as any)?.studentProfile?.dateOfBirth ?? "";
  if (!dob) return "";
  const date = new Date(String(dob));
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const getStudentAddress = (
  student: Student | null | undefined,
): { street: string; city: string; region: string } => {
  const rootAddress = (student as any)?.address ?? {};
  const profileAddress = (student as any)?.studentProfile?.homeAddress ?? {};
  return {
    street: rootAddress.street ?? profileAddress.street ?? "",
    city: rootAddress.city ?? profileAddress.city ?? "",
    region: rootAddress.region ?? profileAddress.state ?? "",
  };
};

const getStudentEmergencyContact = (
  student: Student | null | undefined,
): { name: string; phone: string; relationship: string } => {
  const rootEmergency = (student as any)?.emergencyContact ?? {};
  const profileEmergency = (student as any)?.studentProfile?.emergencyContact ?? {};
  return {
    name: rootEmergency.name ?? profileEmergency.name ?? "",
    phone: rootEmergency.phone ?? profileEmergency.phone ?? "",
    relationship: rootEmergency.relationship ?? profileEmergency.relationship ?? "",
  };
};

const getStudentAcademicDocuments = (
  student: Student | null | undefined,
): AcademicDocument[] => {
  const documents = (student as any)?.studentProfile?.academicDocuments;
  return Array.isArray(documents) ? documents : [];
};

const formatBytes = (bytes?: number): string => {
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const escapeCsvValue = (value: unknown): string => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

type PendingAcademicDocumentUpload = {
  localId: string;
  category: "Grade 8 Ministry Result" | "Previous Grade Report";
  title: string;
  file: File;
};

const getAcademicDocumentId = (document: AcademicDocument): string =>
  String((document as any)?._id || "").trim();

const normalizeStudentFormPayload = (
  values: Record<string, unknown>,
): Record<string, unknown> => {
  const grade = String(values.grade || "").trim();
  const rawStream = String(values.stream || "").trim();
  const stream =
    grade === "11" || grade === "12" ? rawStream || undefined : undefined;

  const address = {
    street: String(values["address.street"] || "").trim(),
    city: String(values["address.city"] || "").trim(),
    region: String(values["address.region"] || "").trim(),
  };

  const emergencyContact = {
    name: String(values["emergencyContact.name"] || "").trim(),
    phone: String(values["emergencyContact.phone"] || "").trim(),
    relationship: String(values["emergencyContact.relationship"] || "").trim(),
  };

  return {
    firstName: String(values.firstName || "").trim(),
    lastName: String(values.lastName || "").trim(),
    email: String(values.email || "").trim() || undefined,
    phone: String(values.phone || "").trim() || undefined,
    gender: values.gender,
    dob: String(values.dob || "").trim(),
    grade,
    stream,
    enrollmentDate: String(values.enrollmentDate || "").trim(),
    address:
      address.street || address.city || address.region ? address : undefined,
    emergencyContact:
      emergencyContact.name ||
      emergencyContact.phone ||
      emergencyContact.relationship
        ? emergencyContact
        : undefined,
  };
};

const validateStudentFormPayload = (
  payload: Record<string, unknown>,
): string | null => {
  if (!payload.firstName || !payload.lastName) {
    return "First name and last name are required";
  }

  if (!payload.gender) {
    return "Gender is required";
  }

  if (!payload.dob) {
    return "Date of birth is required";
  }

  if (!payload.grade) {
    return "Grade is required";
  }

  if (!payload.enrollmentDate) {
    return "Enrollment date is required";
  }

  const grade = String(payload.grade);
  const stream = String(payload.stream || "");

  if ((grade === "11" || grade === "12") && !stream) {
    return "Stream is required for Grade 11 and Grade 12 students";
  }

  if (grade !== "11" && grade !== "12" && stream) {
    return "Stream should only be set for Grade 11 and Grade 12 students";
  }

  return null;
};

const normalizeGradeValue = (value: unknown) =>
  String(value || "")
    .replace(/^Grade\s+/i, "")
    .trim();

export function StudentListPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const isViewOnly = user?.role === "Teacher";

  // Teacher-specific assigned classes
  const assignedClasses = useMemo(() => {
    if (!isViewOnly) return [];
    const classes = (user as any)?.teacherProfile?.classes || [];
    const unique = new Map<string, { grade: string; stream?: string }>();
    classes.forEach((entry: any) => {
      const grade = String(entry?.grade || "").trim();
      if (!grade) return;
      const stream = String(entry?.stream || entry?.section || "").trim() || undefined;
      unique.set(`${grade}:${stream || ""}`, { grade, stream });
    });
    return Array.from(unique.values());
  }, [user, isViewOnly]);

  // State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    grade: "",
    stream: "",
    status: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkParentDialogOpen, setLinkParentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadAnchor, setUploadAnchor] = useState<null | HTMLElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<
    Record<string, HTMLElement | null>
  >({});
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [draftAcademicDocuments, setDraftAcademicDocuments] = useState<AcademicDocument[]>([]);
  const [pendingDocumentUploads, setPendingDocumentUploads] = useState<
    PendingAcademicDocumentUpload[]
  >([]);
  const [deletedAcademicDocumentIds, setDeletedAcademicDocumentIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Use TanStack Query hooks
  const { data: studentsData, isLoading: isLoadingStudents } = useStudents({
    page: page + 1,
    limit: isViewOnly && assignedClasses.length > 0 ? 1000 : rowsPerPage,
    search: search || undefined,
    grade: isViewOnly && assignedClasses.length === 1 ? assignedClasses[0].grade : (filters.grade || undefined),
    stream: isViewOnly && assignedClasses.length === 1 ? assignedClasses[0].stream : (filters.stream || undefined),
    status: filters.status || undefined,
  });

  const { data: parentsData } = useParents({ limit: 100 });

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const bulkUpload = useBulkUploadStudents();
  const linkParent = useLinkParent();
  const unlinkParent = useUnlinkParent();

  const allStudents = studentsData?.data ?? [];
  const total = studentsData?.pagination?.total ?? 0;
  const parents: Parent[] = parentsData?.data ?? [];

  // Filter students by teacher's assigned classes (client-side for multi-class teachers)
  const filteredStudents = useMemo(() => {
    if (!isViewOnly || assignedClasses.length === 0) return allStudents;
    
    return allStudents.filter((student: any) => {
      const studentGrade = normalizeGradeValue(student?.studentProfile?.grade || student?.grade || "");
      const studentStream = String(student?.studentProfile?.stream || student?.stream || "").trim();
      
      return assignedClasses.some((cls) => {
        if (studentGrade !== normalizeGradeValue(cls.grade)) return false;
        if (cls.stream && studentStream !== cls.stream) return false;
        if (!cls.stream && studentStream) return false;
        return true;
      });
    });
  }, [allStudents, assignedClasses, isViewOnly]);

  // Paginate filtered results for teachers
  const students = useMemo(() => {
    if (!isViewOnly || assignedClasses.length === 0) return filteredStudents;
    
    const startIndex = page * rowsPerPage;
    return filteredStudents.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredStudents, page, rowsPerPage, isViewOnly, assignedClasses]);

  // Adjust total count for teachers
  const displayTotal = isViewOnly && assignedClasses.length > 0 ? filteredStudents.length : total;

  // Fetch linked parents for a student (on-demand)
  const [linkedParents, setLinkedParents] = useState<Parent[]>([]);

  const fetchLinkedParents = async (studentId: string) => {
    try {
      const response = await parentService.getParentByStudent(studentId);
      setLinkedParents(
        Array.isArray(response) ? response : [response].filter(Boolean),
      );
    } catch {
      setLinkedParents([]);
    }
  };

  // Table columns
  const columns: Column<Student>[] = useMemo(
    () => [
      {
        id: "firstName",
        label: t('pages.dashboard.students'),
        format: (_, row) => {
          const firstName = getStudentFirstName(row);
          const lastName = getStudentLastName(row);
          const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || "?";

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                {initials}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {[firstName, lastName].filter(Boolean).join(" ") || "Unnamed Student"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {row.studentId || row.id || row._id || "N/A"}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        id: "grade",
        label: t('pages.dashboard.classes'),
        format: (_, row) => (
          <Box>
            <Typography variant="body2">Grade {getStudentGrade(row) || "-"}</Typography>
            {getStudentStream(row) && (
              <Typography variant="caption" color="text.secondary">
                {getStudentStream(row)}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: "gender",
        label: t('pages.dashboard.gender'),
        format: (_, row) => (
          <Chip
            label={row.studentProfile?.gender || row.gender || "-"}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
        ),
      },
      {
        id: "status",
        label: t('common.status'),
        format: (value) => {
          const statusColors: Record<
            string,
            "success" | "warning" | "error" | "info"
          > = {
            active: "success",
            inactive: "warning",
            transferred: "info",
            graduated: "error",
          };
          return (
            <Chip
              label={value}
              size="small"
              sx={{
                backgroundColor: alpha(
                  theme.palette[statusColors[value] || "info"].main,
                  0.1,
                ),
                color: theme.palette[statusColors[value] || "info"].main,
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            />
          );
        },
      },
      {
        id: "parents",
        label: t('dashboard.parents'),
        format: (_, row) => {
          const parentCount = row.studentProfile?.linkedParents?.length || row.parentIds?.length || 0;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <SupervisedUserCircle fontSize="small" color="action" />
              <Typography variant="body2">{parentCount} linked</Typography>
            </Box>
          );
        },
      },
      {
        id: "enrollmentDate",
        label: t('pages.dashboard.enrollmentDate'),
        format: (_, row) => {
          const value = getStudentEnrollmentValue(row);
          if (!value || value === "Invalid Date") return "-";
          const date = new Date(String(value));
          if (isNaN(date.getTime()) && /^\d{4}-\d{4}$/.test(String(value))) {
            return value;
          }
          return isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
        },
      },
    ],
    [theme],
  );

  // Form fields
  const formFields: FormField[] = [
    { name: "firstName", label: t('pages.dashboard.firstName'), type: "text", required: true },
    { name: "lastName", label: t('pages.dashboard.lastName'), type: "text", required: true },
    { name: "email", label: t('common.email'), type: "email" },
    { name: "phone", label: t('pages.dashboard.phone'), type: "text" },
    {
      name: "gender",
      label: t('pages.dashboard.gender'),
      type: "select",
      required: true,
      options: [
        { value: "Male", label: t('pages.dashboard.male') },
        { value: "Female", label: t('pages.dashboard.female') },
      ],
    },
    { name: "dob", label: t('pages.dashboard.dateOfBirth'), type: "date", required: true },
    {
      name: "grade",
      label: t('pages.dashboard.grade'),
      type: "select",
      required: true,
      options: GRADES.map((g) => ({ value: g, label: `Grade ${g}` })),
    },
    {
      name: "stream",
      label: t('pages.dashboard.stream'),
      type: "select",
      required: false,
      options: [
        { value: STREAMS.NATURAL, label: STREAMS.NATURAL },
        { value: STREAMS.SOCIAL, label: STREAMS.SOCIAL },
      ],
      helperText: "Required for Grade 11-12 only",
    },
    {
      name: "enrollmentDate",
      label: t('pages.dashboard.enrollmentDate'),
      type: "date",
      required: true,
    },
    {
      name: "address.street",
      label: t('common.address'),
      type: "text",
    },
    { name: "address.city", label: "City", type: "text" },
    { name: "address.region", label: "Region", type: "text" },
    {
      name: "emergencyContact.name",
      label: t('common.emergencyContact'),
      type: "text",
    },
    {
      name: "emergencyContact.phone",
      label: t('common.phone'),
      type: "text",
    },
    {
      name: "emergencyContact.relationship",
      label: t('common.relationship'),
      type: "select",
      options: [
        { value: "Father", label: "Father" },
        { value: "Mother", label: "Mother" },
        { value: "Guardian", label: "Guardian" },
        { value: "Other", label: "Other" },
      ],
    },
  ];

  const initialValues = selectedStudent
    ? {
        ...((): Record<string, string> => {
          const address = getStudentAddress(selectedStudent);
          const emergencyContact = getStudentEmergencyContact(selectedStudent);
          return {
            "address.street": address.street,
            "address.city": address.city,
            "address.region": address.region,
            "emergencyContact.name": emergencyContact.name,
            "emergencyContact.phone": emergencyContact.phone,
            "emergencyContact.relationship": emergencyContact.relationship,
          };
        })(),
        firstName: selectedStudent.firstName,
        lastName: selectedStudent.lastName,
        email: selectedStudent.email || "",
        phone: selectedStudent.phone || "",
        gender: getStudentGender(selectedStudent),
        dob: getStudentDob(selectedStudent),
        grade: getStudentGrade(selectedStudent),
        stream: getStudentStream(selectedStudent),
        enrollmentDate: (() => {
          const rawEnrollment = getStudentEnrollmentValue(selectedStudent);
          const parsedEnrollment = rawEnrollment ? new Date(rawEnrollment) : null;
          if (parsedEnrollment && !isNaN(parsedEnrollment.getTime())) {
            return parsedEnrollment.toISOString().split("T")[0];
          }
          return selectedStudent.createdAt?.split?.("T")?.[0] ||
            new Date().toISOString().split("T")[0];
        })(),
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        dob: "",
        grade: "",
        stream: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
        "address.street": "",
        "address.city": "",
        "address.region": "",
        "emergencyContact.name": "",
        "emergencyContact.phone": "",
        "emergencyContact.relationship": "",
      };

  // Handlers
  const handleAdd = () => {
    setCreateWizardOpen(true);
  };

  const handleEdit = (student: Student) => {
    setIsViewMode(false);
    const freshStudent = students.find(
      (s: any) => (s._id || s.id) === ((student as any)._id || student.id),
    );
    setSelectedStudent((freshStudent as Student) || student);
    setFormModalOpen(true);
  };

  const handleDelete = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleView = (student: Student) => {
    setIsViewMode(true);
    const freshStudent = students.find(
      (s: any) => (s._id || s.id) === ((student as any)._id || student.id),
    );
    setSelectedStudent((freshStudent as Student) || student);
    setFormModalOpen(true);
  };

  const handleLinkParent = (student: Student) => {
    setSelectedStudent(student);
    fetchLinkedParents(student.id);
    setLinkParentDialogOpen(true);
  };

  const handleUnlinkParent = async (parentId: string) => {
    if (!selectedStudent) return;
    try {
      await unlinkParent.mutateAsync({
        studentId: selectedStudent.id,
        parentId,
      });
      fetchLinkedParents(selectedStudent.id);
    } catch {
      // Error already handled by hook
    }
  };

  const handleLinkParentSubmit = async () => {
    if (!selectedStudent || !selectedParentId) {
      toast.error("Please select a parent");
      return;
    }
    try {
      await linkParent.mutateAsync({
        studentId: selectedStudent._id || selectedStudent.id,
        parentId: selectedParentId,
      });
      setLinkParentDialogOpen(false);
      setSelectedParentId("");
      fetchLinkedParents(selectedStudent._id || selectedStudent.id);
    } catch {
      // Error already handled by hook
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    if (isViewMode) return;
    setIsSubmitting(true);
    try {
      const payload = normalizeStudentFormPayload(values);
      const validationError = validateStudentFormPayload(payload);

      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (selectedStudent) {
        // Use _id or id, whichever is available
        const studentId = selectedStudent._id || selectedStudent.id;
        await updateStudent.mutateAsync({
          id: studentId,
          data: {
            ...(payload as any),
            academicDocumentsToAdd: pendingDocumentUploads.map((entry) => ({
              category: entry.category,
              title: entry.title,
              file: entry.file,
            })),
            academicDocumentIdsToDelete: deletedAcademicDocumentIds,
          },
        });
      } else {
        await createStudent.mutateAsync(payload as any);
      }
      setFormModalOpen(false);
      setPendingDocumentUploads([]);
      setDeletedAcademicDocumentIds([]);
      setDraftAcademicDocuments([]);
    } catch {
      // Error already handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStudentSubmit = async (payload: CreateStudentData) => {
    setIsSubmitting(true);
    try {
      await createStudent.mutateAsync(payload);
      setCreateWizardOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudent) return;
    try {
      const studentId = selectedStudent._id || selectedStudent.id;
      await deleteStudent.mutateAsync(studentId);
      setDeleteDialogOpen(false);
    } catch {
      // Error already handled by hook
    }
  };

  const parseCSV = (
    text: string,
  ): Array<{
    firstName: string;
    lastName: string;
    email: string;
    grade?: string;
    stream?: string;
  }> => {
    const parseCSVLine = (line: string): string[] => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
          continue;
        }

        current += char;
      }

      cells.push(current.trim());
      return cells;
    };

    const normalizeHeader = (header: string): string =>
      header.toLowerCase().trim().replace(/_/g, " ").replace(/\s+/g, " ");

    const pick = (row: Record<string, string>, keys: string[]): string => {
      for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value.trim() !== "") {
          return value.trim();
        }
      }
      return "";
    };

    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (lines.length < 2) return [];
    const headers = parseCSVLine(lines[0]).map(normalizeHeader);

    const rows: Array<{
      firstName: string;
      lastName: string;
      email: string;
      grade?: string;
      stream?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((h, j) => {
        row[h] = (values[j] || "").trim();
      });

      const firstName = pick(row, ["first name", "firstname"]);
      const lastName = pick(row, ["last name", "lastname"]);
      const email = pick(row, ["email", "email address"]);
      const grade = pick(row, ["grade", "grade level", "class"]);
      const stream = pick(row, ["stream", "section"]);

      const isEmptyRow = !firstName && !lastName && !email && !grade && !stream;
      if (isEmptyRow) continue;

      rows.push({
        firstName,
        lastName,
        email,
        grade: grade || undefined,
        stream: stream || undefined,
      });
    }

    return rows;
  };

  const handleBulkUpload = async (file: File) => {
    try {
      const text = await file.text();
      const students = parseCSV(text);
      if (students.length === 0) {
        toast.error("No valid student rows found in CSV");
        return;
      }
      const result = await bulkUpload.mutateAsync({
        students,
        defaultGrade: "Grade 9",
        defaultStream: undefined,
      });
      if (result.failed > 0) {
        toast(`${result.successCount} uploaded, ${result.failed} failed`, {
          icon: "⚠️",
        });
      } else {
        toast.success(`${result.successCount} students uploaded successfully`);
      }
    } catch {
      // Error already handled by hook
    }
  };

  // Stats
  const stats = useMemo(
    () => ({
      total,
      active: students.filter((s) => s.status === "active").length,
      grades: [...new Set(students.map((s) => getStudentGrade(s)).filter(Boolean))]
        .length,
    }),
    [students, total],
  );

  const handleExportStudents = () => {
    setExporting(true);
    try {
      const rows = students.map((student) => ({
        studentId: student.studentId || student.id || student._id || "",
        firstName: getStudentFirstName(student),
        lastName: getStudentLastName(student),
        email: student.email || "",
        phone: student.phone || "",
        grade: getStudentGrade(student),
        stream: getStudentStream(student),
        gender: getStudentGender(student),
        status: student.status || "",
        linkedParents:
          student.studentProfile?.linkedParents?.length || student.parentIds?.length || 0,
      }));

      const header = [
        "Student ID",
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Grade",
        "Stream",
        "Gender",
        "Status",
        "Linked Parents",
      ];

      const csvContent = [
        header.join(","),
        ...rows.map((row) =>
          [
            row.studentId,
            row.firstName,
            row.lastName,
            row.email,
            row.phone,
            row.grade,
            row.stream,
            row.gender,
            row.status,
            row.linkedParents,
          ]
            .map(escapeCsvValue)
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `students-${filters.grade || "all"}-${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Students exported successfully");
    } catch (error) {
      console.error("Failed to export students:", error);
      toast.error("Failed to export students");
    } finally {
      setExporting(false);
    }
  };

  const selectedStudentAcademicDocuments = useMemo(
    () =>
      selectedStudent && !isViewMode
        ? draftAcademicDocuments
        : getStudentAcademicDocuments(selectedStudent),
    [selectedStudent, isViewMode, draftAcademicDocuments],
  );

  useEffect(() => {
    if (!selectedStudent || isViewMode) return;
    setDraftAcademicDocuments(getStudentAcademicDocuments(selectedStudent));
    setPendingDocumentUploads([]);
    setDeletedAcademicDocumentIds([]);
  }, [selectedStudent, isViewMode]);

  const selectedStudentId = selectedStudent?._id || selectedStudent?.id || "";

  const handlePreviewAcademicDocument = async (document: AcademicDocument) => {
    const documentId = getAcademicDocumentId(document);
    if (selectedStudentId && documentId) {
      try {
        const { blob } = await studentService.downloadAcademicDocument(
          selectedStudentId,
          documentId,
          "inline",
        );
        const objectUrl = window.URL.createObjectURL(blob);
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to preview document";
        toast.error(message);
        return;
      }
    }

    const source = String(document.fileData || document.fileUrl || "").trim();
    if (!source) {
      toast.error("Document preview is not available");
      return;
    }
    window.open(source, "_blank", "noopener,noreferrer");
  };

  const handleDownloadAcademicDocument = async (document: AcademicDocument) => {
    const documentId = getAcademicDocumentId(document);
    if (selectedStudentId && documentId) {
      setDownloadingDoc(documentId);
      try {
        const { blob, filename } = await studentService.downloadAcademicDocument(
          selectedStudentId,
          documentId,
          "attachment",
        );
        const objectUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = objectUrl;
        link.download = filename || `document-${documentId}`;
        link.click();
        window.URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error("Failed to download document:", error);
        toast.error("Failed to download document");
      } finally {
        setDownloadingDoc(null);
      }
    }
  };

  const validateAcademicFile = (file: File): string | null => {
    if (!ALLOWED_ACADEMIC_DOC_TYPES.has(file.type)) {
      return "Only PDF, JPG, PNG, and WEBP files are allowed";
    }
    if (file.size > ACADEMIC_DOC_MAX_SIZE_BYTES) {
      return "Each academic document must be 5 MB or smaller";
    }
    return null;
  };

  const handleAddAcademicDocuments = (
    files: FileList | null,
    category: "Grade 8 Ministry Result" | "Previous Grade Report",
  ) => {
    if (!files || files.length === 0) return;

    const validUploads: PendingAcademicDocumentUpload[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const error = validateAcademicFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      validUploads.push({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category,
        title: file.name.replace(/\.[^.]+$/, ""),
        file,
      });
    }

    if (validUploads.length === 0) return;

    setPendingDocumentUploads((prev) => [...prev, ...validUploads].slice(0, 8));
  };

  const handleRemoveDraftAcademicDocument = (document: AcademicDocument) => {
    const documentId = getAcademicDocumentId(document);
    setDraftAcademicDocuments((prev) =>
      prev.filter((entry) => getAcademicDocumentId(entry) !== documentId),
    );
    if (documentId) {
      setDeletedAcademicDocumentIds((prev) =>
        prev.includes(documentId) ? prev : [...prev, documentId],
      );
    }
  };

  const handleRemovePendingAcademicUpload = (localId: string) => {
    setPendingDocumentUploads((prev) =>
      prev.filter((entry) => entry.localId !== localId),
    );
  };

  // Grades and streams for filters
  const grades = [...GRADES];
  const streams = [STREAMS.NATURAL, STREAMS.SOCIAL];

  // Available parents (not already linked)
  const availableParents = useMemo(() => {
    const linkedIds = linkedParents.map((p: any) => p._id?.toString());
    return parents.filter((p: any) => !linkedIds.includes(p._id?.toString()));
  }, [parents, linkedParents]);

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Reset to first page when search changes
    if (page !== 0) setPage(0);
  };

  return (
    <Box>
      <Breadcrumbs
        items={[{ label: t('pages.dashboard.students'), path: "/dashboard/students" }]}
      />

      <PageHeader
        title={t('pages.dashboard.students') + ' ' + t('common.settings')}
        subtitle={
          isViewOnly
            ? t('common.view') + ' ' + t('pages.dashboard.students')
            : t('common.manage') + ' ' + t('pages.dashboard.students')
        }
        action={
          !isViewOnly ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={(e) => setUploadAnchor(e.currentTarget)}
                sx={{ borderColor: alpha(theme.palette.primary.main, 0.3) }}
              >
                {t('common.import')}
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAdd}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  "&:hover": {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  },
                }}
              >
                Add Student
              </Button>
            </Box>
          ) : undefined
        }
      />

      <CreateStudentWizard
        open={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onSubmit={handleCreateStudentSubmit}
        loading={isSubmitting || createStudent.isPending}
      />

      {/* Upload Menu (hidden for teachers) */}
      {!isViewOnly && (
        <Menu
          anchorEl={uploadAnchor}
          open={Boolean(uploadAnchor)}
          onClose={() => setUploadAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setUploadAnchor(null);
            }}
          >
            <ListItemIcon>
              <FileDownload fontSize="small" />
            </ListItemIcon>
            {t('common.downloadTemplate')}
          </MenuItem>
          <MenuItem component="label">
            <ListItemIcon>
              <Upload fontSize="small" />
            </ListItemIcon>
            {t('common.upload')} CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await handleBulkUpload(file);
                }
                setUploadAnchor(null);
              }}
            />
          </MenuItem>
        </Menu>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Students", value: stats.total, icon: <People /> },
          { label: "Active", value: stats.active, icon: <Person /> },
          { label: "Grades", value: stats.grades, icon: <People /> },
        ].map((stat, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              minWidth: 150,
              p: 2,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.05,
              )} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ color: theme.palette.primary.main }}>{stat.icon}</Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[
          {
            name: "grade",
            label: t('pages.dashboard.grade'),
            options: grades.map((g) => ({ value: g, label: `Grade ${g}` })),
            value: filters.grade,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, grade: value })),
          },
          {
            name: "stream",
            label: t('pages.dashboard.stream'),
            options: streams.map((s) => ({ value: s, label: s })),
            value: filters.stream,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, stream: value })),
          },
          {
            name: "status",
            label: t('common.status'),
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "transferred", label: "Transferred" },
              { value: "graduated", label: "Graduated" },
            ],
            value: filters.status,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, status: value })),
          },
        ]}
        showExport={true}
        onExport={handleExportStudents}
        exporting={exporting}
      />

      {/* Data Table */}
      {isLoadingStudents ? (
        <TableLoading />
      ) : students.length === 0 ? (
        <TableEmptyState searchQuery={search} />
      ) : (
        <DataTable
          columns={columns}
          rows={students}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={displayTotal}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onView={isViewOnly ? undefined : handleView}
          onEdit={isViewOnly ? undefined : handleEdit}
          onDelete={isViewOnly ? undefined : handleDelete}
          menuItems={
            isViewOnly
              ? undefined
              : (row: Student) => (
                  <MenuItem
                    key="link-parent"
                    onClick={() => handleLinkParent(row)}
                  >
                    <ListItemIcon>
                      <LinkIcon fontSize="small" />
                    </ListItemIcon>
                    Link Parent
                  </MenuItem>
                )
          }
        />
      )}

      {/* Form Modal */}
      <FormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setIsViewMode(false);
          setPendingDocumentUploads([]);
          setDeletedAcademicDocumentIds([]);
          setDraftAcademicDocuments([]);
        }}
        title={
          isViewMode
            ? "Student Details"
            : selectedStudent
              ? "Edit Student"
              : "Add New Student"
        }
        fields={formFields}
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        loading={isSubmitting}
        readOnly={isViewMode}
      >
        {selectedStudent && (
          <Box
            sx={{
              mt: 1,
              p: 2,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Academic Documents
            </Typography>

            {selectedStudentAcademicDocuments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {isViewMode
                  ? "No academic documents uploaded for this student."
                  : "No kept academic documents. Upload new files below."}
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {selectedStudentAcademicDocuments.map((document, index) => (
                  <Box
                    key={`${document.fileName || document.title || document.category}-${index}`}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {document.title || document.fileName || document.category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {document.category}
                        {document.fileType ? ` • ${document.fileType}` : ""}
                        {document.fileSize ? ` • ${formatBytes(document.fileSize)}` : ""}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      {!isViewMode && (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<Delete fontSize="small" />}
                          onClick={() => handleRemoveDraftAcademicDocument(document)}
                        >
                          Remove
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility fontSize="small" />}
                        onClick={() => handlePreviewAcademicDocument(document)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileDownload fontSize="small" />}
                        onClick={() => handleDownloadAcademicDocument(document)}
                        disabled={downloadingDoc === getAcademicDocumentId(document)}
                      >
                        {downloadingDoc === getAcademicDocumentId(document) ? "Downloading..." : "Download"}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {!isViewMode && (
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Add New Documents
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button component="label" size="small" variant="outlined" startIcon={<Upload />}>
                    Add Grade 8 Result
                    <input
                      hidden
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(event) => {
                        handleAddAcademicDocuments(
                          event.target.files,
                          "Grade 8 Ministry Result",
                        );
                        event.target.value = "";
                      }}
                    />
                  </Button>
                  <Button component="label" size="small" variant="outlined" startIcon={<Upload />}>
                    Add Previous Report
                    <input
                      hidden
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(event) => {
                        handleAddAcademicDocuments(
                          event.target.files,
                          "Previous Grade Report",
                        );
                        event.target.value = "";
                      }}
                    />
                  </Button>
                </Box>

                {pendingDocumentUploads.length > 0 && (
                  <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    {pendingDocumentUploads.map((upload) => (
                      <Box
                        key={upload.localId}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {upload.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {upload.category} • {formatBytes(upload.file.size)}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          onClick={() => handleRemovePendingAcademicUpload(upload.localId)}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Student"
        message={`Are you sure you want to delete ${selectedStudent?.firstName} ${selectedStudent?.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
      />

      {/* Link Parent Dialog */}
      <Dialog
        open={linkParentDialogOpen}
        onClose={() => setLinkParentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Link Parent to Student
          {selectedStudent && (
            <Typography variant="subtitle2" color="text.secondary">
              {selectedStudent.firstName} {selectedStudent.lastName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Linked Parents Section */}
            {linkedParents.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Currently Linked Parents
                </Typography>
                <List dense>
                  {linkedParents.map((parent: any) => (
                    <ListItem
                      key={parent._id}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleUnlinkParent(parent._id)}
                        >
                          <LinkOff fontSize="small" color="error" />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {parent.firstName?.charAt(0)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={`${parent.firstName} ${parent.lastName}`}
                        secondary={parent.parentProfile?.relationship}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Link New Parent Section */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Link a New Parent
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Select Parent</InputLabel>
              <Select
                value={selectedParentId}
                label="Select Parent"
                onChange={(e) => setSelectedParentId(e.target.value)}
              >
                {availableParents.map((parent: any) => (
                  <MenuItem key={parent._id} value={parent._id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24 }}>
                        {parent.firstName?.charAt(0)}
                      </Avatar>
                      {parent.firstName} {parent.lastName}
                      {parent.parentProfile?.relationship && ` (${parent.parentProfile.relationship})`}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {availableParents.length === 0 && linkedParents.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                All available parents are already linked to this student.
              </Typography>
            )}

            {availableParents.length === 0 && linkedParents.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No parents available. Please create a parent first.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkParentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLinkParentSubmit}
            disabled={!selectedParentId}
          >
            Link Parent
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StudentListPage;
