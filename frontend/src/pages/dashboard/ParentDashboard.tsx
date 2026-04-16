import React, { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  People,
  School,
  Assessment,
  CalendarToday,
  Message,
  TrendingUp,
  Warning,
  Email,
  ArrowForward,
  Refresh,
} from "@mui/icons-material";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

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

export function ParentDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { selectedChildId, setSelectedChildId } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const childrenQuery = useQuery({
    queryKey: ["parent", "children"],
    queryFn: () => apiGet<any>("/parents/children"),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  const children: any[] = useMemo(() => {
    const rawChildren =
      childrenQuery.data?.data?.children ||
      childrenQuery.data?.children ||
      childrenQuery.data?.data ||
      [];

    const seen = new Set<string>();
    return (Array.isArray(rawChildren) ? rawChildren : []).filter((child: any) => {
      const id = child?._id || child?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [childrenQuery.data]);
  const [activeChildId, setActiveChildId] = useState<string>(selectedChildId || "");

  // Sync local state with store when store changes
  useEffect(() => {
    if (selectedChildId) {
      setActiveChildId(selectedChildId);
    }
  }, [selectedChildId]);

  const activeChild = useMemo(() => {
    if (activeChildId) return children.find((c) => c?._id === activeChildId || c?.id === activeChildId);
    return children[0] || null;
  }, [children, activeChildId]);

  const childId = activeChild?._id || activeChild?.id || "";

  // Update store when dropdown changes
  const handleChildChange = (newChildId: string) => {
    setActiveChildId(newChildId);
    setSelectedChildId(newChildId);
  };

  const childGradesQuery = useQuery({
    queryKey: ["parent", "child", childId, "grades"],
    queryFn: () => apiGet<any>(`/parents/children/${childId}/grades`),
    enabled: Boolean(childId),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  const childAttendanceQuery = useQuery({
    queryKey: ["parent", "child", childId, "attendance"],
    queryFn: () => apiGet<any>(`/parents/children/${childId}/attendance`),
    enabled: Boolean(childId),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  const absenceAlertsQuery = useQuery({
    queryKey: ["parent", "absence-alerts"],
    queryFn: () => apiGet<any>("/absence-alerts/parent"),
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
  const announcementsQuery = useQuery({
    queryKey: ["parent", "announcements"],
    queryFn: () => apiGet<any>("/parents/announcements"),
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
  const inboxQuery = useQuery({
    queryKey: ["messages", "inbox", "parent"],
    queryFn: () => apiGet<any>("/messages"),
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
  const teachersQuery = useQuery({
    queryKey: ["messages", "recipients", "teachers"],
    queryFn: () => apiGet<any>("/messages/recipients"),
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const gradeRecords: any[] = childGradesQuery.data?.data?.grades || [];
  const gradeRows = useMemo(() => {
    const approved = Array.isArray(gradeRecords)
      ? gradeRecords.filter((r) => r?.status === "Approved" || r?.status === "Submitted")
      : [];
    const bySubject = new Map<string, { subject: string; midterm: number; final: number; average: number }>();
    for (const r of approved) {
      const subject = r?.subject || "Unknown";
      const midExam = Number(r?.marks?.midExam ?? 0);
      const finalExam = Number(r?.marks?.finalExam ?? 0);
      const classQuiz = Number(r?.marks?.classQuiz ?? 0);
      const assignment = Number(r?.marks?.assignment ?? 0);
      const continuousAssessment = Number(r?.marks?.continuousAssessment ?? 0);
      const total = midExam + finalExam + classQuiz + assignment + continuousAssessment;
      bySubject.set(subject, {
        subject,
        midterm: Math.round((midExam / 20) * 100),
        final: Math.round((finalExam / 40) * 100),
        average: Math.round((total / 110) * 100),
      });
    }
    return Array.from(bySubject.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [gradeRecords]);

  const overallAverage = useMemo(() => {
    if (!gradeRows.length) return 0;
    const avg = gradeRows.reduce((sum, r) => sum + (Number(r.average) || 0), 0) / gradeRows.length;
    return Math.round(avg * 10) / 10;
  }, [gradeRows]);

  const attendanceSummary = childAttendanceQuery.data?.data?.summary || null;
  const attendanceRecords: any[] = childAttendanceQuery.data?.data?.records || [];
  const attendanceRate = Number(attendanceSummary?.attendanceRate ?? 0);

  const attendanceByMonth = useMemo(() => {
    const grouped = new Map<string, { month: string; year: string; present: number; absent: number; late: number; rate: number }>();
    for (const r of attendanceRecords) {
      const d = new Date(r?.date);
      if (Number.isNaN(d.getTime())) continue;
      const month = d.toLocaleString("en-US", { month: "long" });
      const year = d.getFullYear().toString();
      const key = `${month} ${year}`;
      const current = grouped.get(key) || { month, year, present: 0, absent: 0, late: 0, rate: 0 };
      if (r?.status === "Present") current.present += 1;
      if (r?.status === "Absent") current.absent += 1;
      if (r?.status === "Late") current.late += 1;
      const total = current.present + current.absent + current.late;
      current.rate = total > 0 ? Math.round((current.present / total) * 100) : 0;
      grouped.set(key, current);
    }
    return Array.from(grouped.values());
  }, [attendanceRecords]);

  const absenceAlerts: any[] = absenceAlertsQuery.data?.data || [];
  const announcements: any[] = announcementsQuery.data?.data || [];
  const inboxItems: any[] = inboxQuery.data?.data || [];
  const teachers: any[] = teachersQuery.data?.data || [];
  const unreadInboxCount = Array.isArray(inboxItems)
    ? inboxItems.filter((item) => !item?.isRead).length
    : 0;

  const stats = [
    {
      label: "Average",
      value: overallAverage ? `${overallAverage}%` : "--",
      icon: <TrendingUp />,
      color: "success" as const,
    },
    {
      label: "Attendance",
      value: attendanceSummary ? `${Math.round(attendanceRate)}%` : "--",
      icon: <CalendarToday />,
      color: "primary" as const,
    },
    { label: "Available Teachers", value: teachers.length, icon: <People />, color: "info" as const },
    {
      label: "Messages",
      value: unreadInboxCount,
      icon: <Message />,
      color: "warning" as const,
    },
  ];

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherId) throw new Error("Please select a teacher");
      if (!messageSubject.trim()) throw new Error("Subject is required");
      if (!messageBody.trim()) throw new Error("Message is required");
      return apiPost("/messages", {
        recipientId: selectedTeacherId,
        subject: messageSubject,
        content: messageBody,
        category: "General",
      });
    },
    onSuccess: () => {
      toast.success("Message sent successfully");
      setMessageDialogOpen(false);
      setSelectedTeacherId("");
      setMessageSubject("");
      setMessageBody("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const getColor = useMemo(() => (color: string) => {
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
      error: {
        main: theme.palette.error.main,
        bg: alpha(theme.palette.error.main, 0.1),
      },
    };
    return colors[color] || colors.primary;
  }, [theme.palette.primary.main, theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main]);

  const handleRefresh = () => {
    childrenQuery.refetch();
    childGradesQuery.refetch();
    childAttendanceQuery.refetch();
    absenceAlertsQuery.refetch();
    announcementsQuery.refetch();
    inboxQuery.refetch();
    teachersQuery.refetch();
  };

  const isRefreshing = childrenQuery.isFetching || childGradesQuery.isFetching || childAttendanceQuery.isFetching || absenceAlertsQuery.isFetching || announcementsQuery.isFetching || inboxQuery.isFetching || teachersQuery.isFetching;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h4" fontWeight={700}>
          Parent Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
        >
          Refresh
        </Button>
      </Box>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Welcome! Here is your child's academic overview.
      </Typography>

      {childrenQuery.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load children data. Please refresh the page.
        </Alert>
      )}

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <People sx={{ fontSize: 40, color: theme.palette.primary.main }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <Typography variant="h5" fontWeight={600}>
                {activeChild
                  ? `${activeChild.firstName ?? ""} ${activeChild.lastName ?? ""}`.trim()
                  : "Child"}
              </Typography>
              {children.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={activeChildId || activeChild?._id || activeChild?.id || ""}
                    label="Select Child"
                    onChange={(e) => handleChildChange(e.target.value)}
                    aria-label="Select child to view"
                  >
                    {children.map((child) => (
                      <MenuItem
                        key={child._id || child.id}
                        value={child._id || child.id}
                      >
                        {child.firstName} {child.lastName}
                        {child.studentProfile?.grade &&
                          ` - Grade ${child.studentProfile.grade}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {activeChild?.studentProfile?.grade
                ? `Grade ${activeChild.studentProfile.grade}`
                : "Grade --"}
              {(activeChild?.studentProfile?.stream || activeChild?.studentProfile?.section) &&
                ` - ${activeChild.studentProfile.stream || activeChild.studentProfile.section}`}
              {activeChild?._id || activeChild?.id
                ? ` - Student ID: ${activeChild._id || activeChild.id}`
                  : ""}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => {
          const color = getColor(stat.color);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${color.bg} 0%, ${alpha(theme.palette.background.paper as string, 1)} 100%)`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: color.bg,
                      color: color.main,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          aria-label="Dashboard tabs"
        >
          <Tab label="Grades" icon={<Assessment />} iconPosition="start" aria-label="Grades tab" />
          <Tab
            label="Attendance"
            icon={<CalendarToday />}
            iconPosition="start"
            aria-label="Attendance tab"
          />
          <Tab label="Absence Alerts" icon={<Warning />} iconPosition="start" aria-label="Absence Alerts tab" />
          <Tab label="Messages" icon={<Message />} iconPosition="start" aria-label="Messages tab" />
          <Tab label="Announcements" icon={<School />} iconPosition="start" aria-label="Announcements tab" />
          <Tab label="Teachers" icon={<People />} iconPosition="start" aria-label="Teachers tab" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Academic Performance
            </Typography>
            {childGradesQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load grades data. Please try again later.
              </Alert>
            )}
            {(childrenQuery.isLoading || childGradesQuery.isLoading) && (
              <LinearProgress sx={{ mb: 2 }} />
            )}
            {gradeRows.length === 0 && !childGradesQuery.isLoading ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <Typography variant="body1" color="info.main">
                  No grade records available for this child yet.
                </Typography>
              </Paper>
            ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell align="center">Midterm</TableCell>
                    <TableCell align="center">Final</TableCell>
                    <TableCell align="center">Average</TableCell>
                    <TableCell align="center">Grade</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradeRows.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.subject}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{row.midterm}%</TableCell>
                      <TableCell align="center">{row.final}%</TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {row.average}%
                          </Typography>
                          <Box
                            sx={{
                              width: 40,
                              height: 6,
                              borderRadius: 3,
                              background: alpha(theme.palette.grey[500], 0.2),
                            }}
                          >
                            <Box
                              sx={{
                                height: "100%",
                                width: `${row.average}%`,
                                background:
                                  row.average >= 90
                                    ? theme.palette.success.main
                                    : row.average >= 80
                                      ? theme.palette.info.main
                                      : theme.palette.warning.main,
                                borderRadius: 3,
                              }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={
                            row.average >= 90
                              ? "Excellent"
                              : row.average >= 80
                                ? "Very Good"
                                : row.average >= 70
                                  ? "Good"
                                  : row.average >= 60
                                    ? "Satisfactory"
                                    : row.average >= 50
                                      ? "Pass"
                                      : "Fail"
                          }
                          color={
                            row.average >= 90
                              ? "success"
                              : row.average >= 80
                                ? "info"
                                : row.average >= 50
                                  ? "warning"
                                  : "error"
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Attendance Record
            </Typography>
            {childAttendanceQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load attendance data. Please try again later.
              </Alert>
            )}
            {childAttendanceQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            {attendanceByMonth.length === 0 && !childAttendanceQuery.isLoading ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <Typography variant="body1" color="info.main">
                  No attendance records available for this child yet.
                </Typography>
              </Paper>
            ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="center">Present</TableCell>
                    <TableCell align="center">Absent</TableCell>
                    <TableCell align="center">Late</TableCell>
                    <TableCell align="center">Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceByMonth.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.month} {row.year}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${row.present} days`}
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${row.absent} days`}
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${row.late} days`}
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {row.rate}%
                          </Typography>
                          <Box
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              background: alpha(theme.palette.grey[500], 0.2),
                            }}
                          >
                            <Box
                              sx={{
                                height: "100%",
                                width: `${row.rate}%`,
                                background:
                                  row.rate >= 90
                                    ? theme.palette.success.main
                                    : row.rate >= 80
                                      ? theme.palette.warning.main
                                      : theme.palette.error.main,
                                borderRadius: 3,
                              }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Absence Alerts
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate("/parent/alerts")}
                startIcon={<ArrowForward />}
                aria-label="View all absence alerts"
              >
                View All Alerts
              </Button>
            </Box>
            {absenceAlertsQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load absence alerts. Please try again later.
              </Alert>
            )}
            {absenceAlertsQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            {absenceAlerts.length === 0 ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.success.main, 0.1),
                }}
              >
                <Typography variant="body1" color="success.main">
                  No absence alerts - Great attendance!
                </Typography>
              </Paper>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Child</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {absenceAlerts.map((alert, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {alert.student?.firstName || ""} {alert.student?.lastName || ""}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {alert.date
                            ? new Date(alert.date).toLocaleDateString()
                            : ""}
                        </TableCell>
                        <TableCell>{alert.subject || alert.course || "--"}</TableCell>
                        <TableCell>{alert.reason || "--"}</TableCell>
                        <TableCell>
                          <Chip
                            label={alert.status || "Pending"}
                            color={
                              alert.status === "Resolved"
                                ? "success"
                                : "warning"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate("/parent/alerts")}
                              aria-label={`View details for absence alert`}
                            >
                              View Details
                            </Button>
                            {alert.parentResponse?.responded ? (
                              <Chip
                                label={alert.parentResponse.response}
                                color="success"
                                size="small"
                              />
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => navigate("/parent/alerts")}
                                aria-label={`Respond to absence alert`}
                              >
                                Respond
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Messages
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/parent/messages")}
                  aria-label="Open inbox messages"
                >
                  Open Inbox
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Email />}
                  onClick={() => setMessageDialogOpen(true)}
                  aria-label="Compose new message"
                >
                  New Message
                </Button>
              </Box>
            </Box>
            {inboxQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load messages. Please try again later.
              </Alert>
            )}
            {inboxQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            <Grid container spacing={2}>
              {inboxItems.map((msg, index) => (
                <Grid size={{ xs: 12 }} key={index}>
                  <Paper
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      cursor: "pointer",
                      background: !msg?.isRead
                        ? alpha(theme.palette.primary.main, 0.06)
                        : "transparent",
                      "&:hover": {
                        background: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                    onClick={() => navigate("/parent/messages")}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        fontWeight={msg?.isRead ? 500 : 700}
                      >
                        {msg.senderName || msg.from || "Sender"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {msg.subject || "--"}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleDateString()
                        : ""}
                    </Typography>
                    <Chip
                      label={msg.isRead ? msg.category || "General" : "Unread"}
                      color={msg.isRead ? "default" : "warning"}
                      size="small"
                    />
                  </Paper>
                </Grid>
              ))}
              {inboxItems.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 3, textAlign: "center" }}>
                    <Typography color="text.secondary">
                      No messages yet. Use "New Message" to contact a teacher.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              School Announcements
            </Typography>
            {announcementsQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load announcements. Please try again later.
              </Alert>
            )}
            {announcementsQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            {announcements.length === 0 && !announcementsQuery.isLoading ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <Typography variant="body1" color="info.main">
                  No announcements available at this time.
                </Typography>
              </Paper>
            ) : (
            <Grid container spacing={2}>
              {announcements.map((item, index) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                  <Paper
                    sx={{
                      p: 3,
                      borderLeft: 4,
                      borderColor: theme.palette.primary.main,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {item.title || item.subject || "Announcement"}
                      </Typography>
                      <Chip label={item.category || item.type || "General"} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {item.date || item.createdAt
                        ? new Date(item.date || item.createdAt).toLocaleDateString()
                        : ""}
                    </Typography>
                    {item.content || item.description || item.message ? (
                      <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                        {item.content || item.description || item.message}
                      </Typography>
                    ) : null}
                  </Paper>
                </Grid>
              ))}
            </Grid>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Contact Teachers
            </Typography>
            {teachersQuery.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load teachers. Please try again later.
              </Alert>
            )}
            {teachersQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            {teachers.length === 0 && !teachersQuery.isLoading ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <Typography variant="body1" color="info.main">
                  No teachers available at this time.
                </Typography>
              </Paper>
            ) : (
            <Grid container spacing={2}>
              {teachers.map((teacher, index) => (
                <Grid size={{ xs: 12, md: 4 }} key={index}>
                  <Paper sx={{ p: 3 }}>
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
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {teacher.name || teacher.fullName || "Teacher"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {teacher.role || "Teacher"}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Email />}
                      onClick={() => {
                        setSelectedTeacherId(teacher.id || teacher._id || "");
                        setMessageSubject("");
                        setMessageBody("");
                        setMessageDialogOpen(true);
                      }}
                      aria-label={`Send message to ${teacher.name || teacher.fullName || "teacher"}`}
                    >
                      Send Message
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            )}
          </TabPanel>
        </Box>
      </Paper>

      <Dialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Message to Teacher</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Select Teacher</InputLabel>
                <Select
                  label="Select Teacher"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  aria-label="Select teacher to message"
                >
                  {teachers.map((teacher, index) => (
                    <MenuItem key={index} value={teacher.id || teacher._id || teacher.name}>
                      {teacher.name || teacher.fullName || "Teacher"}
                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <Typography variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                          - {teacher.subjects.join(", ")}
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)} aria-label="Cancel message">
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={sendMessageMutation.isPending}
            onClick={() => sendMessageMutation.mutate()}
            aria-label="Send message"
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ParentDashboard;
