import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  alpha,
  useTheme,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Download,
  PictureAsPdf,
  Assessment,
  People,
  CalendarToday,
  TrendingUp,
  School,
  Code,
  Undo,
  CheckCircle,
  Edit,
  ContentCopy,
  Archive,
  Delete,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { FormModal } from "@/components/ui/FormModal";
import type { FormField } from "@/components/ui/FormModal";
import {
  reportService,
  type ReportType,
  getReportTypeLabel,
  getReportDescription,
} from "@/services/reportService";
import { apiGet } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

interface StudentRecord {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  grade?: string;
  stream?: string;
  section?: string;
  studentProfile?: {
    grade?: string;
    stream?: string;
    section?: string;
  };
}

interface StudentQueryResponse {
  data?: StudentRecord[];
  users?: StudentRecord[];
}

interface ReportApiRecord {
  id?: string;
  _id?: string;
  reportType?: string;
  class?: string;
  createdAt?: string;
  status?: string;
  student?: {
    firstName?: string;
    lastName?: string;
  };
}

interface ReportListResponse {
  data?: ReportApiRecord[];
}

interface RecentReportItem {
  id: string;
  name: string;
  type: ReportType;
  generatedAt: string;
  status: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const gradeOrder: Record<string, number> = {
  "9": 9,
  "10": 10,
  "11": 11,
  "12": 12,
};

const getStudentGrade = (student: StudentRecord) =>
  String(student?.studentProfile?.grade || student?.grade || "").trim();

const getStudentStream = (student: StudentRecord) =>
  String(
    student?.studentProfile?.stream ||
      student?.studentProfile?.section ||
      student?.stream ||
      student?.section ||
      "",
  ).trim();

const getStudentGroupLabel = (student: StudentRecord) => {
  const grade = getStudentGrade(student);
  const stream = getStudentStream(student);

  if (grade === "11" || grade === "12") {
    return stream ? `Grade ${grade} - ${stream}` : `Grade ${grade}`;
  }

  return grade ? `Grade ${grade}` : "Other Students";
};

const getBackendReportType = (reportType: string): ReportType | null => {
  switch (reportType) {
    case "StudentReportCard":
      return "student_report_card";
    case "StudentTranscript":
      return "student_transcript";
    case "ClassProgress":
      return "class_statistics";
    case "PerformanceAnalytics":
      return "academic_performance";
    case "AttendanceSummary":
      return "attendance_summary";
    default:
      return null;
  }
};

const getReportStatusMeta = (status: string) => {
  switch (status) {
    case "Final":
      return { label: "Final", color: "success" as const };
    case "Draft":
      return { label: "Draft", color: "warning" as const };
    case "Archived":
      return { label: "Archived", color: "warning" as const };
    default:
      return { label: status || "Unknown", color: "warning" as const };
  }
};

// Report categories
const reportCategories = [
  { id: "academic", label: "Academic", icon: <School /> },
  { id: "attendance", label: "Attendance", icon: <CalendarToday /> },
  { id: "student", label: "Student", icon: <People /> },
];

const reportTypes: {
  type: ReportType;
  category: string;
  icon: React.ReactNode;
}[] = [
  { type: "student_report_card", category: "student", icon: <School /> },
  { type: "student_transcript", category: "student", icon: <People /> },
  {
    type: "attendance_summary",
    category: "attendance",
    icon: <CalendarToday />,
  },
  { type: "class_statistics", category: "academic", icon: <School /> },
  { type: "academic_performance", category: "academic", icon: <TrendingUp /> },
];

export function ReportsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] =
    useState<ReportType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [reportToRevert, setReportToRevert] = useState<string | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reportToArchive, setReportToArchive] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: reportsData } = useQuery<ReportListResponse>({
    queryKey: ["reports"],
    queryFn: () => reportService.getReports() as Promise<ReportListResponse>,
    staleTime: 60 * 1000,
  });

  const rawReports = useMemo(
    () => (Array.isArray(reportsData?.data) ? reportsData.data : []),
    [reportsData],
  );

  const recentReports = useMemo<RecentReportItem[]>(() => {
    return rawReports
      .map((r) => {
        const mappedType = getBackendReportType(r.reportType || "");
        if (!mappedType) return null;

        return {
      id: r.id || r._id,
      name:
        r.reportType === "StudentReportCard" && r.student?.firstName
          ? `${r.student.firstName} ${r.student.lastName} Report Card`
          : r.reportType === "StudentTranscript" && r.student?.firstName
        ? `${r.student.firstName} ${r.student.lastName} Transcript`
        : r.reportType === "ClassProgress"
        ? `${r.class || "Class"} Progress`
        : r.reportType === "PerformanceAnalytics"
        ? `${r.class || "Class"} Academic Performance`
        : r.reportType === "AttendanceSummary"
        ? "Attendance Summary"
        : r.reportType || "Report",
      type: mappedType,
      generatedAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
      status: r.status || "Draft",
        };
      })
      .filter((report): report is RecentReportItem => report !== null);
  }, [rawReports]);

  const reportStats = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisMonthCount = rawReports.filter(
      (r) => r.createdAt && new Date(r.createdAt).getMonth() === thisMonth
    ).length;
    return {
      total: rawReports.length,
      pdfCount: rawReports.filter((r) =>
        ["StudentReportCard", "StudentTranscript"].includes(r.reportType || ""),
      ).length,
      excelCount: rawReports.filter((r) =>
        ["ClassProgress", "PerformanceAnalytics"].includes(r.reportType || ""),
      ).length,
      thisMonth: thisMonthCount,
    };
  }, [rawReports]);

  const getFilteredReports = () => {
    if (selectedCategory === "all") return reportTypes;
    return reportTypes.filter((r) => r.category === selectedCategory);
  };

  const handleGenerateReport = async (reportType: ReportType) => {
    setSelectedReportType(reportType);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    if (!selectedReportType) return;

    setGeneratingReport(selectedReportType);
    setFormModalOpen(false);

    try {
      const academicYear = String(values.academicYear || "2025-2026");
      const semester = values.semester === "2" ? "Semester 2" : "Semester 1";
      const grade = String(values.grade || "10");

      if (selectedReportType === "student_report_card" && values.studentId) {
        await reportService.generateReportCard({
          studentId: String(values.studentId),
          academicYear,
          semester,
          behaviorGrade: String(values.behaviorGrade || "B") as "A" | "B" | "C",
        });
      } else if (selectedReportType === "student_transcript" && values.studentId) {
        await reportService.generateStudentTranscriptOfficial({
          studentId: String(values.studentId),
        });
      } else if (
        selectedReportType === "class_statistics" ||
        selectedReportType === "academic_performance"
      ) {
        if (selectedReportType === "class_statistics") {
          await reportService.generateClassProgress({
            grade,
            academicYear,
            semester,
          });
        } else {
          await reportService.generateAcademicPerformance({
            grade,
            academicYear,
            semester,
          });
        }
      } else if (selectedReportType === "attendance_summary") {
        const month = String(values.month || "01").padStart(2, "0");
        const reportScope = String(values.reportScope || "class");
        
        if (reportScope === "student") {
          if (!values.studentId || typeof values.studentId !== "string") {
            toast.error("Please select a student for individual report");
            return;
          }
          await reportService.generateAttendanceSummary({
            academicYear,
            month,
            studentId: values.studentId,
          });
        } else {
          await reportService.generateAttendanceSummary({
            academicYear,
            month,
            grade,
          });
        }
      } else {
        toast.error("This report type is not yet supported");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(
        `${getReportTypeLabel(selectedReportType)} generated successfully`,
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to generate report"));
    } finally {
      setGeneratingReport(null);
    }
  };

  const saveBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownload = async (
    reportId: string,
    format: "json" | "csv" | "html",
  ) => {
    setDownloading(reportId);
    try {
      const { blob, filename } = await reportService.downloadReport(reportId, format);

      if (format === "html") {
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, "_blank", "noopener,noreferrer");
        if (printWindow) {
          toast.success("Print view opened for PDF export");
        } else {
          saveBlob(blob, filename || `report-${reportId}.html`);
          toast.success("Printable report downloaded");
        }
        return;
      }

      saveBlob(
        blob,
        filename || `report-${reportId}.${format === "csv" ? "csv" : "json"}`,
      );
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Failed to export ${format.toUpperCase()}`));
    }
  };

  const handleExportAll = () => {
    setDownloading("all");
    try {
      const rows = [
        ["Name", "Type", "Generated At", "Status"],
            ...recentReports.map((report) => [
          report.name,
          getReportTypeLabel(report.type),
          report.generatedAt,
          report.status,
        ]),
      ];
      const csv = rows
        .map((row) =>
          row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      saveBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        `reports-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success("Reports summary exported");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to export reports summary"));
    } finally {
      setDownloading(null);
    }
  };

  const officializeMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/reports/${reportId}/official`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            signedBy: `${user?.firstName} ${user?.lastName}`,
            signatureDate: new Date().toISOString(),
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to officialize report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report approved and sent to student/parent");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve report");
    },
  });

  const handleOfficialize = (reportId: string) => {
    officializeMutation.mutate(reportId);
  };

  const archiveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/reports/${reportId}/archive`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to archive report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive report");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/reports/${reportId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete report");
    },
  });

  const handleArchive = (reportId: string) => {
    setReportToArchive(reportId);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = () => {
    if (reportToArchive) {
      archiveMutation.mutate(reportToArchive);
    }
    setArchiveDialogOpen(false);
    setReportToArchive(null);
  };

  const revertMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001/api"}/reports/${reportId}/revert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to revert report");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report reverted to draft");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revert report");
    },
  });

  const handleRevert = (reportId: string) => {
    setReportToRevert(reportId);
    setRevertDialogOpen(true);
  };

  const handleRevertConfirm = () => {
    if (reportToRevert) {
      revertMutation.mutate(reportToRevert);
    }
    setRevertDialogOpen(false);
    setReportToRevert(null);
  };

  const handleDelete = (reportId: string) => {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteMutation.mutate(reportToDelete);
    }
    setDeleteDialogOpen(false);
    setReportToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setReportToDelete(null);
  };

  const { data: studentsData } = useQuery<StudentQueryResponse>({
    queryKey: ["admin-users-students"],
    queryFn: () =>
      apiGet("/admin/users?role=Student&limit=200&page=1") as Promise<StudentQueryResponse>,
  });
  const studentsList = useMemo(
    () =>
      Array.isArray(studentsData?.data)
        ? studentsData.data
        : Array.isArray(studentsData?.users)
          ? studentsData.users
          : [],
    [studentsData],
  );
  const studentOptions = Array.isArray(studentsList)
    ? [...studentsList]
        .sort((a, b) => {
          const gradeCompare =
            (gradeOrder[getStudentGrade(a)] || 99) - (gradeOrder[getStudentGrade(b)] || 99);
          if (gradeCompare !== 0) return gradeCompare;

          const streamCompare = getStudentStream(a).localeCompare(getStudentStream(b));
          if (streamCompare !== 0) return streamCompare;

          return `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(
            `${b.firstName || ""} ${b.lastName || ""}`,
          );
        })
        .map((s) => ({
          value: s.id || s._id,
          label: `${s.firstName || ""} ${s.lastName || ""} (${s.email || ""})`,
          group: getStudentGroupLabel(s),
        }))
        .filter((option): option is { value: string; label: string; group: string } =>
          Boolean(option.value),
        )
    : [];

  const formFields: FormField[] = [
    ...((selectedReportType === "student_report_card" ||
      selectedReportType === "student_transcript")
      ? [
          {
            name: "studentId",
            label: "Student",
            type: "select" as const,
            required: true,
            options: studentOptions,
          },
        ]
      : []),
    ...(selectedReportType === "student_report_card"
      ? [
          {
            name: "semester",
            label: "Semester",
            type: "select" as const,
            required: true,
            options: [
              { value: "1", label: "Semester 1" },
              { value: "2", label: "Semester 2" },
            ],
            helperText: "Choose which semester the report card should be generated for.",
          },
          {
            name: "behaviorGrade",
            label: "Behavior Grade",
            type: "select" as const,
            required: true,
            options: [
              { value: "A", label: "A" },
              { value: "B", label: "B" },
              { value: "C", label: "C" },
            ],
            helperText: "This behavior grade will be used for the selected semester.",
          },
        ]
      : []),
    ...(selectedReportType === "attendance_summary"
      ? [
          {
            name: "month",
            label: "Month",
            type: "select" as const,
            required: true,
            options: [
              { value: "01", label: "January" },
              { value: "02", label: "February" },
              { value: "03", label: "March" },
              { value: "04", label: "April" },
              { value: "05", label: "May" },
              { value: "06", label: "June" },
              { value: "07", label: "July" },
              { value: "08", label: "August" },
              { value: "09", label: "September" },
              { value: "10", label: "October" },
              { value: "11", label: "November" },
              { value: "12", label: "December" },
            ],
            helperText: "Select the month for attendance records.",
          },
          {
            name: "reportScope",
            label: "Report Scope",
            type: "select" as const,
            required: true,
            options: [
              { value: "class", label: "Class Report (All Students)" },
              { value: "student", label: "Student Report (Individual)" },
            ],
            helperText: "Choose to generate for entire class or a specific student.",
          },
        ]
      : []),
    ...(!["student_transcript", "student_report_card"].includes(String(selectedReportType))
      ? [
          {
            name: "grade",
            label: "Grade",
            type: "select" as const,
            options: [
              { value: "9", label: "Grade 9" },
              { value: "10", label: "Grade 10" },
              { value: "11", label: "Grade 11" },
              { value: "12", label: "Grade 12" },
            ],
          },
        ]
      : []),
    ...(!["student_report_card", "student_transcript"].includes(
      String(selectedReportType),
    )
      ? [
          {
            name: "semester",
            label: "Semester",
            type: "select" as const,
            required: true,
            options: [
              { value: "1", label: "Semester 1" },
              { value: "2", label: "Semester 2" },
            ],
          },
        ]
      : []),
    ...(!["student_transcript"].includes(String(selectedReportType))
      ? [
          {
            name: "academicYear",
            label: "Academic Year",
            type: "select" as const,
            required: true,
            options: [
              { value: "2025-2026", label: "2025-2026" },
              { value: "2024-2025", label: "2024-2025" },
              { value: "2026-2027", label: "2026-2027" },
            ],
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Breadcrumbs items={[{ label: t('common.reports') }]} />

      <PageHeader
        title={t('common.reports')}
        subtitle={user?.role === "Student" || user?.role === "Parent"
          ? t('common.viewAcademicReports')
          : t('common.generateReports')
        }
        action={
          user?.role === "Student" || user?.role === "Parent"
          ? null
          : <Button variant="outlined" startIcon={<Download />} onClick={handleExportAll} disabled={downloading === "all"}>
            {downloading === "all" ? t('common.exporting') : t('common.exportAll')}
          </Button>
        }
      />

      {/* Quick Stats - only show for admin/teachers */}
      {user?.role !== "Student" && user?.role !== "Parent" && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title={t('common.reportsGenerated')}
              value={reportStats.total}
              icon={<Assessment />}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title={t('common.pdfReports')}
              value={reportStats.pdfCount}
              icon={<PictureAsPdf />}
              color="error"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title={t('common.classReports')}
              value={reportStats.excelCount}
              icon={<Assessment />}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title={t('common.thisMonth')}
              value={reportStats.thisMonth}
              icon={<CalendarToday />}
              color="info"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs - only for admin/teachers */}
      {user?.role !== "Student" && user?.role !== "Parent" && (
        <Paper sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab label={t('common.generateReportsTab')} />
            <Tab label={t('common.recentReports')} />
          </Tabs>
        </Paper>
      )}

      {/* Generate Reports Tab - only for admin/teachers */}
      {user?.role !== "Student" && user?.role !== "Parent" && activeTab === 0 && (
        <>
          {/* Category Filter */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <Button
              variant={selectedCategory === "all" ? "contained" : "outlined"}
              onClick={() => setSelectedCategory("all")}
              startIcon={<Assessment />}
            >
              All
            </Button>
            {reportCategories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "contained" : "outlined"}
                onClick={() => setSelectedCategory(cat.id)}
                startIcon={cat.icon}
              >
                {cat.label}
              </Button>
            ))}
          </Box>

          {/* Report Cards */}
          <Grid container spacing={3}>
            {getFilteredReports().map((report) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={report.type}>
                <Card
                  sx={{
                    height: "100%",
                    borderRadius: 3,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          background: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                        }}
                      >
                        {report.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={600}>
                        {getReportTypeLabel(report.type)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {getReportDescription(report.type)}
                    </Typography>
                    <Chip
                      label={
                        report.category.charAt(0).toUpperCase() +
                        report.category.slice(1)
                      }
                      size="small"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={
                        generatingReport === report.type ? (
                          <CircularProgress size={16} />
                        ) : (
                          <PictureAsPdf />
                        )
                      }
                      onClick={() => handleGenerateReport(report.type)}
                      disabled={generatingReport !== null}
                    >
                      {generatingReport === report.type ? t('common.generating') : t('common.generateReport')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Recent Reports Tab - show for all users */}
      {(user?.role === "Student" || user?.role === "Parent" || activeTab === 1) && (
        <Paper sx={{ borderRadius: 3 }}>
          {recentReports.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                {user?.role === "Student" || user?.role === "Parent"
                  ? "No reports available yet. Reports will appear here once generated by your school."
                  : "No reports generated yet. Generate a report from the Generate Reports tab."
                }
              </Typography>
            </Box>
          ) : (
          recentReports.map((report, index) => (
            <Box
              key={report.id}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                borderBottom: index < recentReports.length - 1 ? 1 : 0,
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    background: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <PictureAsPdf sx={{ color: theme.palette.error.main }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {report.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getReportTypeLabel(report.type as ReportType)} •{" "}
                    {report.generatedAt}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Chip
                  label={getReportStatusMeta(report.status).label}
                  size="small"
                  color={getReportStatusMeta(report.status).color}
                  sx={{ textTransform: "capitalize" }}
                />
                {user?.role === "SchoolAdmin" && report.status === "Draft" && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={() => handleOfficialize(report.id)}
                      disabled={officializeMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Archive />}
                      onClick={() => handleArchive(report.id)}
                      disabled={archiveMutation.isPending}
                    >
                      Archive
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDelete(report.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {user?.role === "SchoolAdmin" && report.status === "Final" && (
                  <>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<Undo />}
                      onClick={() => handleRevert(report.id)}
                      disabled={revertMutation.isPending}
                    >
                      Revert to Draft
                    </Button>
                  </>
                )}
                <Button
                  size="small"
                  startIcon={<PictureAsPdf />}
                  onClick={() => handleDownload(report.id, "html")}
                  disabled={downloading === report.id}
                >
                  {downloading === report.id ? "Downloading..." : "Print / PDF"}
                </Button>
                <Button
                  size="small"
                  startIcon={<Download />}
                  onClick={() => handleDownload(report.id, "csv")}
                  disabled={downloading === report.id}
                >
                  {downloading === report.id ? "Downloading..." : "CSV"}
                </Button>
                <Button
                  size="small"
                  startIcon={<Code />}
                  onClick={() => handleDownload(report.id, "json")}
                  disabled={downloading === report.id}
                >
                  {downloading === report.id ? "Downloading..." : "JSON"}
                </Button>
              </Box>
            </Box>
          )))}
        </Paper>
      )}

      {/* Generate Report Modal - only for admin/teachers */}
      {user?.role !== "Student" && user?.role !== "Parent" && (
        <FormModal
          open={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={
            selectedReportType
              ? getReportTypeLabel(selectedReportType)
              : "Generate Report"
          }
          fields={formFields}
          initialValues={{
            studentId: "",
            month: "01",
            grade: "10",
            semester: "1",
            academicYear: "2025-2026",
            behaviorGrade: "B",
          }}
          onSubmit={handleFormSubmit}
          submitText="Generate"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>{t('common.deleteReport')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('common.deleteReportConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleteMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revert to Draft Confirmation Dialog */}
      <Dialog open={revertDialogOpen} onClose={() => setRevertDialogOpen(false)}>
        <DialogTitle>{t('common.revertToDraft')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('common.revertToDraftConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevertDialogOpen(false)} disabled={revertMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRevertConfirm}
            disabled={revertMutation.isPending}
          >
            {t('common.revert')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onClose={() => setArchiveDialogOpen(false)}>
        <DialogTitle>{t('common.archiveReport')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('common.archiveReportConfirm')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)} disabled={archiveMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleArchiveConfirm}
            disabled={archiveMutation.isPending}
          >
            {t('common.archive')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
