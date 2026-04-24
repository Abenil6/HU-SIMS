import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  alpha,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Download,
  Calculate,
  Assessment,
  TrendingUp,
  TrendingDown,
  MoreVert,
  Edit,
  Delete,
  School,
  InfoOutlined,
  Refresh,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useStudents } from "@/hooks/students/useStudents";
import {
  useAcademicRecords,
  useCreateGrade,
  useUpdateAcademicRecord,
  useDeleteAcademicRecord,
} from "@/hooks/academic/useAcademicRecords";
import {
  type Grade,
  getStatus,
  getGradeColor,
} from "@/services/academicService";
import { academicYearService } from "@/services/academicYearService";
import { useAuthStore } from "@/stores/authStore";

// ─── marks breakdown configuration ─────────────────────────────────────────
const COMPONENTS = [
  {
    key: "midMarks",
    label: "Mid Exam",
    max: 20,
    assessmentType: "mid_exam",
    weight: 0.2,
  },
  {
    key: "finalMarks",
    label: "Final Exam",
    max: 40,
    assessmentType: "final_exam",
    weight: 0.4,
  },
  {
    key: "assignmentMarks",
    label: "Assignment",
    max: 20,
    assessmentType: "assignment",
    weight: 0.2,
  },
  {
    key: "quizMarks",
    label: "Quiz/Test",
    max: 20,
    assessmentType: "test",
    weight: 0.2,
  },
] as const;

type ComponentKey = (typeof COMPONENTS)[number]["key"];

interface MarksState {
  midMarks: string;
  finalMarks: string;
  assignmentMarks: string;
  quizMarks: string;
}

const emptyMarks = (): MarksState => ({
  midMarks: "",
  finalMarks: "",
  assignmentMarks: "",
  quizMarks: "",
});

const normalizeGradeValue = (value: unknown) =>
  String(value || "")
    .replace(/^Grade\s+/i, "")
    .trim();

const normalizeTextValue = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
const normalizeSubjectValue = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const csvEscape = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const normalizeSemesterValue = (value: unknown) => {
  const normalized = String(value || "").trim();
  if (normalized === "1") return "Semester 1";
  if (normalized === "2") return "Semester 2";
  return normalized;
};

/** Only grades 11 and 12 use streams (Natural / Social). */
const gradeRequiresStream = (grade: string) => {
  const n = Number.parseInt(normalizeGradeValue(grade), 10);
  return n === 11 || n === 12;
};

const streamFilterLabel = (stream: string) =>
  stream === "Natural"
    ? "Natural Science"
    : stream === "Social"
      ? "Social Science"
      : stream;

// ─── component ───────────────────────────────────────────────────────────────
export function GradesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const canManageGrades =
    user?.role === "Teacher" ||
    user?.role === "SchoolAdmin" ||
    user?.role === "SystemAdmin";
  const isTeacher = user?.role === "Teacher";

  // Teacher-specific profile data
  const teacherProfile = (user as any)?.teacherProfile;

  const teacherSubjects: string[] = useMemo(() => {
    const subjects = Array.isArray(teacherProfile?.subjects)
      ? teacherProfile.subjects
      : [];
    const singular = teacherProfile?.subject ? [teacherProfile.subject] : [];
    return [
      ...new Set(
        [...subjects, ...singular]
          .map((subject) => String(subject || "").trim())
          .filter(Boolean),
      ),
    ];
  }, [user]);
  const defaultTeacherSubject = teacherSubjects[0] || "";
  const assignedClasses: { grade: string; stream?: string }[] = useMemo(() => {
    const raw = teacherProfile?.classes;
    if (!Array.isArray(raw)) return [];
    const unique = new Map<string, { grade: string; stream?: string }>();
    raw.forEach((entry: any) => {
      const grade = String(entry?.grade || "").trim();
      if (!grade) return;
      const g = normalizeGradeValue(grade);
      const streamRaw =
        String(entry?.stream || entry?.section || "").trim() || undefined;
      const stream = gradeRequiresStream(g) ? streamRaw : undefined;
      unique.set(`${g}::${stream || ""}`, { grade: g, stream });
    });
    return Array.from(unique.values());
  }, [user]);

  const [filters, setFilters] = useState({
    grade: "",
    stream: "",
    subject: "",
    assessmentType: "",
    semester: "",
    academicYear: "",
    selectedStudentId: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState("2025-2026");

  // ── custom dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [studentGradesOpen, setStudentGradesOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formSubject, setFormSubject] = useState(defaultTeacherSubject);
  const [formSemester, setFormSemester] = useState("1");
  const [formGrade, setFormGrade] = useState("");
  const [formStream, setFormStream] = useState("");
  const [marks, setMarks] = useState<MarksState>(emptyMarks());
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    academicYearService
      .getActiveAcademicYear()
      .then((response: any) => {
        if (cancelled) return;
        const payload = response?.data ?? response;
        const year = String(payload?.year || "").trim();
        if (!year) return;
        setActiveAcademicYear(year);
      })
      .catch((error) => {
        // If no active academic year is found (404), default to 2025-2026
        if (error?.response?.status === 404) {
          setActiveAcademicYear("2025-2026");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync formSubject whenever user changes (e.g., after refresh)
  useEffect(() => {
    setFormSubject(defaultTeacherSubject);
  }, [defaultTeacherSubject]);

  useEffect(() => {
    if (!filters.grade || !gradeRequiresStream(filters.grade)) {
      setFilters((p) => (p.stream ? { ...p, stream: "" } : p));
    }
  }, [filters.grade]);

  // ── fetch all students, then filter to assigned classes for teachers ──
  const { data: studentsData } = useStudents({
    limit: 1000,
  });

  const allStudents: any[] = useMemo(
    () =>
      Array.isArray((studentsData as any)?.data)
        ? (studentsData as any).data
        : [],
    [studentsData],
  );

  const scopedStudents: any[] = useMemo(() => {
    if (!isTeacher || assignedClasses.length === 0) return allStudents;
    return allStudents.filter((s: any) => {
      const sGrade = normalizeGradeValue(
        s?.studentProfile?.grade || s?.grade || "",
      );
      const sStream = String(
        s?.studentProfile?.stream || s?.stream || "",
      ).trim();
      return assignedClasses.some((cls) => {
        const clsGrade = normalizeGradeValue(cls.grade);
        if (sGrade !== clsGrade) return false;
        if (gradeRequiresStream(clsGrade) && cls.stream) {
          return normalizeTextValue(sStream) === normalizeTextValue(cls.stream);
        }
        return true;
      });
    });
  }, [allStudents, assignedClasses, isTeacher]);

  // Filter students for the form based on selected grade and stream
  const formFilteredStudents: any[] = useMemo(() => {
    if (!formGrade) return [];
    return scopedStudents.filter((s: any) => {
      const sGrade = normalizeGradeValue(
        s?.studentProfile?.grade || s?.grade || "",
      );
      const sStream = String(
        s?.studentProfile?.stream || s?.stream || "",
      ).trim();
      
      if (sGrade !== normalizeGradeValue(formGrade)) return false;
      
      if (gradeRequiresStream(formGrade) && formStream) {
        return normalizeTextValue(sStream) === normalizeTextValue(formStream);
      }
      
      if (gradeRequiresStream(formGrade) && !formStream) {
        return false;
      }
      
      return true;
    });
  }, [scopedStudents, formGrade, formStream]);

  const studentLookup = useMemo(() => {
    const lookup = new Map<string, any>();

    const register = (key: unknown, student: any) => {
      const normalized = String(key || "").trim();
      if (!normalized || lookup.has(normalized)) return;
      lookup.set(normalized, student);
    };

    allStudents.forEach((student) => {
      register(student?._id, student);
      register(student?.id, student);
      register(student?.studentProfile?.studentId, student);
      register(student?.studentId, student);
      register(student?.username, student);
    });

    return lookup;
  }, [allStudents]);

  // ── fetch all grade records for scope (filter by year / semester / component client-side, like attendance) ──
  const {
    data: recordsData,
    isLoading: isLoadingRecords,
    refetch: refetchGrades,
  } = useAcademicRecords({
    limit: 100,
  });

  const createGrade = useCreateGrade();
  const updateAcademicRecord = useUpdateAcademicRecord();
  const deleteAcademicRecord = useDeleteAcademicRecord();

  const grades: Grade[] = useMemo(() => {
    const records = Array.isArray((recordsData as any)?.data)
      ? (recordsData as any).data
      : [];

    const transformed = records.flatMap((record: any) => {
      const studentRef = record?.student;
      const recordStudent =
        studentRef && typeof studentRef === "object" ? studentRef : {};
      const lookupKeyCandidates = [
        typeof studentRef === "string" ? studentRef : "",
        recordStudent?._id,
        recordStudent?.id,
        record?.studentId,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      const linkedStudent =
        lookupKeyCandidates
          .map((key) => studentLookup.get(key))
          .find(Boolean) || {};

      const studentProfile = {
        ...(linkedStudent?.studentProfile || {}),
        ...(recordStudent?.studentProfile || {}),
      };

      let studentId = "Unknown";
      if (studentProfile?.studentId) {
        studentId = String(studentProfile.studentId);
      } else if (linkedStudent?._id || recordStudent?._id) {
        studentId = String(linkedStudent?._id || recordStudent?._id);
      } else if (linkedStudent?.id || recordStudent?.id) {
        studentId = String(linkedStudent?.id || recordStudent?.id);
      } else if (linkedStudent?.username || recordStudent?.username) {
        studentId = String(linkedStudent?.username || recordStudent?.username);
      } else if (record?.studentId) {
        studentId = String(record.studentId);
      }

      const firstName =
        recordStudent?.firstName || linkedStudent?.firstName || "";
      const lastName = recordStudent?.lastName || linkedStudent?.lastName || "";
      const studentName =
        `${firstName} ${lastName}`.trim() ||
        linkedStudent?.fullName ||
        "Unknown Student";
      const grade = normalizeGradeValue(
        studentProfile?.grade ||
          recordStudent?.grade ||
          linkedStudent?.grade ||
          record?.gradeLevel ||
          "",
      );
      const stream = String(
        studentProfile?.stream ||
          studentProfile?.section ||
          recordStudent?.stream ||
          recordStudent?.section ||
          linkedStudent?.stream ||
          linkedStudent?.section ||
          "",
      ).trim();
      const baseId = String(
        record?._id ||
          record?.id ||
          `${studentId}-${record?.subject || "subject"}`,
      );
      const semester = String(record?.semester || "");
      const academicYear = String(record?.academicYear || "");
      const subject = String(record?.subject || "");

      return COMPONENTS.flatMap((component) => {
        const componentField =
          component.assessmentType === "mid_exam"
            ? "midExam"
            : component.assessmentType === "final_exam"
              ? "finalExam"
              : component.assessmentType === "assignment"
                ? "assignment"
                : "classQuiz";
        const score = Number(record?.marks?.[componentField] || 0);
        const submittedFlag = record?.submittedComponents?.[componentField];
        const isSubmitted =
          typeof submittedFlag === "boolean" ? submittedFlag : score > 0;
        // Always include the component if it has a score, regardless of submitted flag
        if (score === 0) return [];

        return [{
          id: `${baseId}:${component.assessmentType}`,
          studentId,
          studentName,
          grade,
          stream,
          section: stream,
          subject,
          assessmentType: component.assessmentType,
          score,
          maxScore: component.max,
          percentage:
            component.max > 0
              ? Math.round((score / component.max) * 10000) / 100
              : 0,
          weight: component.weight,
          semester,
          academicYear,
          enteredBy: String(
            record?.teacher?.firstName && record?.teacher?.lastName
              ? `${record.teacher.firstName} ${record.teacher.lastName}`
              : record?.teacher || "Unknown",
          ),
          createdAt: record?.createdAt,
          rawRecordId: baseId,
          status: record?.status || "Draft",
          rejectionReason: record?.rejectionReason || "",
        } as Grade & { rawRecordId: string; status: string; rejectionReason: string }];
      });
    });

    return transformed;
  }, [recordsData, studentLookup]);

  const filteredGrades = useMemo(() => {
    const result = grades.filter((g) => {
      // Filter by selected student if one is chosen
      if (filters.selectedStudentId && g.studentId !== filters.selectedStudentId) {
        return false;
      }
      if (
        filters.grade &&
        normalizeGradeValue(g.grade) !== normalizeGradeValue(filters.grade)
      )
        return false;
      if (
        filters.stream &&
        gradeRequiresStream(filters.grade) &&
        normalizeTextValue(g.stream) !== normalizeTextValue(filters.stream)
      ) {
        return false;
      }
      if (
        filters.academicYear &&
        String(g.academicYear || "").trim() !==
          String(filters.academicYear).trim()
      ) {
        return false;
      }
      if (
        filters.semester &&
        normalizeSemesterValue(g.semester) !==
          normalizeSemesterValue(filters.semester)
      ) {
        return false;
      }
      if (
        filters.subject &&
        normalizeSubjectValue(g.subject) !==
          normalizeSubjectValue(filters.subject)
      )
        return false;
      if (filters.assessmentType && g.assessmentType !== filters.assessmentType)
        return false;
      if (
        isTeacher &&
        teacherSubjects.length > 0 &&
        !teacherSubjects.some(
          (assignedSubject) =>
            normalizeSubjectValue(assignedSubject) ===
            normalizeSubjectValue(g.subject),
        )
      ) {
        return false;
      }
      if (
        isTeacher &&
        assignedClasses.length > 0 &&
        !assignedClasses.some((cls) => {
          if (normalizeGradeValue(cls.grade) !== normalizeGradeValue(g.grade))
            return false;
          if (gradeRequiresStream(cls.grade) && cls.stream) {
            return (
              normalizeTextValue(cls.stream) === normalizeTextValue(g.stream)
            );
          }
          return true;
        })
      ) {
        return false;
      }
      return true;
    });

    return result;
  }, [grades, filters, isTeacher, teacherSubjects, assignedClasses]);

  const studentRows = useMemo(() => {
    const map = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        grade: string;
        stream: string;
        subjects: Set<string>;
        grades: Grade[];
        totalScore: number;
        totalMax: number;
      }
    >();

    filteredGrades.forEach((grade) => {
      if (!map.has(grade.studentId)) {
        map.set(grade.studentId, {
          studentId: grade.studentId,
          studentName: grade.studentName,
          grade: grade.grade,
          stream: grade.stream || "",
          subjects: new Set<string>(),
          grades: [],
          totalScore: 0,
          totalMax: 0,
        });
      }

      const row = map.get(grade.studentId)!;
      row.subjects.add(grade.subject);
      row.grades.push(grade);
      row.totalScore += Number(grade.score || 0);
      row.totalMax += Number(grade.maxScore || 0);
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        subjectsList: Array.from(row.subjects),
        average:
          row.totalMax > 0
            ? Math.round((row.totalScore / row.totalMax) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredGrades]);

  const selectedStudentGrades = useMemo(
    () => studentRows.find((row) => row.studentId === selectedStudentId) || null,
    [studentRows, selectedStudentId],
  );

  useEffect(() => {
    if (!studentGradesOpen) return;
    if (!selectedStudentId) return;
    const stillExists = studentRows.some(
      (row) => row.studentId === selectedStudentId,
    );
    if (!stillExists) {
      setStudentGradesOpen(false);
      setSelectedStudentId("");
    }
  }, [studentRows, selectedStudentId, studentGradesOpen]);

  const stats = useMemo(() => {
    if (filteredGrades.length === 0)
      return { average: 0, highest: 0, lowest: 0, passed: 0, failed: 0 };
    const percentages = filteredGrades.map((g) => g.percentage);
    const passed = filteredGrades.filter(
      (g) => getStatus(g.percentage) === "passed",
    ).length;
    return {
      average: Math.round(
        percentages.reduce((a, b) => a + b, 0) / percentages.length,
      ),
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      passed,
      failed: filteredGrades.length - passed,
    };
  }, [filteredGrades]);

  // Paginate studentRows for better performance
  const paginatedStudentRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return studentRows.slice(startIndex, startIndex + rowsPerPage);
  }, [studentRows, page, rowsPerPage]);

  const totalStudents = studentRows.length;

  // Organize grades by subject for the selected student
  const subjectGrades = useMemo(() => {
    if (!filters.selectedStudentId) return [];
    
    const subjectMap = new Map<string, {
      subject: string;
      midExam: number;
      finalExam: number;
      assignment: number;
      classQuiz: number;
      total: number;
      percentage: number;
      grade: string;
    }>();

    filteredGrades.forEach((g) => {
      if (!subjectMap.has(g.subject)) {
        subjectMap.set(g.subject, {
          subject: g.subject,
          midExam: 0,
          finalExam: 0,
          assignment: 0,
          classQuiz: 0,
          total: 0,
          percentage: 0,
          grade: "",
        });
      }

      const subject = subjectMap.get(g.subject)!;
      const maxScore = Number(g.maxScore || 0);
      
      if (g.assessmentType === "mid_exam") subject.midExam = g.score;
      else if (g.assessmentType === "final_exam") subject.finalExam = g.score;
      else if (g.assessmentType === "assignment") subject.assignment = g.score;
      else if (g.assessmentType === "test") subject.classQuiz = g.score;
      else if (g.assessmentType === "class_quiz") subject.classQuiz = g.score;
    });

    // Calculate totals and percentages for each subject
    subjectMap.forEach((subject) => {
      subject.total = subject.midExam + subject.finalExam + subject.assignment + subject.classQuiz;
      subject.percentage = subject.total; // Total is already out of 100
      subject.grade = getStatus(subject.percentage);
    });

    return Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [filteredGrades, filters.selectedStudentId]);

  const formatAssessmentType = (type: string): string => {
    const labels: Record<string, string> = {
      test: "Quiz/Test",
      assignment: "Assignment",
      mid_exam: "Mid Exam",
      final_exam: "Final Exam",
      exam: "Exam",
    };
    return labels[type] || type;
  };

  const classLabelForGradeRow = (g: Grade) => {
    const gr = normalizeGradeValue(g.grade);
    if (!gr) return "—";
    if (gradeRequiresStream(gr) && g.stream) {
      return `Grade ${gr} – ${streamFilterLabel(String(g.stream))}`;
    }
    return `Grade ${gr}`;
  };

  // ── computed live total ──
  const liveTotal = useMemo(() => {
    return COMPONENTS.reduce((sum, c) => {
      const v = Number(marks[c.key]) || 0;
      return sum + v;
    }, 0);
  }, [marks]);

  // ── dialog open/close ──
  const openAddDialog = () => {
    setEditMode(false);
    setFormStudentId("");
    setFormGrade("");
    setFormStream("");
    setFormSubject(defaultTeacherSubject);
    setFormSemester(
      filters.semester && filters.semester !== "" ? filters.semester : "1",
    );
    setMarks(emptyMarks());
    setDialogOpen(true);
  };

  // Reset student selection when grade or stream changes
  useEffect(() => {
    if (formGrade || formStream) {
      setFormStudentId("");
    }
  }, [formGrade, formStream]);

  const openEditDialog = (grade: Grade) => {
    setEditMode(true);
    setSelectedGrade(grade);
    // Pre-fill only the component that matches this record
    const comp = COMPONENTS.find(
      (c) => c.assessmentType === grade.assessmentType,
    );
    const m = emptyMarks();
    if (comp) (m as any)[comp.key] = String(grade.score);
    setFormStudentId(grade.studentId);
    setFormSubject(grade.subject);
    setFormSemester(grade.semester);
    setMarks(m);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedGrade(null);
  };

  const openStudentGradesDialog = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentGradesOpen(true);
  };

  // ── submit ──
  const handleFormSubmit = async () => {
    if (!formStudentId) {
      toast.error("Please select a student");
      return;
    }

    const subject = formSubject || defaultTeacherSubject;
    if (!subject) {
      toast.error("Subject is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editMode && selectedGrade) {
        // Edit: only update the one component shown
        const comp = COMPONENTS.find(
          (c) => c.assessmentType === selectedGrade.assessmentType,
        );
        if (!comp) return;
        const score = Number(marks[comp.key]) || 0;
        if (score > comp.max) {
          toast.error(`${comp.label} max is ${comp.max}`);
          setSubmitting(false);
          return;
        }
        await updateAcademicRecord.mutateAsync({
          id: (selectedGrade as any).rawRecordId || selectedGrade.id,
          data: { score, maxScore: comp.max, weight: comp.weight } as any,
        });
      } else {
        // Create: submit all 4 components
        const acadYear = filters.academicYear?.trim()
          ? filters.academicYear
          : activeAcademicYear;
        const normalizedSemester = normalizeSemesterValue(formSemester);
        const creates = COMPONENTS.map((comp) => {
          const score = Number(marks[comp.key]) || 0;
          return {
            studentId: formStudentId,
            subject,
            assessmentType: comp.assessmentType as any,
            score,
            maxScore: comp.max,
            weight: comp.weight,
            semester: normalizedSemester,
            academicYear: acadYear,
          };
        });

        // Validate max scores
        for (const comp of COMPONENTS) {
          const score = Number(marks[comp.key]) || 0;
          if (score > comp.max) {
            toast.error(`${comp.label} max is ${comp.max} marks`);
            setSubmitting(false);
            return;
          }
        }

        // Submit components sequentially to avoid race conditions
        for (const data of creates) {
          await createGrade.mutateAsync(data);
        }
      }

      closeDialog();
    } catch {
      // errors handled by hooks
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGrade) return;
    await deleteAcademicRecord.mutateAsync(selectedGrade.id);
    setDeleteDialogOpen(false);
    setSelectedGrade(null);
  };

  const handleExportGrades = () => {
    if (filteredGrades.length === 0) {
      toast.error("No grades available to export");
      return;
    }

    setExporting(true);
    try {
      // Group grades by student
      const studentMap = new Map<string, any>();

    filteredGrades.forEach((grade) => {
      if (!studentMap.has(grade.studentId)) {
        studentMap.set(grade.studentId, {
          studentId: grade.studentId,
          studentName: grade.studentName,
          subject: grade.subject,
          midMarks: "",
          finalMarks: "",
          assignmentMarks: "",
          quizMarks: "",
          totalScore: 0,
          maxScore: 0,
        });
      }
      const student = studentMap.get(grade.studentId);
      const componentKey =
        grade.assessmentType === "mid_exam"
          ? "midMarks"
          : grade.assessmentType === "final_exam"
            ? "finalMarks"
            : grade.assessmentType === "assignment"
              ? "assignmentMarks"
              : grade.assessmentType === "test"
                ? "quizMarks"
                : "";
      if (componentKey) {
        student[componentKey] = `${grade.score}/${grade.maxScore}`;
        student.totalScore += grade.score;
        student.maxScore += grade.maxScore;
      }
    });

    // Calculate class averages
    const students = Array.from(studentMap.values());
    const classAverages = {
      midExam:
        students.reduce(
          (sum, s) => sum + (parseFloat(s.midMarks.split("/")[0] || "0") || 0),
          0,
        ) / students.length,
      finalExam:
        students.reduce(
          (sum, s) =>
            sum + (parseFloat(s.finalMarks.split("/")[0] || "0") || 0),
          0,
        ) / students.length,
      assignment:
        students.reduce(
          (sum, s) =>
            sum + (parseFloat(s.assignmentMarks.split("/")[0] || "0") || 0),
          0,
        ) / students.length,
      quiz:
        students.reduce(
          (sum, s) => sum + (parseFloat(s.quizMarks.split("/")[0] || "0") || 0),
          0,
        ) / students.length,
    };

    const headers = [
      "Student ID",
      "Student Name",
      "Subject",
      "Mid Exam",
      "Final Exam",
      "Assignment",
      "Quiz/Test",
      "Total Score",
      "Percentage",
    ];

    const rows = students.map((student) => [
      student.studentId,
      student.studentName,
      student.subject,
      student.midMarks,
      student.finalMarks,
      student.assignmentMarks,
      student.quizMarks,
      `${student.totalScore}/${student.maxScore}`,
      student.maxScore > 0
        ? Math.round((student.totalScore / student.maxScore) * 100) + "%"
        : "0%",
    ]);

    // Add class averages row
    rows.push([
      "CLASS AVERAGE",
      "",
      "",
      Math.round(classAverages.midExam) + "/20",
      Math.round(classAverages.finalExam) + "/40",
      Math.round(classAverages.assignment) + "/20",
      Math.round(classAverages.quiz) + "/20",
      "",
      "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell: unknown) => csvEscape(cell)).join(","))
      .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grades-${filters.subject || "all"}-${filters.academicYear || "all-years"}-sem-${filters.semester || "all"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Grades exported successfully");
    } catch (error) {
      console.error("Failed to export grades:", error);
      toast.error("Failed to export grades");
    } finally {
      setExporting(false);
    }
  };

  const setMark = (key: ComponentKey, value: string) => {
    setMarks((prev) => ({ ...prev, [key]: value }));
  };

  // Only show edit/open-component single field when editing
  const editComponent =
    editMode && selectedGrade
      ? COMPONENTS.find(
          (c) => c.assessmentType === selectedGrade.assessmentType,
        )
      : undefined;

  return (
    <Box>
      <Breadcrumbs items={[{ label: t('common.academic') }, { label: t('common.grades') }]} />

      <PageHeader
        title={filters.selectedStudentId ? t('common.studentGrades') : t('common.gradeManagement')}
        subtitle={
          filters.selectedStudentId
            ? `View and manage grades for selected student (Mid 20 · Final 40 · Assignment 20 · Quiz 20)`
            : isTeacher && teacherSubjects.length > 0
              ? `Subjects: ${teacherSubjects.join(", ")} — Enter and manage student grades (Mid 20 · Final 40 · Assignment 20 · Quiz 20)`
              : "Enter and manage student grades (Mid 20 · Final 40 · Assignment 20 · Quiz 20)"
        }
        action={
          canManageGrades ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAddDialog}
            >
              Enter Grade
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title={filters.selectedStudentId ? "Student Average" : "Class Average"}
          value={`${stats.average}%`}
          icon={<Calculate />}
          color="primary"
        />
        <StatsCard
          title="Highest"
          value={`${stats.highest}%`}
          icon={<TrendingUp />}
          color="success"
        />
        <StatsCard
          title="Lowest"
          value={`${stats.lowest}%`}
          icon={<TrendingDown />}
          color="warning"
        />
        <StatsCard
          title="Passed (≥50%)"
          value={stats.passed}
          icon={<Assessment />}
          color="success"
        />
        <StatsCard
          title="Failed (<50%)"
          value={stats.failed}
          icon={<Assessment />}
          color="error"
        />
      </Box>

      {/* Teacher scoped class info */}
      {isTeacher && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <School fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Your scope:
          </Typography>
          {assignedClasses.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No classes assigned yet
            </Typography>
          ) : (
            assignedClasses.map((cls) => (
              <Chip
                key={`${cls.grade}-${cls.stream || ""}`}
                label={
                  gradeRequiresStream(cls.grade) && cls.stream
                    ? `Grade ${cls.grade} – ${streamFilterLabel(cls.stream)}`
                    : `Grade ${cls.grade}`
                }
                size="small"
                color="primary"
                variant="outlined"
              />
            ))
          )}
          {teacherSubjects.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
              >
                Subjects:
              </Typography>
              {teacherSubjects.map((subject) => (
                <Chip
                  key={subject}
                  label={subject}
                  size="small"
                  color="secondary"
                />
              ))}
            </>
          )}
          <Tooltip
            title={`Showing ${scopedStudents.length} students from your assigned classes`}
          >
            <InfoOutlined
              fontSize="small"
              sx={{ color: "text.secondary", ml: "auto", cursor: "help" }}
            />
          </Tooltip>
        </Paper>
      )}

      {/* Filters — client-side (like attendance); use All year / All semesters for full history */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filters.selectedStudentId
              ? "Select a student to view their grades by subject"
              : "Filter by class, academic year, semester, and component. Choose a student to view their detailed grades."}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Showing {studentRows.length} student
            {studentRows.length === 1 ? "" : "s"} for current filters
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <select
            value={filters.selectedStudentId}
            onChange={(e) =>
              setFilters((p) => ({ ...p, selectedStudentId: e.target.value }))
            }
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 200,
            }}
          >
            <option value="">Select Student</option>
            {scopedStudents.map((student) => (
              <option key={student._id} value={student._id}>
                {student.firstName} {student.lastName} ({student.studentProfile?.studentId || student._id})
              </option>
            ))}
          </select>
          <select
            value={filters.grade}
            onChange={(e) =>
              setFilters((p) => ({ ...p, grade: e.target.value }))
            }
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 100,
            }}
          >
            <option value="">All Grades</option>
            {(isTeacher
              ? [
                  ...new Set(
                    assignedClasses.map((cls) =>
                      normalizeGradeValue(cls.grade),
                    ),
                  ),
                ]
              : ["9", "10", "11", "12"]
            ).map((gradeOption) => (
              <option key={gradeOption} value={gradeOption}>
                Grade {gradeOption}
              </option>
            ))}
          </select>

          {(filters.grade === "11" || filters.grade === "12") && (
            <select
              value={filters.stream}
              onChange={(e) =>
                setFilters((p) => ({ ...p, stream: e.target.value }))
              }
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${theme.palette.divider}`,
                minWidth: 160,
              }}
            >
              <option value="">All streams</option>
              {(isTeacher
                ? [
                    ...new Set(
                      assignedClasses
                        .filter((c) => gradeRequiresStream(c.grade) && c.stream)
                        .map((c) => String(c.stream).trim()),
                    ),
                  ]
                : ["Natural", "Social"]
              ).map((streamOption) => (
                <option key={streamOption} value={streamOption}>
                  {streamFilterLabel(streamOption)}
                </option>
              ))}
            </select>
          )}

          {isTeacher && teacherSubjects.length > 0 && (
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters((p) => ({ ...p, subject: e.target.value }))
              }
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${theme.palette.divider}`,
                minWidth: 160,
              }}
            >
              <option value="">All subjects</option>
              {teacherSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          )}

          {!isTeacher && (
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters((p) => ({ ...p, subject: e.target.value }))
              }
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${theme.palette.divider}`,
                minWidth: 120,
              }}
            >
              <option value="">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="English">English</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="History">History</option>
              <option value="Geography">Geography</option>
            </select>
          )}

          <select
            value={filters.semester}
            onChange={(e) =>
              setFilters((p) => ({ ...p, semester: e.target.value }))
            }
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 140,
            }}
          >
            <option value="">All semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>

          <select
            value={filters.academicYear}
            onChange={(e) =>
              setFilters((p) => ({ ...p, academicYear: e.target.value }))
            }
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 140,
            }}
          >
            <option value="">All years</option>
            <option value={activeAcademicYear}>{activeAcademicYear}</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2024-2025">2024-2025</option>
          </select>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ flex: "1 1 320px" }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Filter by component (Mid, Final, Assignment, Quiz):
            </Typography>
            <ToggleButtonGroup
              value={filters.assessmentType ? filters.assessmentType : "all"}
              exclusive
              onChange={(_, value) => {
                if (value === null) return;
                setFilters((p) => ({
                  ...p,
                  assessmentType: value === "all" ? "" : String(value),
                }));
              }}
              size="small"
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="mid_exam">Mid Exam</ToggleButton>
              <ToggleButton value="final_exam">Final Exam</ToggleButton>
              <ToggleButton value="assignment">Assignment</ToggleButton>
              <ToggleButton value="test">Quiz/Test</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => refetchGrades()}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportGrades}
              disabled={filteredGrades.length === 0 || exporting}
            >
              {exporting ? "Exporting..." : "Export Grades"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Students Table or Subject Breakdown */}
      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            {filters.selectedStudentId ? (
              // Show subject breakdown for selected student
              <>
                <TableHead>
                  <TableRow
                    sx={{ background: alpha(theme.palette.primary.main, 0.05) }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Mid (20)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Final (40)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Assignment (20)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Quiz (20)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Total</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Percentage</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Grade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingRecords ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : subjectGrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No grades have been entered for this student yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjectGrades.map((row) => (
                      <TableRow
                        key={row.subject}
                        sx={{ "&:hover": { background: alpha(theme.palette.primary.main, 0.02) } }}
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{row.subject}</TableCell>
                        <TableCell align="center">{row.midExam > 0 ? `${row.midExam}/20` : "-"}</TableCell>
                        <TableCell align="center">{row.finalExam > 0 ? `${row.finalExam}/40` : "-"}</TableCell>
                        <TableCell align="center">{row.assignment > 0 ? `${row.assignment}/20` : "-"}</TableCell>
                        <TableCell align="center">{row.classQuiz > 0 ? `${row.classQuiz}/20` : "-"}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{row.total}</TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color:
                                row.percentage >= 90
                                  ? theme.palette.success.main
                                  : row.percentage >= 80
                                    ? theme.palette.info.main
                                    : row.percentage >= 70
                                      ? theme.palette.warning.main
                                      : row.percentage >= 60
                                        ? theme.palette.warning.dark
                                        : theme.palette.error.main,
                            }}
                          >
                            {row.percentage}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.grade === "passed" ? "Pass" : "Fail"}
                            color={row.grade === "passed" ? "success" : "error"}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </>
            ) : (
              // Show student list when no student is selected
              <>
                <TableHead>
                  <TableRow
                    sx={{ background: alpha(theme.palette.primary.main, 0.05) }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Subjects</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Records</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Average</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Open</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingRecords ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : studentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          No grades have been entered yet for the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudentRows.map((row) => (
                      <TableRow
                        key={row.studentId}
                        sx={{ "&:hover": { background: alpha(theme.palette.primary.main, 0.02) } }}
                      >
                        <TableCell>{row.studentId}</TableCell>
                        <TableCell>{row.studentName}</TableCell>
                        <TableCell>
                          {gradeRequiresStream(row.grade) && row.stream
                            ? `Grade ${row.grade} – ${streamFilterLabel(row.stream)}`
                            : `Grade ${row.grade}`}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {row.subjectsList.map((subject) => (
                              <Chip key={subject} label={subject} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>{row.grades.length}</TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color:
                                  row.average >= 90
                                    ? theme.palette.success.main
                                    : row.average >= 80
                                      ? theme.palette.info.main
                                      : row.average >= 70
                                        ? theme.palette.warning.main
                                        : row.average >= 60
                                          ? theme.palette.warning.dark
                                          : theme.palette.error.main,
                              }}
                            >
                              {row.average}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={row.average}
                              sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                background: alpha(theme.palette.grey[500], 0.2),
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setFilters((p) => ({ ...p, selectedStudentId: row.studentId }))}
                          >
                            View Grades
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </TableContainer>
        {!filters.selectedStudentId && (
          <TablePagination
            component="div"
            count={totalStudents}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </Paper>

      {/* Student Grades Detail Dialog */}
      <Dialog
        open={studentGradesOpen}
        onClose={() => setStudentGradesOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {selectedStudentGrades
              ? `${selectedStudentGrades.studentName} — Grades`
              : "Student Grades"}
          </Typography>
          {selectedStudentGrades && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {selectedStudentGrades.studentId} •{" "}
              {classLabelForGradeRow(selectedStudentGrades.grades[0])}
            </Typography>
          )}
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{ background: alpha(theme.palette.primary.main, 0.05) }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Academic Year</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Semester</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Component</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  {canManageGrades && (
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {!selectedStudentGrades ? (
                  <TableRow>
                    <TableCell colSpan={canManageGrades ? 8 : 7} align="center">
                      <Typography color="text.secondary">
                        Student not found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : selectedStudentGrades.grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageGrades ? 8 : 7} align="center">
                      <Typography color="text.secondary">
                        No grades available for this student.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedStudentGrades.grades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>{grade.subject}</TableCell>
                      <TableCell>{grade.academicYear || "—"}</TableCell>
                      <TableCell>
                        {normalizeSemesterValue(grade.semester)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatAssessmentType(grade.assessmentType)}
                          size="small"
                          variant="outlined"
                          color={
                            grade.assessmentType === "final_exam"
                              ? "error"
                              : grade.assessmentType === "mid_exam"
                                ? "warning"
                                : grade.assessmentType === "assignment"
                                  ? "info"
                                  : "default"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {grade.score}/{grade.maxScore}
                      </TableCell>
                      <TableCell>{grade.percentage}%</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          <Chip
                            label={grade.status || "Draft"}
                            size="small"
                            color={
                              grade.status === "Approved" ? "success" :
                              grade.status === "Rejected" ? "error" :
                              grade.status === "Pending Approval" ? "warning" : "default"
                            }
                          />
                          {grade.status === "Rejected" && grade.rejectionReason && (
                            <Typography variant="caption" color="error" sx={{ fontSize: "0.7rem" }}>
                              {grade.rejectionReason}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      {canManageGrades && (
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                              setAnchorEl(e.currentTarget);
                              setSelectedGrade(grade);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentGradesOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      {canManageGrades && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              if (selectedGrade) openEditDialog(selectedGrade);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setDeleteDialogOpen(true);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Delete</ListItemText>
          </MenuItem>
        </Menu>
      )}

      {/* ── Grade Entry / Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {editMode
              ? `Edit — ${editComponent?.label ?? "Grade"}`
              : "Enter Student Grades"}
          </Typography>
          {!editMode && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Fill all 4 components below. Total marks out of 100.
            </Typography>
          )}
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Grade select */}
            <FormControl fullWidth size="small">
              <InputLabel>Grade *</InputLabel>
              <Select
                value={formGrade}
                label="Grade *"
                onChange={(e) => {
                  setFormGrade(e.target.value);
                  setFormStream("");
                }}
                disabled={editMode}
              >
                <MenuItem value="">Select Grade</MenuItem>
                {[
                  ...new Set(
                    assignedClasses.map((cls) =>
                      normalizeGradeValue(cls.grade),
                    ),
                  ),
                ].map((gradeOption) => (
                  <MenuItem key={gradeOption} value={gradeOption}>
                    Grade {gradeOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Stream select - only for grades 11 and 12 */}
            {gradeRequiresStream(formGrade) && (
              <FormControl fullWidth size="small">
                <InputLabel>Section *</InputLabel>
                <Select
                  value={formStream}
                  label="Section *"
                  onChange={(e) => setFormStream(e.target.value)}
                  disabled={editMode}
                >
                  <MenuItem value="">Select Section</MenuItem>
                  {[
                    ...new Set(
                      assignedClasses
                        .filter((c) => 
                          normalizeGradeValue(c.grade) === normalizeGradeValue(formGrade) && 
                          c.stream
                        )
                        .map((c) => String(c.stream).trim()),
                    ),
                  ].map((streamOption) => (
                    <MenuItem key={streamOption} value={streamOption}>
                      {streamFilterLabel(streamOption)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Student select */}
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.student')} *</InputLabel>
              <Select
                value={formStudentId}
                label={t('common.student') + ' *'}
                onChange={(e) => setFormStudentId(e.target.value)}
                disabled={editMode || !formGrade || (gradeRequiresStream(formGrade) && !formStream)}
              >
                {!formGrade || (gradeRequiresStream(formGrade) && !formStream) ? (
                  <MenuItem value="" disabled>
                    Please select grade {gradeRequiresStream(formGrade) ? "and section" : ""} first
                  </MenuItem>
                ) : formFilteredStudents.length === 0 ? (
                  <MenuItem value="" disabled>
                    No students found for selected grade/section
                  </MenuItem>
                ) : (
                  formFilteredStudents.map((s: any) => {
                    const sid =
                      s.studentId || s.studentProfile?.studentId || s.id || s._id;
                    const name =
                      `${s.firstName || ""} ${s.lastName || ""}`.trim();
                    const grade = normalizeGradeValue(
                      s?.studentProfile?.grade || s?.grade || "",
                    );
                    return (
                      <MenuItem key={sid} value={sid}>
                        {name} — Grade {grade} ({sid})
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>

            {/* Subject — teachers can choose only from their assigned subjects; admins can choose all */}
            {isTeacher ? (
              <FormControl fullWidth size="small">
                <InputLabel>{t('pages.dashboard.subject')} *</InputLabel>
                <Select
                  value={formSubject}
                  label={t('pages.dashboard.subject') + ' *'}
                  onChange={(e) => setFormSubject(e.target.value)}
                  disabled={editMode || teacherSubjects.length === 0}
                >
                  {teacherSubjects.length === 0 ? (
                    <MenuItem value="" disabled>
                      No subject assigned. Contact admin.
                    </MenuItem>
                  ) : (
                    teacherSubjects.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel>{t('pages.dashboard.subject')} *</InputLabel>
                <Select
                  value={formSubject}
                  label={t('pages.dashboard.subject') + ' *'}
                  onChange={(e) => setFormSubject(e.target.value)}
                  disabled={editMode}
                >
                  {[
                    "Mathematics",
                    "English",
                    "Physics",
                    "Chemistry",
                    "Biology",
                    "History",
                    "Geography",
                    "Civics",
                    "Physical Education",
                    "Economics",
                    "ICT",
                  ].map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Semester */}
            <FormControl fullWidth size="small">
              <InputLabel>Semester *</InputLabel>
              <Select
                value={formSemester}
                label="Semester *"
                onChange={(e) => setFormSemester(e.target.value)}
                disabled={editMode}
              >
                <MenuItem value="1">Semester 1</MenuItem>
                <MenuItem value="2">Semester 2</MenuItem>
              </Select>
            </FormControl>

            <Divider />

            {/* Marks breakdown */}
            {editMode && editComponent ? (
              /* Edit mode: show only the one component */
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  mb={1.5}
                  color="primary"
                >
                  {t('common.edit')} {editComponent.label} (max {editComponent.max} pts)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label={`${editComponent.label} (max ${editComponent.max})`}
                  type="number"
                  inputProps={{ min: 0, max: editComponent.max, step: 0.5 }}
                  value={marks[editComponent.key]}
                  onChange={(e) => setMark(editComponent.key, e.target.value)}
                />
              </Box>
            ) : (
              /* Add mode: all 4 components */
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="primary"
                  >
                    Marks Breakdown
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total:
                    </Typography>
                    <Chip
                      label={`${liveTotal} / 100`}
                      size="small"
                      color={
                        liveTotal > 100
                          ? "error"
                          : liveTotal === 100
                            ? "success"
                            : "default"
                      }
                      variant={liveTotal === 100 ? "filled" : "outlined"}
                    />
                  </Box>
                </Box>

                {/* Progress bar */}
                <Box sx={{ mb: 2.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(liveTotal, 100)}
                    color={
                      liveTotal > 100
                        ? "error"
                        : liveTotal >= 50
                          ? "success"
                          : "warning"
                    }
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  {COMPONENTS.map((comp) => (
                    <Box key={comp.key}>
                      <TextField
                        fullWidth
                        size="small"
                        label={`${comp.label} (max ${comp.max})`}
                        type="number"
                        inputProps={{ min: 0, max: comp.max, step: 0.5 }}
                        value={marks[comp.key]}
                        onChange={(e) => setMark(comp.key, e.target.value)}
                        error={Number(marks[comp.key]) > comp.max}
                        helperText={
                          Number(marks[comp.key]) > comp.max
                            ? `Exceeds max (${comp.max})`
                            : `Weight: ${comp.weight * 100}%`
                        }
                      />
                    </Box>
                  ))}
                </Box>

                {liveTotal > 100 && (
                  <Typography
                    variant="caption"
                    color="error"
                    mt={1}
                    display="block"
                  >
                    Total exceeds 100. Please correct the marks.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={submitting || liveTotal > 100 || !formStudentId}
            startIcon={
              submitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {submitting
              ? t('common.loading')
              : editMode
                ? t('common.save')
                : t('common.saveAll')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('common.deleteGrade')}
        message="Are you sure you want to delete this grade record?"
        confirmText={t('common.delete')}
        severity="error"
      />
    </Box>
  );
}
