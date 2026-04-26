import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Grid,
  Paper,
  alpha,
  useTheme,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  People,
  School,
  Assessment,
  CalendarToday,
  TrendingUp,
  Warning,
  PersonAdd,
  Edit,
  Delete,
  Search,
  Refresh,
  Announcement,
  Mail,
  Reply,
  Visibility,
  CheckCircle,
} from "@mui/icons-material";
import { useStudents, useUpdateStudent, useDeleteStudent } from "@/hooks/students/useStudents";
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher } from "@/hooks/teachers/useTeachers";
import { useAnnouncements } from "@/hooks/announcements/useAnnouncements";
import { academicYearService } from "@/services/academicYearService";
import { absenceAlertService } from "@/services/absenceAlertService";
import { apiGet, apiPost } from "@/services/api";
import { contactService, type ContactMessage } from "@/services/contactService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GRADES, STREAMS, getSubjectsForGrade } from "@/constants/academic";
import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import toast from "react-hot-toast";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface DashboardStudent {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream?: string;
  attendance: number;
  status: string;
}

interface DashboardTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  status: string;
}

export function SchoolAdminDashboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [createStudentDialogOpen, setCreateStudentDialogOpen] = useState(false);
  const [createTeacherDialogOpen, setCreateTeacherDialogOpen] = useState(false);
  const [editTeacherDialogOpen, setEditTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editStudentDialogOpen, setEditStudentDialogOpen] = useState(false);
  const [deleteStudentDialogOpen, setDeleteStudentDialogOpen] = useState(false);
  const [deleteTeacherDialogOpen, setDeleteTeacherDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    grade: "",
    stream: "",
    phone: "",
    gender: "Male" as "Male" | "Female",
    dob: "",
    enrollmentDate: new Date().toISOString().split("T")[0],
  });
  const [teacherForm, setTeacherForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    classes: [] as Array<{ grade: string; stream?: string }>,
  });

  // Contact Messages State
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactLoading, setContactLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");

  // Fetch real data from API
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    refetch: refetchStudents,
    error: studentsError,
  } = useStudents({ limit: 50 });
  const {
    data: teachersData,
    isLoading: isLoadingTeachers,
    refetch: refetchTeachers,
    error: teachersError,
  } = useTeachers({ limit: 50 });
  const { data: announcementsData } = useAnnouncements({ limit: 10 });
  const navigate = useNavigate();
  const [academicYearData, setAcademicYearData] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch school-wide attendance rate
  const { data: attendanceSummaryData } = useQuery({
    queryKey: ["attendance", "summary", "school"],
    queryFn: () => apiGet<any>("/attendance/summary/school"),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: classesAttendanceData,
    isLoading: isLoadingClassesAttendance,
    refetch: refetchClassesAttendance,
  } = useQuery({
    queryKey: ["attendance", "summary", "classes", 30],
    queryFn: () => apiGet<any>("/attendance/summary/classes", { days: 30 }),
    staleTime: 5 * 60 * 1000,
  });
  const {
    data: atRiskTrendData,
    isLoading: isLoadingAtRiskTrend,
    refetch: refetchAtRiskTrend,
  } = useQuery({
    queryKey: ["attendance", "summary", "at-risk-trend", 30],
    queryFn: () => apiGet<any>("/attendance/summary/at-risk-trend", { days: 30 }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending absence alerts count
  const { data: alertStatsData } = useQuery({
    queryKey: ["absence-alerts", "stats"],
    queryFn: () => absenceAlertService.getStats(),
    staleTime: 2 * 60 * 1000,
  });
  const pendingAlertsCount = (alertStatsData as any)?.unresolvedAlerts ?? 0;

  // Create student via admin/users API (has all required fields)
  const createStudentMutation = useMutation({
    mutationFn: (data: any) => apiPost<any>("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student created successfully");
      setCreateStudentDialogOpen(false);
      setStudentForm({
        firstName: "", lastName: "", email: "", grade: "", stream: "",
        phone: "", gender: "Male", dob: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
      });
      refetchStudents();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create student");
    },
  });

  const createTeacherMutation = useCreateTeacher();
  const updateTeacherMutation = useUpdateTeacher();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();
  const deleteTeacherMutation = useDeleteTeacher();

  // Fetch active academic year
  useEffect(() => {
    academicYearService
      .getActiveAcademicYear()
      .then(setAcademicYearData)
      .catch(() => setAcademicYearData(null));
  }, []);

  const students = useMemo(() => {
    let filteredStudents = studentsData?.data ?? [];
    
    // Apply search filter
    if (searchTerm) {
      filteredStudents = filteredStudents.filter((student: any) => {
        const firstName = student?.firstName ?? student?.user?.firstName ?? "";
        const lastName = student?.lastName ?? student?.user?.lastName ?? "";
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
    }
    
    // Apply grade filter
    if (selectedGrade !== "all") {
      filteredStudents = filteredStudents.filter((student: any) => {
        const grade = student?.grade ?? student?.studentProfile?.grade ?? "";
        return grade === selectedGrade;
      });
    }
    
    return filteredStudents;
  }, [studentsData?.data, searchTerm, selectedGrade]);

  const teachers = teachersData?.data ?? [];

  const announcements = useMemo(() => {
    const data = announcementsData;
    if (Array.isArray(data)) return data;
    return Array.isArray((data as any)?.data) ? (data as any).data : [];
  }, [announcementsData]);

  const studentsByGradeStream = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s: any) => {
      // Normalize grade - handle both "9" and "Grade 9" formats
      let grade = s?.grade ?? s?.studentProfile?.grade ?? "9";
      // Extract just the number if grade is in "Grade X" format
      if (typeof grade === 'string' && grade.toLowerCase().startsWith('grade ')) {
        grade = grade.split(' ')[1];
      }
      let stream =
        grade === "11" || grade === "12"
          ? (s?.stream ?? s?.studentProfile?.stream ?? "")
          : "";
      // Normalize stream values to match STREAMS constants
      if (stream) {
        const streamLower = stream.toLowerCase();
        if (streamLower.includes('natural')) {
          stream = STREAMS.NATURAL;
        } else if (streamLower.includes('social')) {
          stream = STREAMS.SOCIAL;
        }
      }
      const key = stream ? `${grade}-${stream}` : grade;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [students]);

  const handleRefresh = () => {
    refetchStudents();
    refetchTeachers();
    refetchClassesAttendance();
    refetchAtRiskTrend();
  };

  const loadContactMessages = async () => {
    setContactLoading(true);
    try {
      const params = contactStatusFilter !== "all" ? { status: contactStatusFilter } : {};
      const response = await contactService.getAllMessages(params);
      setContactMessages(response?.data || []);
    } catch (error) {
      console.error("Failed to load contact messages:", error);
      toast.error("Failed to load contact messages");
      setContactMessages([]);
    } finally {
      setContactLoading(false);
    }
  };

  const handleViewMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setResponseText(message.adminResponse || "");
    setMessageDialogOpen(true);
  };

  const handleSendResponse = async () => {
    if (!selectedMessage || !responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }
    try {
      await contactService.respondToMessage(selectedMessage._id || selectedMessage.id, responseText);
      toast.success("Response sent successfully");
      setMessageDialogOpen(false);
      setSelectedMessage(null);
      setResponseText("");
      await loadContactMessages();
    } catch (error) {
      console.error("Failed to send response:", error);
      toast.error("Failed to send response");
    }
  };

  const handleUpdateStatus = async (messageId: string, status: 'New' | 'Read' | 'Replied' | 'Archived') => {
    try {
      await contactService.updateStatus(messageId, status);
      toast.success("Status updated successfully");
      await loadContactMessages();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await contactService.deleteMessage(messageId);
      toast.success("Message deleted successfully");
      await loadContactMessages();
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  const fmtDate = (value?: string | null) => {
    if (!value) return "Never";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  // Load contact messages when tab is active
  useEffect(() => {
    if (activeTab === 6) {
      loadContactMessages();
    }
  }, [activeTab, contactStatusFilter]);

  // Calculate stats from real data
  const totalStudents = studentsData?.pagination?.total ?? students.length ?? 0;
  const totalTeachers = teachersData?.pagination?.total ?? teachers.length ?? 0;
  const averageAttendance = (attendanceSummaryData as any)?.data?.attendanceRate ?? 0;
  const classesAttendance = (classesAttendanceData as any)?.data?.classes ?? [];
  const classesAttendanceOverview = (classesAttendanceData as any)?.data?.overview ?? {};
  const classesDailyTrend = (classesAttendanceData as any)?.data?.dailyTrend ?? [];
  const lowAttendanceClasses = (classesAttendanceData as any)?.data?.lowClasses ?? [];
  const atRiskDailyTrend = (atRiskTrendData as any)?.data?.dailyTrend ?? [];
  const atRiskSummary = (atRiskTrendData as any)?.data?.summary ?? {
    averageAtRiskStudents: 0,
    peakAtRiskStudents: 0,
    peakDate: null,
  };
  const classesTrendChartOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: [theme.palette.primary.main],
      stroke: { curve: "smooth", width: 3 },
      markers: { size: 4 },
      xaxis: {
        categories: classesDailyTrend.slice(-7).map((day: any) =>
          new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
        ),
      },
      yaxis: {
        max: 100,
        labels: {
          formatter: (value) => `${Math.round(value)}%`,
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: theme.palette.divider,
      },
      tooltip: {
        y: {
          formatter: (value) => `${value}%`,
        },
      },
    }),
    [classesDailyTrend, theme],
  );
  const classRateBarOptions = useMemo<ApexOptions>(
    () => ({
      chart: { type: "bar", toolbar: { show: false } },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 5,
          barHeight: "60%",
        },
      },
      colors: [theme.palette.info.main],
      xaxis: {
        max: 100,
        categories: classesAttendance.map((entry: any) => entry.classLabel),
        labels: {
          formatter: (value) => `${Math.round(Number(value))}%`,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => `${Math.round(Number(value))}%`,
      },
      grid: {
        borderColor: theme.palette.divider,
      },
      tooltip: {
        y: {
          formatter: (value) => `${value}%`,
        },
      },
    }),
    [classesAttendance, theme],
  );
  const attendanceHeatmapSeries = useMemo(() => {
    const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDate = new Map<string, number>();

    classesDailyTrend.forEach((day: any) => {
      const key = String(day?.date || "");
      if (!key) return;
      byDate.set(key, Number(day?.attendanceRate ?? 0));
    });

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);

    const weekMap = new Map<string, Record<string, number>>();
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const iso = cursor.toISOString().split("T")[0];
      const weekday = weekdayOrder[cursor.getDay()];
      const weekLabel = `W${Math.ceil((cursor.getDate() + new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()) / 7)}`;
      const value = byDate.has(iso) ? Number(byDate.get(iso)) : -1;

      if (!weekMap.has(weekLabel)) {
        weekMap.set(weekLabel, {
          Sun: -1,
          Mon: -1,
          Tue: -1,
          Wed: -1,
          Thu: -1,
          Fri: -1,
          Sat: -1,
        });
      }
      weekMap.get(weekLabel)![weekday] = value;
    }

    const weekEntries = Array.from(weekMap.entries());
    return weekdayOrder.map((weekday) => ({
      name: weekday,
      data: weekEntries.map(([weekLabel, values]) => ({
        x: weekLabel,
        y: values[weekday],
      })),
    }));
  }, [classesDailyTrend]);
  const attendanceHeatmapOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "heatmap",
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: { width: 1, colors: [theme.palette.background.paper] },
      plotOptions: {
        heatmap: {
          radius: 4,
          colorScale: {
            ranges: [
              { from: -1, to: -1, color: theme.palette.grey[300], name: "No Data" },
              { from: 0, to: 69, color: theme.palette.error.main, name: "<70%" },
              { from: 70, to: 84, color: theme.palette.warning.main, name: "70-84%" },
              { from: 85, to: 100, color: theme.palette.success.main, name: "85-100%" },
            ],
          },
        },
      },
      xaxis: {
        title: { text: "Week of Month" },
      },
      yaxis: {
        title: { text: "Day" },
      },
      tooltip: {
        y: {
          formatter: (value) => (value < 0 ? "No data" : `${value}%`),
        },
      },
      legend: {
        show: true,
        position: "bottom",
      },
    }),
    [theme],
  );
  const atRiskTrendOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: [theme.palette.error.main],
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.35,
          opacityTo: 0.06,
          stops: [0, 90, 100],
        },
      },
      markers: { size: 3 },
      xaxis: {
        categories: atRiskDailyTrend.map((entry: any) =>
          new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ),
      },
      yaxis: {
        labels: {
          formatter: (value) => `${Math.round(value)}`,
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: theme.palette.divider,
      },
      tooltip: {
        y: {
          formatter: (value) => `${value} students`,
        },
      },
    }),
    [atRiskDailyTrend, theme],
  );

  const gradeOptions = [...GRADES];
  const streamOptions = [STREAMS.NATURAL, STREAMS.SOCIAL];

  const handleCreateStudent = async () => {
    if (!studentForm.firstName || !studentForm.lastName || !studentForm.email ||
        !studentForm.grade || !studentForm.dob || !studentForm.gender) {
      toast.error("Please fill in all required fields (name, email, grade, gender, date of birth)");
      return;
    }
    // Stream is required for grades 11 and 12
    if ((studentForm.grade === "11" || studentForm.grade === "12") && !studentForm.stream) {
      toast.error("Stream is required for Grade 11 and 12 students");
      return;
    }
    // Stream should not be set for grades 9 and 10
    if ((studentForm.grade === "9" || studentForm.grade === "10") && studentForm.stream) {
      toast.error("Stream should not be set for Grade 9 and 10 students");
      return;
    }
    const username = studentForm.email.split("@")[0] + "_" + Date.now().toString().slice(-4);
    createStudentMutation.mutate({
      role: "Student",
      firstName: studentForm.firstName,
      lastName: studentForm.lastName,
      email: studentForm.email,
      username,
      phone: studentForm.phone || undefined,
      grade: studentForm.grade,
      stream: studentForm.stream || undefined,
      gender: studentForm.gender,
      dateOfBirth: studentForm.dob,
      enrollmentDate: studentForm.enrollmentDate,
    });
  };

  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setStudentForm({
      firstName: student?.firstName || student?.user?.firstName || "",
      lastName: student?.lastName || student?.user?.lastName || "",
      email: student?.email || student?.user?.email || "",
      grade: student?.grade || student?.studentProfile?.grade || "",
      stream: student?.stream || student?.studentProfile?.stream || "",
      phone: student?.phone || student?.user?.phone || "",
      gender: student?.gender || student?.studentProfile?.gender || "Male" as "Male" | "Female",
      dob: student?.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : "",
      enrollmentDate: student?.enrollmentDate ? new Date(student.enrollmentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    });
    setEditStudentDialogOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    // Stream is required for grades 11 and 12
    if ((studentForm.grade === "11" || studentForm.grade === "12") && !studentForm.stream) {
      toast.error("Stream is required for Grade 11 and 12 students");
      return;
    }
    // Stream should not be set for grades 9 and 10
    if ((studentForm.grade === "9" || studentForm.grade === "10") && studentForm.stream) {
      toast.error("Stream should not be set for Grade 9 and 10 students");
      return;
    }
    try {
      await updateStudentMutation.mutateAsync({
        id: editingStudent._id || editingStudent.id,
        data: {
          firstName: studentForm.firstName,
          lastName: studentForm.lastName,
          phone: studentForm.phone || undefined,
          grade: studentForm.grade,
          stream: studentForm.stream || undefined,
          gender: studentForm.gender,
        },
      });
      setEditStudentDialogOpen(false);
      setEditingStudent(null);
      setStudentForm({
        firstName: "", lastName: "", email: "", grade: "", stream: "",
        phone: "", gender: "Male", dob: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
      });
      refetchStudents();
    } catch {
      // error handled by mutation onError
    }
  };

  const handleDeleteStudent = (student: any) => {
    setEditingStudent(student);
    setDeleteStudentDialogOpen(true);
  };

  const confirmDeleteStudent = async () => {
    if (!editingStudent) return;
    try {
      await deleteStudentMutation.mutateAsync(editingStudent._id || editingStudent.id);
      setDeleteStudentDialogOpen(false);
      setEditingStudent(null);
      refetchStudents();
    } catch {
      // error handled by mutation onError
    }
  };

  const handleDeleteTeacher = (teacher: any) => {
    setEditingTeacher(teacher);
    setDeleteTeacherDialogOpen(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!editingTeacher) return;
    try {
      await deleteTeacherMutation.mutateAsync(editingTeacher._id || editingTeacher.id);
      setDeleteTeacherDialogOpen(false);
      setEditingTeacher(null);
      refetchTeachers();
    } catch {
      // error handled by mutation onError
    }
  };

  const handleEditTeacher = (teacher: any) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      firstName: teacher.firstName || "",
      lastName: teacher.lastName || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      subject: teacher.teacherProfile?.subjects?.[0] || teacher.subject || "",
      classes: teacher.teacherProfile?.classes || [],
    });
    setEditTeacherDialogOpen(true);
  };

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return;
    try {
      await updateTeacherMutation.mutateAsync({
        id: editingTeacher._id || editingTeacher.id,
        data: {
          firstName: teacherForm.firstName,
          lastName: teacherForm.lastName,
          phone: teacherForm.phone || undefined,
          subjects: teacherForm.subject ? [teacherForm.subject] : [],
          classes: teacherForm.classes.map(c => ({ grade: c.grade, section: c.stream || '' })),
        },
      });
      setEditTeacherDialogOpen(false);
      setEditingTeacher(null);
      setTeacherForm({ firstName: "", lastName: "", email: "", phone: "", subject: "", classes: [] });
      refetchTeachers();
    } catch (error) {
      console.error("Update teacher error:", error);
    }
  };
  const handleCreateTeacher = async () => {
    if (!teacherForm.firstName || !teacherForm.lastName || !teacherForm.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await createTeacherMutation.mutateAsync({
        firstName: teacherForm.firstName,
        lastName: teacherForm.lastName,
        email: teacherForm.email,
        phone: teacherForm.phone || undefined,
        subjects: teacherForm.subject ? [teacherForm.subject] : [],
      } as any);
      setCreateTeacherDialogOpen(false);
      setTeacherForm({ firstName: "", lastName: "", email: "", phone: "", subject: "", classes: [] });
    } catch {
      // error handled by mutation onError
    }
  };

  
  const getColor = (color: string) => {
    const colors: Record<string, { main: string; bg: string }> = {
      primary: {
        main: theme.palette.primary.main,
        bg: alpha(theme.palette.primary.main, 0.1),
      },
      info: {
        main: theme.palette.info.main,
        bg: alpha(theme.palette.info.main, 0.1),
      },
      success: {
        main: theme.palette.success.main,
        bg: alpha(theme.palette.success.main, 0.1),
      },
      warning: {
        main: theme.palette.warning.main,
        bg: alpha(theme.palette.warning.main, 0.1),
      },
    };
    return colors[color] || colors.primary;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        School Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        School management, student records, teacher assignments, and
        administrative operations
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${
                getColor("primary").bg
              } 0%, ${alpha(
                theme.palette.background.paper as string,
                1,
              )} 100%)`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: getColor("primary").bg,
                  color: getColor("primary").main,
                }}
              >
                <School />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {totalStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.totalStudents')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${
                getColor("info").bg
              } 0%, ${alpha(
                theme.palette.background.paper as string,
                1,
              )} 100%)`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: getColor("info").bg,
                  color: getColor("info").main,
                }}
              >
                <People />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {totalTeachers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.totalTeachers')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${
                getColor("success").bg
              } 0%, ${alpha(
                theme.palette.background.paper as string,
                1,
              )} 100%)`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: getColor("success").bg,
                  color: getColor("success").main,
                }}
              >
                <Assessment />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {averageAttendance}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.attendanceRate')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${
                getColor("warning").bg
              } 0%, ${alpha(
                theme.palette.background.paper as string,
                1,
              )} 100%)`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: getColor("warning").bg,
                  color: getColor("warning").main,
                }}
              >
                <Warning />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {pendingAlertsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Alerts
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label={t('pages.dashboard.students')} icon={<School />} iconPosition="start" />
          <Tab label={t('pages.dashboard.teachers')} icon={<People />} iconPosition="start" />
          <Tab label={t('pages.dashboard.classes')} icon={<Assessment />} iconPosition="start" />
          <Tab label="Calendar" icon={<CalendarToday />} iconPosition="start" />
          <Tab label={t('pages.dashboard.announcements')} icon={<Announcement />} iconPosition="start" />
          <Tab label={t('pages.dashboard.reports')} icon={<Assessment />} iconPosition="start" />
          <Tab label={t('contactMessages.title')} icon={<Mail />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {t('pages.dashboard.students')} {t('common.settings')}
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                >
                  {t('common.refresh')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => setCreateStudentDialogOpen(true)}
                >
                  {t('pages.dashboard.createStudent')}
                </Button>
            </Box>
          </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('pages.dashboard.searchStudents')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Search sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Grade</InputLabel>
                  <Select 
                    label={t('pages.dashboard.grade')} 
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    <MenuItem value="all">{t('pages.dashboard.allGrades')}</MenuItem>
                    {gradeOptions.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        Grade {grade}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Stream</TableCell>
                    <TableCell>{t('pages.dashboard.attendance')}</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingStudents ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  ) : (
                    students
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage,
                      )
                      .map((student: any) => (
                        <TableRow
                          key={
                            student?.id ?? student?.user?._id ?? Math.random()
                          }
                          hover
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {student?.firstName ??
                                student?.user?.firstName ??
                                ""}{" "}
                              {student?.lastName ??
                                student?.user?.lastName ??
                                ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`Grade ${
                                student?.grade ??
                                student?.studentProfile?.grade ??
                                "-"
                              }`}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {(student?.stream ??
                            student?.studentProfile?.stream) ? (
                              <Chip
                                label={
                                  student?.stream ??
                                  student?.studentProfile?.stream ??
                                  ""
                                }
                                variant="outlined"
                                size="small"
                                color="secondary"
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2">
                                {student?.attendance ?? 0}%
                              </Typography>
                              <Box
                                sx={{
                                  width: 50,
                                  height: 6,
                                  borderRadius: 3,
                                  background: alpha(
                                    theme.palette.grey[500],
                                    0.2,
                                  ),
                                }}
                              >
                                <Box
                                  sx={{
                                    height: "100%",
                                    width: `${student?.attendance ?? 0}%`,
                                    background:
                                      (student?.attendance ?? 0) >= 90
                                        ? theme.palette.success.main
                                        : (student?.attendance ?? 0) >= 80
                                          ? theme.palette.warning.main
                                          : theme.palette.error.main,
                                    borderRadius: 3,
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={student?.status ?? "Active"}
                              color={
                                (student?.status ?? "active")?.toLowerCase() ===
                                "active"
                                  ? "success"
                                  : "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleEditStudent(student)}>
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteStudent(student)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={studentsData?.pagination?.total ?? students.length ?? 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {t('pages.dashboard.teachers')} {t('common.settings')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setCreateTeacherDialogOpen(true)}
              >
                {t('pages.dashboard.createTeacher')}
              </Button>
            </Box>
            <Grid container spacing={2}>
              {teachers.map((teacher: any) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={teacher.id}>
                  <Paper
                    sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: getColor("info").bg,
                        color: getColor("info").main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <People />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {teacher.firstName} {teacher.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {teacher.teacherProfile?.subjects?.[0] ?? teacher.subject ?? "No subject assigned"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton size="small" onClick={() => handleEditTeacher(teacher)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteTeacher(teacher)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.classes')} {t('pages.dashboard.overview')}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.overallAttendance')}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {classesAttendanceOverview.attendanceRate ?? 0}%
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.classes')} {t('common.status')}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {classesAttendanceOverview.totalClasses ?? 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.attendance')} {t('common.status')}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {classesAttendanceOverview.totalRecords ?? 0}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.lowAttendance')} {t('pages.dashboard.classes')}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {classesAttendanceOverview.lowAttendanceClasses ?? 0}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    7-Day {t('pages.dashboard.attendance')} Trend
                  </Typography>
                  {isLoadingClassesAttendance ? (
                    <LinearProgress />
                  ) : classesDailyTrend.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t('common.noData')}
                    </Typography>
                  ) : (
                    <Chart
                      options={classesTrendChartOptions}
                      series={[
                        {
                          name: t("pages.dashboard.attendanceRate"),
                          data: classesDailyTrend.slice(-7).map((day: any) => day.attendanceRate),
                        },
                      ]}
                      type="line"
                      height={240}
                    />
                  )}
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    {t('pages.dashboard.lowestAttendanceClasses')}
                  </Typography>
                  {isLoadingClassesAttendance ? (
                    <LinearProgress />
                  ) : lowAttendanceClasses.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.dashboard.noLowAttendanceClasses')}
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                      {lowAttendanceClasses.map((entry: any) => (
                        <Box
                          key={entry.classLabel}
                          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                        >
                          <Typography variant="body2">{entry.classLabel}</Typography>
                          <Chip
                            label={`${entry.attendanceRate}%`}
                            size="small"
                            color={entry.attendanceRate < 80 ? "error" : "warning"}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                At-Risk Students Trend (Absent/Late)
              </Typography>
              {isLoadingAtRiskTrend ? (
                <LinearProgress />
              ) : atRiskDailyTrend.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('common.noData')}
                </Typography>
              ) : (
                <>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
                    <Chip
                      label={`Avg: ${atRiskSummary.averageAtRiskStudents} students/day`}
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`Peak: ${atRiskSummary.peakAtRiskStudents} (${atRiskSummary.peakDate || "-"})`}
                      color="error"
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  <Chart
                    options={atRiskTrendOptions}
                    series={[
                      {
                        name: "At-Risk Students",
                        data: atRiskDailyTrend.map((entry: any) => entry.atRiskStudents),
                      },
                    ]}
                    type="area"
                    height={260}
                  />
                </>
              )}
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Attendance Heatmap (Last 30 Days)
              </Typography>
              {isLoadingClassesAttendance ? (
                <LinearProgress />
              ) : classesDailyTrend.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('common.noData')}
                </Typography>
              ) : (
                <Chart
                  options={attendanceHeatmapOptions}
                  series={attendanceHeatmapSeries}
                  type="heatmap"
                  height={280}
                />
              )}
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 2, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                {t('pages.dashboard.attendanceByClass')}
              </Typography>
              {isLoadingClassesAttendance ? (
                <LinearProgress />
              ) : classesAttendance.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.noClassAttendanceData')}
                </Typography>
              ) : (
                <Chart
                  options={classRateBarOptions}
                  series={[{ name: t("pages.dashboard.attendanceRate"), data: classesAttendance.map((entry: any) => entry.attendanceRate) }]}
                  type="bar"
                  height={Math.max(260, classesAttendance.length * 48)}
                />
              )}
            </Paper>

            <Grid container spacing={2}>
              {gradeOptions.map((grade) => (
                <Grid size={{ xs: 12, md: 6 }} key={grade}>
                  <Paper sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <School color="primary" />
                      <Typography variant="h6">Grade {grade}</Typography>
                    </Box>
                    <Box>
                      {grade === "11" || grade === "12" ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            mb={1}
                          >
                            {((studentsByGradeStream[`${grade}-${STREAMS.NATURAL}`] || 0) +
                              (studentsByGradeStream[`${grade}-${STREAMS.SOCIAL}`] || 0))}{" "}
                            students
                          </Typography>
                          <Box
                            sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                          >
                            <Chip
                              label={`${STREAMS.NATURAL}: ${studentsByGradeStream[`${grade}-${STREAMS.NATURAL}`] || 0}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={`${STREAMS.SOCIAL}: ${studentsByGradeStream[`${grade}-${STREAMS.SOCIAL}`] || 0}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {studentsByGradeStream[grade] || 0} students
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.timetable')}
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                {academicYearData?.year || t('common.dashboard')}
              </Typography>
              <Grid container spacing={2}>
                {(() => {
                  const events: {
                    event: string;
                    date: string;
                    status: string;
                  }[] = [];
                  if (academicYearData?.semesters?.length) {
                    academicYearData.semesters.forEach(
                      (sem: any, i: number) => {
                        events.push({
                          event: `${sem.name} Start`,
                          date: sem.startDate || "",
                          status: i === 0 ? "Active" : "Upcoming",
                        });
                        if (sem.examPeriodStart) {
                          events.push({
                            event: `${sem.name} Exams`,
                            date: sem.examPeriodStart,
                            status: "Upcoming",
                          });
                        }
                      },
                    );
                  }
                  if (events.length === 0) {
                    events.push(
                      {
                        event: "First Term Start",
                        date: "-",
                        status: "Upcoming",
                      },
                      {
                        event: "Second Term Start",
                        date: "-",
                        status: "Upcoming",
                      },
                    );
                  }
                  return events;
                })().map((item, index) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                    <Paper
                      sx={{
                        p: 2,
                        borderLeft: 4,
                        borderColor:
                          item.status === "Completed"
                            ? theme.palette.success.main
                            : item.status === "Active"
                              ? theme.palette.primary.main
                              : theme.palette.warning.main,
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {item.event}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.date}
                      </Typography>
                      <Chip label={item.status} size="small" sx={{ mt: 1 }} />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Announcements
              </Typography>
              <Button
                variant="contained"
                startIcon={<TrendingUp />}
                onClick={() => navigate("/school-admin/announcements")}
              >
                New Announcement
              </Button>
            </Box>
            <Grid container spacing={2}>
              {announcements.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary">
                    No announcements yet
                  </Typography>
                </Grid>
              ) : (
                announcements.slice(0, 6).map((item: any) => (
                  <Grid
                    size={{ xs: 12, md: 6, lg: 4 }}
                    key={item.id || item._id}
                  >
                    <Paper sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          {item.title}
                        </Typography>
                        <Chip
                          label={item.type || item.category || "General"}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "-"}
                      </Typography>
                    </Paper>
                  </Grid>
                ))
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Reports
            </Typography>
            <Grid container spacing={2}>
              {[
                { title: "Student Attendance Report", color: "primary" },
                { title: "Academic Performance Report", color: "success" },
                { title: "Teacher Workload Report", color: "info" },
                { title: "Class Progress Report", color: "warning" },
              ].map((report, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Paper
                    sx={{
                      p: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      cursor: "pointer",
                      "&:hover": {
                        background: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                    onClick={() => navigate("/school-admin/reports")}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: getColor(report.color).bg,
                        color: getColor(report.color).main,
                      }}
                    >
                      <Assessment />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {report.title}
                      </Typography>
                    </Box>
                    <Button variant="outlined" size="small">
                      Generate
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Contact Messages Tab */}
          <TabPanel value={activeTab} index={6}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {t('contactMessages.title')}
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>{t('contactMessages.status')}</InputLabel>
                  <Select
                    value={contactStatusFilter}
                    label={t('contactMessages.status')}
                    onChange={(e) => setContactStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">{t('contactMessages.allMessages')}</MenuItem>
                    <MenuItem value="New">{t('contactMessages.newMessages')}</MenuItem>
                    <MenuItem value="Read">{t('contactMessages.readMessages')}</MenuItem>
                    <MenuItem value="Replied">{t('contactMessages.repliedMessages')}</MenuItem>
                    <MenuItem value="Archived">{t('contactMessages.archivedMessages')}</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadContactMessages}
                >
                  {t('common.refresh')}
                </Button>
              </Box>
            </Box>
            {contactLoading ? (
              <Box sx={{ py: 4 }}>
                <LinearProgress />
              </Box>
            ) : contactMessages.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  {t('contactMessages.noMessages')}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('contactMessages.from')}</TableCell>
                      <TableCell>{t('contactMessages.email')}</TableCell>
                      <TableCell>{t('contactMessages.subject')}</TableCell>
                      <TableCell>{t('contactMessages.priority')}</TableCell>
                      <TableCell>{t('contactMessages.status')}</TableCell>
                      <TableCell>{t('contactMessages.date')}</TableCell>
                      <TableCell align="right">{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contactMessages.map((message) => (
                      <TableRow key={message._id || message.id}>
                        <TableCell>{message.name}</TableCell>
                        <TableCell>{message.email}</TableCell>
                        <TableCell>{message.subject}</TableCell>
                        <TableCell>
                          <Chip
                            label={message.priority}
                            size="small"
                            color={
                              message.priority === "Urgent"
                                ? "error"
                                : message.priority === "High"
                                  ? "warning"
                                  : message.priority === "Medium"
                                    ? "info"
                                    : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={message.status}
                            size="small"
                            color={
                              message.status === "New"
                                ? "error"
                                : message.status === "Replied"
                                  ? "success"
                                  : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>{fmtDate(message.createdAt)}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleViewMessage(message)}
                          >
                            <Visibility />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateStatus(
                              message._id || message.id,
                              message.status === "New" ? "Read" : "Archived"
                            )}
                          >
                            <CheckCircle />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteMessage(message._id || message.id)}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Paper>

      <Dialog
        open={createStudentDialogOpen}
        onClose={() => setCreateStudentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('pages.dashboard.createStudent')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.firstName')}
                value={studentForm.firstName}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.lastName')}
                value={studentForm.lastName}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('common.email')}
                type="email"
                value={studentForm.email}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Grade</InputLabel>
                <Select
                  value={studentForm.grade}
                  label={t('pages.dashboard.grade')}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, grade: e.target.value })
                  }
                >
                  {gradeOptions.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      Grade {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {(studentForm.grade === "11" || studentForm.grade === "12") && (
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Stream</InputLabel>
                  <Select
                    value={studentForm.stream}
                    label={t('pages.dashboard.stream')}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, stream: e.target.value })
                    }
                  >
                    {streamOptions.map((stream) => (
                      <MenuItem key={stream} value={stream}>
                        {stream}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.phone')}
                value={studentForm.phone}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('pages.dashboard.gender')}</InputLabel>
                <Select
                  value={studentForm.gender}
                  label={t('pages.dashboard.gender')}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, gender: e.target.value as "Male" | "Female" })
                  }
                >
                  <MenuItem value="Male">{t('pages.dashboard.male')}</MenuItem>
                  <MenuItem value="Female">{t('pages.dashboard.female')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.dateOfBirth')}
                type="date"
                value={studentForm.dob}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, dob: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.enrollmentDate')}
                type="date"
                value={studentForm.enrollmentDate}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, enrollmentDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateStudentDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateStudent}
            disabled={createStudentMutation.isPending}
          >
            {createStudentMutation.isPending ? t('common.loading') : t('pages.dashboard.createStudent')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createTeacherDialogOpen}
        onClose={() => setCreateTeacherDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('pages.dashboard.createTeacher')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.firstName')}
                value={teacherForm.firstName}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.lastName')}
                value={teacherForm.lastName}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('common.email')}
                type="email"
                value={teacherForm.email}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.phone')}
                value={teacherForm.phone}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('pages.dashboard.subject')}</InputLabel>
                <Select
                  value={teacherForm.subject}
                  label={t('pages.dashboard.subject')}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, subject: e.target.value })
                  }
                >
                  {[
                    ...new Set([
                      ...getSubjectsForGrade("9"),
                      ...getSubjectsForGrade("11", STREAMS.NATURAL),
                      ...getSubjectsForGrade("11", STREAMS.SOCIAL),
                    ]),
                  ].map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      {subject}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTeacherDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTeacher}
            disabled={createTeacherMutation.isPending}
          >
            {createTeacherMutation.isPending ? t('common.loading') : t('pages.dashboard.createTeacher')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editTeacherDialogOpen}
        onClose={() => setEditTeacherDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('pages.dashboard.editTeacher')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.firstName')}
                value={teacherForm.firstName}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.lastName')}
                value={teacherForm.lastName}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('common.email')}
                type="email"
                value={teacherForm.email}
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.phone')}
                value={teacherForm.phone}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('pages.dashboard.subject')}</InputLabel>
                <Select
                  value={teacherForm.subject}
                  label={t('pages.dashboard.subject')}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, subject: e.target.value })
                  }
                >
                  {[
                    ...new Set([
                      ...getSubjectsForGrade("9"),
                      ...getSubjectsForGrade("11", STREAMS.NATURAL),
                      ...getSubjectsForGrade("11", STREAMS.SOCIAL),
                    ]),
                  ].map((subject) => (
                    <MenuItem key={subject} value={subject}>
                      {subject}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Class Assignments
              </Typography>
              {teacherForm.classes.map((classAssignment: any, index: number) => (
                <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Grade</InputLabel>
                    <Select
                      value={classAssignment.grade}
                      label="Grade"
                      onChange={(e) => {
                        const newClasses = [...teacherForm.classes];
                        newClasses[index] = { ...newClasses[index], grade: e.target.value };
                        setTeacherForm({ ...teacherForm, classes: newClasses });
                      }}
                    >
                      {gradeOptions.map((grade) => (
                        <MenuItem key={grade} value={grade}>
                          Grade {grade}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {(classAssignment.grade === "11" || classAssignment.grade === "12") && (
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Stream</InputLabel>
                      <Select
                        value={classAssignment.stream || ""}
                        label="Stream"
                        onChange={(e) => {
                          const newClasses = [...teacherForm.classes];
                          newClasses[index] = { ...newClasses[index], stream: e.target.value };
                          setTeacherForm({ ...teacherForm, classes: newClasses });
                        }}
                      >
                        <MenuItem value="">No Stream</MenuItem>
                        {streamOptions.map((stream) => (
                          <MenuItem key={stream} value={stream}>
                            {stream}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newClasses = teacherForm.classes.filter((_: any, i: number) => i !== index);
                      setTeacherForm({ ...teacherForm, classes: newClasses });
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setTeacherForm({ ...teacherForm, classes: [...teacherForm.classes, { grade: "9" }] });
                }}
                sx={{ mt: 1 }}
              >
                Add Class
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTeacherDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateTeacher}
            disabled={updateTeacherMutation.isPending}
          >
            {updateTeacherMutation.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editStudentDialogOpen}
        onClose={() => setEditStudentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('pages.dashboard.editStudent')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.firstName')}
                value={studentForm.firstName}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.lastName')}
                value={studentForm.lastName}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('common.email')}
                type="email"
                value={studentForm.email}
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Grade</InputLabel>
                <Select
                  value={studentForm.grade}
                  label={t('pages.dashboard.grade')}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, grade: e.target.value })
                  }
                >
                  {gradeOptions.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      Grade {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {(studentForm.grade === "11" || studentForm.grade === "12") && (
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Stream</InputLabel>
                  <Select
                    value={studentForm.stream}
                    label={t('pages.dashboard.stream')}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, stream: e.target.value })
                    }
                  >
                    {streamOptions.map((stream) => (
                      <MenuItem key={stream} value={stream}>
                        {stream}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('pages.dashboard.phone')}
                value={studentForm.phone}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, phone: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('pages.dashboard.gender')}</InputLabel>
                <Select
                  value={studentForm.gender}
                  label={t('pages.dashboard.gender')}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, gender: e.target.value as "Male" | "Female" })
                  }
                >
                  <MenuItem value="Male">{t('pages.dashboard.male')}</MenuItem>
                  <MenuItem value="Female">{t('pages.dashboard.female')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStudentDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateStudent}
            disabled={updateStudentMutation.isPending}
          >
            {updateStudentMutation.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteStudentDialogOpen}
        onClose={() => setDeleteStudentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('pages.dashboard.deleteStudent')}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {editingStudent?.firstName || editingStudent?.user?.firstName} {editingStudent?.lastName || editingStudent?.user?.lastName}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteStudentDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteStudent}
            disabled={deleteStudentMutation.isPending}
          >
            {deleteStudentMutation.isPending ? t('common.loading') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTeacherDialogOpen}
        onClose={() => setDeleteTeacherDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('pages.dashboard.deleteTeacher')}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {editingTeacher?.firstName} {editingTeacher?.lastName}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTeacherDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteTeacher}
            disabled={deleteTeacherMutation.isPending}
          >
            {deleteTeacherMutation.isPending ? t('common.loading') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Message View/Response Dialog */}
      <Dialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('contactMessages.messageDetails')}</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactMessages.from')}
                  </Typography>
                  <Typography variant="body1">{selectedMessage.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactMessages.email')}
                  </Typography>
                  <Typography variant="body1">{selectedMessage.email}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactMessages.subject')}
                  </Typography>
                  <Typography variant="body1">{selectedMessage.subject}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactMessages.priority')}
                  </Typography>
                  <Chip
                    label={selectedMessage.priority}
                    size="small"
                    color={
                      selectedMessage.priority === "Urgent"
                        ? "error"
                        : selectedMessage.priority === "High"
                          ? "warning"
                          : selectedMessage.priority === "Medium"
                            ? "info"
                            : "default"
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactMessages.message')}
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1, background: alpha(theme.palette.grey[100], 0.5) }}>
                    <Typography variant="body1">{selectedMessage.message}</Typography>
                  </Paper>
                </Grid>
                {selectedMessage.adminResponse && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('contactMessages.response')}
                    </Typography>
                    <Paper sx={{ p: 2, mt: 1, background: alpha(theme.palette.success.light, 0.2) }}>
                      <Typography variant="body1">{selectedMessage.adminResponse}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('contactMessages.respondToMessage')}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={t('contactMessages.writeResponse')}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>{t('contactMessages.close')}</Button>
          <Button
            variant="contained"
            startIcon={<Reply />}
            onClick={handleSendResponse}
            disabled={!responseText.trim()}
          >
            {t('contactMessages.sendResponse')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SchoolAdminDashboard;
