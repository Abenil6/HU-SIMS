import React, { useState, useMemo } from "react";
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
  alpha,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  CircularProgress,
  Chip,
  Grid,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
} from "@mui/material";
import {
  Add,
  Download,
  AutoAwesome,
  Refresh,
  MoreVert,
  Edit,
  Delete,
  CalendarToday,
  AccessTime,
  Room,
  Person,
  Close,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuthStore } from "@/stores/authStore";
import {
  useExamSchedules,
  useCreateExamSchedule,
  useUpdateExamSchedule,
  useDeleteExamSchedule,
  useAutoGenerateSchedule,
  useRegenerateSchedule,
  type CreateExamScheduleData,
} from "@/hooks/examSchedules/useExamSchedules";
import { teacherService, type Teacher } from "@/services/teacherService";
import { type ExamSchedule } from "@/services/examScheduleService";

const GRADES = [9, 10, 11, 12];
const SECTIONS = ["A", "B", "C", "D"];
const STREAMS = ["Natural", "Social"];
const SEMESTERS = ["Semester 1", "Semester 2"];
const EXAM_TYPES = ["Midterm", "Final", "Mock"];
const ACADEMIC_YEARS = ["2025-2026", "2026-2027"];

const TIME_SLOTS = [
  { value: "08:00", label: "08:00 AM" },
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "17:00", label: "05:00 PM" },
];

const ROOMS = [
  "G9 Classroom 1",
  "G9 Classroom 2",
  "G9 Classroom 3",
  "G10 Classroom 1",
  "G10 Classroom 2",
  "G10 Classroom 3",
  "G11 Classroom 1",
  "G11 Classroom 2",
  "G11 Classroom 3",
  "G12 Classroom 1",
  "G12 Classroom 2",
  "G12 Classroom 3",
];

const SUBJECTS = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Civics",
  "Amharic",
  "Physical Education",
  "Information Technology",
  "Economics",
];

type ScheduleDialogMode = "generate" | "regenerate";

interface ScheduleFormValues {
  examType: "" | "Midterm" | "Final" | "Mock";
  subject: string;
  grade: number;
  section?: string;
  academicYear: string;
  semester: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  invigilator: string;
  notes: string;
}

interface AutoGenerateFormValues {
  grade: number;
  section: string;
  academicYear: string;
  semester: string;
  examType: "Midterm" | "Final" | "Mock";
  startDate: string;
  endDate: string;
}

const normalizeTeacherStatus = (status?: string) => String(status || "").toLowerCase();
const getTeacherName = (teacher: Teacher) => `${teacher.firstName} ${teacher.lastName}`.trim();
const getTeacherClasses = (teacher: Teacher) =>
  (teacher.teacherProfile?.classes || teacher.classes || []) as Array<{
    grade: string;
    section?: string;
    stream?: string;
  }>;
const getTeacherSubjects = (teacher: Teacher) => teacher.teacherProfile?.subjects || teacher.subjects || [];

const teacherAssignedToClass = (teacher: Teacher, grade: number, section?: string) =>
  getTeacherClasses(teacher).some((assignedClass) => {
    const assignedGrade = String(assignedClass.grade || "").trim();
    const assignedSection = String(assignedClass.section || assignedClass.stream || "").trim();

    if (section) {
      return assignedGrade === String(grade) && assignedSection === String(section);
    }
    return assignedGrade === String(grade);
  });

const formatDateInput = (value?: string) =>
  value ? new Date(value).toISOString().split("T")[0] : "";

const getScheduleId = (schedule: ExamSchedule & { _id?: string }) => schedule.id || schedule._id || "";

const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const requiresStream = (grade: number) => grade >= 11;
const getClassLabel = (grade: number) => (requiresStream(grade) ? "Stream" : "Section");
const canonicalSubjectLabel = (subject?: string) => {
  const normalized = String(subject || "").trim().toLowerCase();

  if (
    normalized === "ict" ||
    normalized.includes("information communication technology") ||
    normalized.includes("information technology")
  ) {
    return "Information Communication Technology (ICT)";
  }

  return String(subject || "").trim();
};

export function ExamSchedulePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const defaultScheduleForm: ScheduleFormValues = {
    examType: "",
    subject: "",
    grade: 9,
    section: undefined,
    academicYear: "2025-2026",
    semester: "Semester 1",
    date: "",
    startTime: "",
    endTime: "",
    room: "",
    invigilator: "",
    notes: "",
  };
  const [filters, setFilters] = useState({
    academicYear: "2025-2026",
    semester: "Semester 1",
    grade: "",
    section: "",
    examType: "",
  });

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [autoGenerateModalOpen, setAutoGenerateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleDialogMode, setScheduleDialogMode] = useState<ScheduleDialogMode>("generate");
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormValues>(defaultScheduleForm);
  const [exporting, setExporting] = useState(false);

  // Auto-generate form state
  const [autoGenerateForm, setAutoGenerateForm] = useState<AutoGenerateFormValues>({
    grade: 9,
    section: "",
    academicYear: "2025-2026",
    semester: "Semester 1",
    examType: "Midterm",
    startDate: "",
    endDate: "",
  });

  // Fetch exam schedules
  const { data: schedulesData, isLoading: isLoadingSchedules, isError: isSchedulesError, refetch } = useExamSchedules({
    academicYear: filters.academicYear || undefined,
    semester: filters.semester || undefined,
    grade: filters.grade ? Number(filters.grade) : undefined,
    section: (filters.grade && requiresStream(Number(filters.grade))) ? filters.section : undefined,
    examType: filters.examType || undefined,
    limit: 100,
  });
  const { data: availabilitySchedulesData } = useExamSchedules({
    academicYear: scheduleForm.academicYear || undefined,
    semester: scheduleForm.semester || undefined,
    limit: 500,
  });

  const createSchedule = useCreateExamSchedule();
  const updateSchedule = useUpdateExamSchedule();
  const deleteSchedule = useDeleteExamSchedule();
  const autoGenerate = useAutoGenerateSchedule();
  const regenerate = useRegenerateSchedule();
  const dashboardPath = (() => {
    switch (user?.role) {
      case "SchoolAdmin":
        return "/school-admin";
      case "Teacher":
        return "/teacher";
      case "Student":
        return "/student";
      case "Parent":
        return "/parent";
      case "SystemAdmin":
        return "/admin";
      default:
        return "/";
    }
  })();
  const canDeleteSchedules = user?.role === "SchoolAdmin" || user?.role === "SystemAdmin";
  const canManageSchedules = user?.role === "SchoolAdmin" || user?.role === "SystemAdmin";

  // Fetch teachers for invigilator dropdown
  React.useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await teacherService.getTeachers({ limit: 1000 });
        if (response.success && response.data) {
          setTeachers(response.data);
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
      }
    };
    fetchTeachers();
  }, []);

  // Clear section when grade changes to non-stream grade
  React.useEffect(() => {
    if (filters.grade && !requiresStream(Number(filters.grade))) {
      setFilters({ ...filters, section: "" });
    }
  }, [filters.grade]);

  const schedules = useMemo(() => {
    return Array.isArray((schedulesData as any)?.data)
      ? ((schedulesData as any).data as ExamSchedule[])
      : [];
  }, [schedulesData]);
  const availabilitySchedules = useMemo(() => {
    return Array.isArray((availabilitySchedulesData as any)?.data)
      ? ((availabilitySchedulesData as any).data as ExamSchedule[])
      : [];
  }, [availabilitySchedulesData]);

  const invigilatorOptions = useMemo(() => {
    return teachers
      .filter((t) => normalizeTeacherStatus(t.status) === "active")
      .map((t) => ({
        value: getTeacherName(t),
        label: `${getTeacherName(t)} (${getTeacherSubjects(t).join(", ") || "No subjects"})`,
      }));
  }, [teachers]);

  const currentScheduleId = selectedSchedule
    ? getScheduleId(selectedSchedule as ExamSchedule & { _id?: string })
    : "";

  const matchingSchedulesForSelection = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.startTime || !scheduleForm.endTime) {
      return [];
    }

    const selectedDate = formatDateInput(scheduleForm.date);

    return availabilitySchedules.filter((schedule) => {
      if (getScheduleId(schedule as ExamSchedule & { _id?: string }) === currentScheduleId) {
        return false;
      }

      if (formatDateInput(schedule.date) !== selectedDate) {
        return false;
      }

      return (
        scheduleForm.startTime < schedule.endTime &&
        schedule.startTime < scheduleForm.endTime
      );
    });
  }, [
    availabilitySchedules,
    currentScheduleId,
    scheduleForm.date,
    scheduleForm.endTime,
    scheduleForm.startTime,
  ]);

  const availableSubjectOptions = useMemo(() => {
    const matchedSubjects = teachers
      .filter((teacher) => normalizeTeacherStatus(teacher.status) === "active")
      .filter((teacher) =>
        teacherAssignedToClass(teacher, scheduleForm.grade, scheduleForm.section)
      )
      .flatMap((teacher) => getTeacherSubjects(teacher))
      .map((subject) => canonicalSubjectLabel(subject))
      .filter(Boolean);

    const uniqueSubjects = [...new Set(matchedSubjects)];
    const source = uniqueSubjects.length > 0 ? uniqueSubjects : SUBJECTS;

    return source.map((subject) => ({
      value: canonicalSubjectLabel(subject),
      label: canonicalSubjectLabel(subject),
    }));
  }, [scheduleForm.grade, scheduleForm.section, teachers]);

  const availableRooms = useMemo(() => {
    const takenRooms = new Set(
      matchingSchedulesForSelection.map((schedule) => schedule.room).filter(Boolean)
    );

    const gradePrefix = `G${scheduleForm.grade}`;
    const gradeRooms = ROOMS.filter((room) => room.startsWith(gradePrefix));

    return gradeRooms.map((room) => ({
      value: room,
      label: room,
      disabled: takenRooms.has(room),
    }));
  }, [matchingSchedulesForSelection, scheduleForm.grade]);

  const availableInvigilators = useMemo(() => {
    const takenInvigilators = new Set(
      matchingSchedulesForSelection.map((schedule) => schedule.invigilator).filter(Boolean)
    );

    return invigilatorOptions.map((option) => ({
      ...option,
      disabled: takenInvigilators.has(option.value),
    }));
  }, [invigilatorOptions, matchingSchedulesForSelection]);

  const handleCreate = () => {
    const nextGrade = filters.grade ? Number(filters.grade) : 9;
    setIsEditing(false);
    setSelectedSchedule(null);
    setScheduleForm({
      ...defaultScheduleForm,
      grade: nextGrade,
      section: requiresStream(nextGrade) ? (filters.section || STREAMS[0]) : undefined,
      academicYear: filters.academicYear,
      semester: filters.semester,
      examType: (filters.examType as "" | "Midterm" | "Final" | "Mock") || "",
    });
    setFormModalOpen(true);
  };

  const handleEdit = (schedule: ExamSchedule) => {
    setIsEditing(true);
    setSelectedSchedule(schedule);
    setScheduleForm({
      examType: schedule.examType,
      subject: schedule.subject,
      grade: schedule.grade,
      section: schedule.section,
      academicYear: schedule.academicYear,
      semester: schedule.semester,
      date: formatDateInput(schedule.date),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || "",
      invigilator: schedule.invigilator || "",
      notes: schedule.notes || "",
    });
    setFormModalOpen(true);
    setAnchorEl(null);
  };

  const handleDelete = (schedule: ExamSchedule) => {
    setSelectedSchedule(schedule);
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const resetForm = () => {
    if (isEditing && selectedSchedule) {
      handleEdit(selectedSchedule);
      return;
    }

    const nextGrade = filters.grade ? Number(filters.grade) : 9;
    setScheduleForm({
      ...defaultScheduleForm,
      grade: nextGrade,
      section: requiresStream(nextGrade) ? (filters.section || STREAMS[0]) : undefined,
      academicYear: filters.academicYear,
      semester: filters.semester,
    });
  };

  const validateForm = () => {
    const requiredFields = [
      scheduleForm.grade,
      scheduleForm.subject,
      scheduleForm.date,
      scheduleForm.startTime,
      scheduleForm.endTime,
      scheduleForm.room,
      scheduleForm.invigilator,
    ];

    if (requiredFields.some((value) => !value)) {
      return "Please fill in all required fields.";
    }

    if (requiresStream(scheduleForm.grade) && !scheduleForm.section) {
      return `Stream is required for Grade ${scheduleForm.grade}.`;
    }

    if (scheduleForm.endTime <= scheduleForm.startTime) {
      return "End Time must be after Start Time.";
    }

    const subjectAllowed = availableSubjectOptions.some(
      (option) => option.value === scheduleForm.subject
    );

    if (!subjectAllowed) {
      return `Subject must belong to selected Grade ${scheduleForm.grade}${scheduleForm.section ? ` ${scheduleForm.section}` : ""}.`;
    }

    const roomTaken = matchingSchedulesForSelection.some(
      (schedule) => schedule.room === scheduleForm.room
    );

    if (roomTaken) {
      return "Selected room is already assigned at the same date and time.";
    }

    const invigilatorTaken = matchingSchedulesForSelection.some(
      (schedule) => schedule.invigilator === scheduleForm.invigilator
    );

    if (invigilatorTaken) {
      return "Selected teacher is already assigned at the same date and time.";
    }

    const classOverlap = matchingSchedulesForSelection.some(
      (schedule) =>
        schedule.grade === scheduleForm.grade &&
        (!requiresStream(scheduleForm.grade) || schedule.section === scheduleForm.section)
    );

    if (classOverlap) {
      return `This grade${scheduleForm.section ? ` ${scheduleForm.section}` : ""} already has an overlapping exam.`;
    }

    return null;
  };

  const handleFormSubmit = () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const examType = scheduleForm.examType || "Midterm";
    const data: CreateExamScheduleData = {
      examName: `${examType} - ${scheduleForm.subject}`,
      examType,
      subject: scheduleForm.subject,
      grade: Number(scheduleForm.grade),
      section: requiresStream(scheduleForm.grade) ? (scheduleForm.section || STREAMS[0]) : undefined,
      academicYear: scheduleForm.academicYear,
      semester: scheduleForm.semester,
      date: scheduleForm.date,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      duration:
        (Number(scheduleForm.endTime.split(":")[0]) * 60 + Number(scheduleForm.endTime.split(":")[1])) -
        (Number(scheduleForm.startTime.split(":")[0]) * 60 + Number(scheduleForm.startTime.split(":")[1])),
      room: scheduleForm.room,
      invigilator: scheduleForm.invigilator,
      notes: scheduleForm.notes,
    };

    if (isEditing && selectedSchedule) {
      updateSchedule.mutate(
        { id: getScheduleId(selectedSchedule as ExamSchedule & { _id?: string }), data },
        {
          onSuccess: () => {
            setFormModalOpen(false);
            setSelectedSchedule(null);
            refetch();
          },
        }
      );
    } else {
      createSchedule.mutate(data, {
        onSuccess: () => {
          setFormModalOpen(false);
          setScheduleForm(defaultScheduleForm);
          refetch();
        },
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSchedule) {
      deleteSchedule.mutate(getScheduleId(selectedSchedule as ExamSchedule & { _id?: string }), {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedSchedule(null);
          refetch();
        },
      });
    }
  };

  const handleAutoGenerate = () => {
    autoGenerate.mutate(autoGenerateForm, {
      onSuccess: () => {
        setAutoGenerateModalOpen(false);
        refetch();
      },
    });
  };

  const handleRegenerate = () => {
    regenerate.mutate(autoGenerateForm, {
      onSuccess: () => {
        setAutoGenerateModalOpen(false);
        setSelectedSchedule(null);
        refetch();
      },
    });
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = [
        "Exam Name",
        "Type",
        "Subject",
        "Grade",
        "Stream",
        "Date",
        "Start Time",
        "End Time",
        "Duration (min)",
        "Room",
        "Invigilator",
        "Notes",
        "Status",
      ];

      const rows = schedules.map((s) => [
        s.examName,
        s.examType,
        s.subject,
        s.grade,
        s.section || "",
        new Date(s.date).toLocaleDateString(),
        s.startTime,
        s.endTime,
      s.duration,
      s.room || "N/A",
      s.invigilator || "N/A",
      s.notes || "",
      s.status,
    ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => csvEscape(cell)).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam-schedule-${filters.academicYear}-${filters.semester}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Exam schedule exported successfully");
    } catch (error) {
      console.error("Failed to export exam schedule:", error);
      toast.error("Failed to export exam schedule");
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled":
        return theme.palette.info.main;
      case "In Progress":
        return theme.palette.warning.main;
      case "Completed":
        return theme.palette.success.main;
      case "Cancelled":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const openScheduleUtilityDialog = (mode: ScheduleDialogMode) => {
    if (mode === "regenerate" && (!filters.grade || !filters.examType)) {
      toast.error("Filter by grade and exam type before regenerating the visible plan.");
      return;
    }

    if (mode === "regenerate" && filters.grade && requiresStream(Number(filters.grade)) && !filters.section) {
      toast.error("Choose a stream before regenerating Grade 11 or 12 schedules.");
      return;
    }

    const visibleDates = schedules
      .map((schedule) => formatDateInput(schedule.date))
      .filter(Boolean)
      .sort();

    const nextGrade = filters.grade ? Number(filters.grade) : 9;
    setScheduleDialogMode(mode);
    setSelectedSchedule(null);
    setAutoGenerateForm({
      grade: nextGrade,
      section: requiresStream(nextGrade) ? (filters.section || STREAMS[0]) : "",
      academicYear: filters.academicYear,
      semester: filters.semester,
      examType: (filters.examType as "Midterm" | "Final" | "Mock") || "Midterm",
      startDate: visibleDates[0] || "",
      endDate: visibleDates[visibleDates.length - 1] || "",
    });
    setAutoGenerateModalOpen(true);
  };

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: t('exam.dashboard'), path: dashboardPath },
          { label: t('exam.academic') },
          { label: t('exam.examSchedule') },
        ]}
      />
      <PageHeader
        title={t('exam.examSchedule')}
        subtitle={
          user?.role === "Teacher"
            ? t('exam.teacherSubtitle')
            : undefined
        }
      />

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.academicYear')}</InputLabel>
              <Select
                label={t('exam.academicYear')}
                value={filters.academicYear}
                onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
              >
                {ACADEMIC_YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.semester')}</InputLabel>
              <Select
                label={t('exam.semester')}
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              >
                {SEMESTERS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.grade')}</InputLabel>
              <Select
                label={t('exam.grade')}
                value={filters.grade}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
              >
                <MenuItem value="">{t('exam.allGrades')}</MenuItem>
                {GRADES.map((g) => (
                  <MenuItem key={g} value={g}>
                    {t('exam.grade')} {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {filters.grade && requiresStream(Number(filters.grade)) && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('exam.stream')}</InputLabel>
                <Select
                  label={t('exam.stream')}
                  value={filters.section}
                  onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                >
                  <MenuItem value="">{t('exam.allStreams')}</MenuItem>
                  {STREAMS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.examType')}</InputLabel>
              <Select
                label={t('exam.examType')}
                value={filters.examType}
                onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
              >
                <MenuItem value="">{t('exam.allTypes')}</MenuItem>
                {EXAM_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({
                academicYear: "2025-2026",
                semester: "Semester 1",
                grade: "",
                section: "",
                examType: "",
              })}
              sx={{ height: 40 }}
            >
              {t('exam.clearFilters')}
            </Button>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {canManageSchedules && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreate}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                },
              }}
            >
              {t('exam.createExamManual')}
            </Button>
          )}
          {canManageSchedules && (
            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={() => openScheduleUtilityDialog("generate")}
            >
              {t('exam.autoGenerateSchedule')}
            </Button>
          )}
          {canManageSchedules && (
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => openScheduleUtilityDialog("regenerate")}
            >
              {t('exam.regenerateOptimize')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCSV}
            disabled={schedules.length === 0 || exporting}
          >
            {exporting ? t('exam.exporting') : t('exam.exportSchedule')}
          </Button>
        </Box>
      </Paper>

      {/* Exam Schedules Table */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.examName')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.subject')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.class')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.date')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.time')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.room')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.invigilator')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('exam.status')}</TableCell>
                {canManageSchedules && <TableCell sx={{ fontWeight: 600 }}>{t('exam.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {isSchedulesError ? (
                <TableRow>
                  <TableCell colSpan={canManageSchedules ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <Alert severity="error">{t('exam.failedToLoad')}</Alert>
                  </TableCell>
                </TableRow>
              ) : isLoadingSchedules ? (
                <TableRow>
                  <TableCell colSpan={canManageSchedules ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageSchedules ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('exam.noExamSchedulesFound')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => (
                  <TableRow key={getScheduleId(schedule as ExamSchedule & { _id?: string })} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {schedule.examName}
                      </Typography>
                      <Chip
                        size="small"
                        label={schedule.examType}
                        sx={{ mt: 0.5 }}
                      />
                    </TableCell>
                    <TableCell>{schedule.subject}</TableCell>
                    <TableCell>
                      {t('exam.grade')} {schedule.grade}
                      {requiresStream(schedule.grade) && schedule.section
                        ? ` - ${t('exam.stream')} ${schedule.section}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarToday fontSize="small" />
                        {new Date(schedule.date).toLocaleDateString()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AccessTime fontSize="small" />
                        {schedule.startTime} - {schedule.endTime}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Room fontSize="small" />
                        {schedule.room || "N/A"}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Person fontSize="small" />
                        {schedule.invigilator || "N/A"}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={schedule.status}
                        sx={{
                          backgroundColor: alpha(getStatusColor(schedule.status), 0.1),
                          color: getStatusColor(schedule.status),
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    {canManageSchedules && (
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setSelectedSchedule(schedule);
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }}
      >
        <MenuItem onClick={() => selectedSchedule && handleEdit(selectedSchedule)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.edit')}</ListItemText>
        </MenuItem>
        {canDeleteSchedules && (
          <MenuItem
            onClick={() => selectedSchedule && handleDelete(selectedSchedule)}
            sx={{ color: theme.palette.error.main }}
          >
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: theme.palette.error.main }} />
            </ListItemIcon>
            <ListItemText>{t('common.delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Modal */}
      <Dialog
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 600,
          }}
        >
          {isEditing ? t('common.edit') + ' ' + t('exam.examSchedule') : t('common.create') + ' ' + t('exam.examSchedule')}
          <IconButton size="small" onClick={() => setFormModalOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Identification Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose the grade, stream, and subject for this exam.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('exam.grade')}</InputLabel>
                    <Select
                      label={t('exam.grade')}
                      value={scheduleForm.grade}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          grade: Number(e.target.value),
                          section: requiresStream(Number(e.target.value)) ? STREAMS[0] : undefined,
                          subject: "",
                          room: "",
                          invigilator: "",
                        })
                      }
                    >
                      {GRADES.map((grade) => (
                        <MenuItem key={grade} value={grade}>
                          {t('exam.grade')} {grade}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {requiresStream(scheduleForm.grade) && (
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth required>
                      <InputLabel>{t('exam.stream')}</InputLabel>
                      <Select
                        label={t('exam.stream')}
                        value={scheduleForm.section}
                        onChange={(e) =>
                          setScheduleForm({
                            ...scheduleForm,
                            section: e.target.value,
                            subject: "",
                            room: "",
                            invigilator: "",
                          })
                        }
                      >
                        {STREAMS.map((stream) => (
                          <MenuItem key={stream} value={stream}>
                            {stream}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid size={{ xs: 12, md: requiresStream(scheduleForm.grade) ? 4 : 8 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('exam.subject')}</InputLabel>
                    <Select
                      label={t('exam.subject')}
                      value={scheduleForm.subject}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                    >
                      {availableSubjectOptions.map((subject) => (
                        <MenuItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('exam.academicYear')}</InputLabel>
                    <Select
                      label={t('exam.academicYear')}
                      value={scheduleForm.academicYear}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, academicYear: e.target.value })
                      }
                    >
                      {ACADEMIC_YEARS.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('exam.semester')}</InputLabel>
                    <Select
                      label={t('exam.semester')}
                      value={scheduleForm.semester}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, semester: e.target.value })}
                    >
                      {SEMESTERS.map((semester) => (
                        <MenuItem key={semester} value={semester}>
                          {semester}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('exam.examType')}</InputLabel>
                    <Select
                      label={t('exam.examType')}
                      value={scheduleForm.examType}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          examType: e.target.value as "" | "Midterm" | "Final" | "Mock",
                        })
                      }
                    >
                      <MenuItem value="">Use default</MenuItem>
                      {EXAM_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Schedule Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set the exam date, start time, and end time.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Exam Date"
                    type="date"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Start Time"
                    type="time"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="End Time"
                    type="time"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Resource Assignment Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Assign an available room and invigilator.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('exam.room')}</InputLabel>
                    <Select
                      label={t('exam.room')}
                      value={scheduleForm.room}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                    >
                      {availableRooms.map((room) => (
                        <MenuItem key={room.value} value={room.value} disabled={room.disabled}>
                          {room.label}{room.disabled ? " (Unavailable)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('exam.invigilator')}</InputLabel>
                    <Select
                      label={t('exam.invigilator')}
                      value={scheduleForm.invigilator}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, invigilator: e.target.value })
                      }
                    >
                      {availableInvigilators.map((option) => (
                        <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                          {option.label}{option.disabled ? " (Unavailable)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                Additional Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add optional notes for coordinators and invigilators.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Notes"
                    multiline
                    rows={2}
                    fullWidth
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setFormModalOpen(false)} variant="outlined">
            {t('common.cancel')}
          </Button>
          <Button onClick={resetForm} variant="outlined">
            {t('common.reset')}
          </Button>
          <Button
            onClick={handleFormSubmit}
            variant="contained"
            disabled={createSchedule.isPending || updateSchedule.isPending}
          >
            {createSchedule.isPending || updateSchedule.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Generate Modal */}
      <Dialog
        open={autoGenerateModalOpen}
        onClose={() => setAutoGenerateModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {scheduleDialogMode === "regenerate" ? t('exam.regenerateOptimize') : t('exam.autoGenerateSchedule')}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.grade')}</InputLabel>
              <Select
                label={t('exam.grade')}
                value={autoGenerateForm.grade}
                onChange={(e) =>
                  setAutoGenerateForm({
                    ...autoGenerateForm,
                    grade: Number(e.target.value),
                    section: requiresStream(Number(e.target.value)) ? STREAMS[0] : "",
                  })
                }
              >
                {GRADES.map((g) => (
                  <MenuItem key={g} value={g}>
                    {t('exam.grade')} {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {requiresStream(autoGenerateForm.grade) && (
              <FormControl fullWidth size="small">
                <InputLabel>{t('exam.stream')}</InputLabel>
                <Select
                  label={t('exam.stream')}
                  value={autoGenerateForm.section}
                  onChange={(e) => setAutoGenerateForm({ ...autoGenerateForm, section: e.target.value })}
                >
                  {STREAMS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.academicYear')}</InputLabel>
              <Select
                label={t('exam.academicYear')}
                value={autoGenerateForm.academicYear}
                onChange={(e) =>
                  setAutoGenerateForm({ ...autoGenerateForm, academicYear: e.target.value })
                }
              >
                {ACADEMIC_YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.semester')}</InputLabel>
              <Select
                label={t('exam.semester')}
                value={autoGenerateForm.semester}
                onChange={(e) =>
                  setAutoGenerateForm({ ...autoGenerateForm, semester: e.target.value })
                }
              >
                {SEMESTERS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>{t('exam.examType')}</InputLabel>
              <Select
                label={t('exam.examType')}
                value={autoGenerateForm.examType}
                onChange={(e) =>
                  setAutoGenerateForm({ ...autoGenerateForm, examType: e.target.value as "Midterm" | "Final" | "Mock" })
                }
              >
                {EXAM_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={autoGenerateForm.startDate}
              onChange={(e) => setAutoGenerateForm({ ...autoGenerateForm, startDate: e.target.value })}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={autoGenerateForm.endDate}
              onChange={(e) => setAutoGenerateForm({ ...autoGenerateForm, endDate: e.target.value })}
            />
            {scheduleDialogMode === "regenerate" && (
              <>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  Regenerate rebuilds the currently visible filtered plan and relies on backend validation as the final safety net when each record is saved.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setAutoGenerateModalOpen(false)} variant="outlined">
            {t('common.cancel')}
          </Button>
          {scheduleDialogMode === "generate" && (
            <Button
              onClick={handleAutoGenerate}
              variant="contained"
              disabled={autoGenerate.isPending}
              startIcon={<AutoAwesome />}
            >
              {autoGenerate.isPending ? t('common.generating') : t('common.generate')}
            </Button>
          )}
          {scheduleDialogMode === "regenerate" && (
            <Button
              onClick={handleRegenerate}
              variant="contained"
              disabled={regenerate.isPending}
              startIcon={<Refresh />}
              color="warning"
            >
              {regenerate.isPending ? t('common.regenerating') : t('exam.regenerateOptimize')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('common.delete') + ' ' + t('exam.examSchedule')}
        message={t('common.deleteConfirmMessage')}
        confirmText={t('common.delete')}
        loading={deleteSchedule.isPending}
      />
    </Box>
  );
}
