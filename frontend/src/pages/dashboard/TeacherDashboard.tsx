import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  alpha,
  useTheme,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  People,
  School,
  CalendarToday,
  Message,
  Email,
  Refresh,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStudents } from "@/hooks/students/useStudents";
import { useMessages } from "@/hooks/messages/useMessages";
import { useAuthStore } from "@/stores/authStore";
import { apiGet } from "@/services/api";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface AssignedClass {
  grade: string;
  stream?: string;
}

interface TodaySlot {
  startTime: string;
  endTime: string;
  subject: string;
  classLabel: string;
  room: string;
}

const normalizeGradeValue = (value: unknown) =>
  String(value || "")
    .replace(/^Grade\s+/i, "")
    .trim();

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const classBadgeLabel = (cls: AssignedClass) => {
  if (cls.stream) return `Grade ${cls.grade} - ${cls.stream}`;
  return `Grade ${cls.grade}`;
};

export function TeacherDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");

  const { data: studentsData, isLoading: isLoadingStudents, isError: isStudentsError } = useStudents({
    limit: 1000,
  });
  const { data: messagesData, isError: isMessagesError } = useMessages({ folder: "inbox", limit: 1000 });

  const { data: scheduleData, isLoading: isLoadingSchedule, isError: isScheduleError, refetch: refetchSchedule } = useQuery({
    queryKey: ["teacher", "schedule", user?._id || user?.id],
    queryFn: () => apiGet<any>("/teachers/schedule"),
    enabled: Boolean(user && user.role === "Teacher"),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const assignedClasses: AssignedClass[] = useMemo(() => {
    const raw = (user as any)?.teacherProfile?.classes;
    if (!Array.isArray(raw)) return [];

    const unique = new Map<string, AssignedClass>();
    raw.forEach((entry: any) => {
      const grade = normalizeGradeValue(entry?.grade);
      const stream = String(entry?.stream || entry?.section || "").trim() || undefined;
      if (!grade) return;
      const key = `${grade}::${stream || ""}`;
      unique.set(key, { grade, stream });
    });
    return Array.from(unique.values());
  }, [user]);

  const students = Array.isArray((studentsData as any)?.data)
    ? (studentsData as any).data
    : [];
  const messages = Array.isArray((messagesData as any)?.data)
    ? (messagesData as any).data
    : [];

  const assignedStudents = useMemo(() => {
    if (!assignedClasses.length) return [];

    return students.filter((student: any) => {
      const grade = normalizeGradeValue(student?.studentProfile?.grade || student?.grade || "");
      const stream = String(
        student?.studentProfile?.stream || student?.studentProfile?.section || student?.stream || "",
      ).trim();

      const matchesClass = assignedClasses.some((cls) => {
        if (grade !== normalizeGradeValue(cls.grade)) return false;
        if (cls.stream) {
          return stream === cls.stream;
        }
        return true;
      });

      if (!matchesClass) return false;

      if (selectedClassFilter) {
        const classValue = stream || "General";
        if (classValue !== selectedClassFilter) return false;
      }

      if (selectedStatusFilter) {
        const studentStatus = String(student.status || "Active");
        if (studentStatus !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [students, assignedClasses, selectedClassFilter, selectedStatusFilter]);

  const todaySchedule = useMemo<TodaySlot[]>(() => {
    const payload = (scheduleData as any)?.data || scheduleData || {};
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const slots = Array.isArray(payload?.[today]) ? payload[today] : [];

    return slots
      .map((slot: any) => {
        const subject =
          slot?.subject?.name ||
          slot?.subject?.code ||
          slot?.subject ||
          "Subject";
        const classObj = slot?.class || {};
        const classLabel = classObj?.grade ? `Grade ${classObj.grade}` : "Class";
        const startTime = String(slot?.startTime || slot?.period?.startTime || "");
        const endTime = String(slot?.endTime || slot?.period?.endTime || "");
        const room = String(slot?.room || "Room TBD");

        return {
          startTime,
          endTime,
          subject: String(subject),
          classLabel,
          room,
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [scheduleData]);

  const unreadMessages = messages.filter((m: any) => !m.isRead).length;

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
    };
    return colors[color] || colors.primary;
  }, [theme.palette.primary.main, theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main]);

  const handleRefresh = () => {
    refetchSchedule();
  };

  const isRefreshing = isLoadingSchedule;

  const stats = [
    {
      label: "Assigned Classes",
      value: assignedClasses.length,
      icon: <School />,
      color: "primary" as const,
    },
    {
      label: "Assigned Students",
      value: assignedStudents.length,
      icon: <People />,
      color: "info" as const,
    },
    {
      label: "Unread Messages",
      value: unreadMessages,
      icon: <Message />,
      color: "warning" as const,
    },
    {
      label: "Today's Classes",
      value: todaySchedule.length,
      icon: <CalendarToday />,
      color: "success" as const,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h4" fontWeight={700}>
          Teacher Dashboard
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
        Assigned classes, your students, today&apos;s timetable, and inbox overview.
      </Typography>

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
          aria-label="Teacher dashboard tabs"
        >
          <Tab label="Assigned Classes" icon={<School />} iconPosition="start" aria-label="Assigned Classes tab" />
          <Tab label="Assigned Students" icon={<People />} iconPosition="start" aria-label="Assigned Students tab" />
          <Tab label="Today's Schedule" icon={<CalendarToday />} iconPosition="start" aria-label="Today's Schedule tab" />
          <Tab label="Messages" icon={<Message />} iconPosition="start" aria-label="Messages tab" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Assigned Classes
            </Typography>
            {isLoadingSchedule && <LinearProgress sx={{ mb: 2 }} />}
            {assignedClasses.length === 0 ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <School sx={{ fontSize: 48, color: theme.palette.info.main, mb: 2 }} />
                <Typography variant="body1" color="info.main">
                  No assigned classes found in your profile.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {assignedClasses.map((cls, idx) => (
                  <Grid size={{ xs: 12, md: 6 }} key={`${cls.grade}-${cls.stream || idx}`}>
                    <Paper
                      sx={{
                        p: 3,
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                          transform: "translateY(-2px)",
                        },
                      }}
                      onClick={() => navigate("/teacher/students")}
                      aria-label={`View students for ${classBadgeLabel(cls)}`}
                    >
                      <Typography variant="h6" fontWeight={600} mb={1}>
                        {classBadgeLabel(cls)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cls.stream
                          ? `Stream: ${cls.stream}`
                          : "General class assignment"}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
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
                Students In Assigned Classes
              </Typography>
              {assignedStudents.length > 20 && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/teacher/students")}
                  aria-label="View all students"
                >
                  View All Students
                </Button>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter by Class</InputLabel>
                <Select
                  value={selectedClassFilter}
                  label="Filter by Class"
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  aria-label="Filter students by class"
                >
                  <MenuItem value="">All Classes</MenuItem>
                  {assignedClasses.map((cls) => (
                    <MenuItem key={`${cls.grade}-${cls.stream || ""}`} value={cls.stream || "General"}>
                      {classBadgeLabel(cls)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={selectedStatusFilter}
                  label="Filter by Status"
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  aria-label="Filter students by status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {isStudentsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load students. Please try again later.
              </Alert>
            )}
            {isLoadingStudents ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : assignedStudents.length === 0 ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <People sx={{ fontSize: 48, color: theme.palette.info.main, mb: 2 }} />
                <Typography variant="body1" color="info.main">
                  No students matched your assigned classes.
                </Typography>
              </Paper>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student Name</TableCell>
                      <TableCell>Student ID</TableCell>
                      <TableCell>Grade</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignedStudents.slice(0, 20).map((student: any) => {
                      const grade = String(student?.studentProfile?.grade || student?.grade || "-");
                      const classValue =
                        student?.studentProfile?.stream ||
                        student?.stream ||
                        "General";

                      return (
                        <TableRow
                          key={student._id || student.id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => navigate(`/teacher/students/${student._id || student.id}`)}
                          aria-label={`View details for ${student.firstName} ${student.lastName}`}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>
                            {student.firstName || ""} {student.lastName || ""}
                          </TableCell>
                          <TableCell>{student.studentId || student.studentProfile?.studentId || "-"}</TableCell>
                          <TableCell>
                            <Chip label={`Grade ${grade}`} size="small" />
                          </TableCell>
                          <TableCell>{classValue}</TableCell>
                          <TableCell>
                            <Chip
                              label={student.status || "Active"}
                              color={String(student.status || "").toLowerCase() === "active" ? "success" : "default"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                Today&apos;s Schedule
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate("/teacher/timetable")}
                aria-label="View full schedule"
              >
                View Full Schedule
              </Button>
            </Box>
            {isScheduleError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load schedule. Please try again later.
              </Alert>
            )}
            {isLoadingSchedule ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : todaySchedule.length === 0 ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.success.main, 0.1),
                }}
              >
                <CalendarToday sx={{ fontSize: 48, color: theme.palette.success.main, mb: 2 }} />
                <Typography variant="body1" color="success.main">
                  No classes scheduled for today.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {todaySchedule.map((slot, index) => (
                  <Paper
                    key={`${slot.startTime}-${slot.subject}-${index}`}
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      background: alpha(theme.palette.primary.main, 0.05),
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 130 }}>
                      {(slot.startTime || "--:--")} - {(slot.endTime || "--:--")}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {slot.subject}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {slot.classLabel} - {slot.room}
                      </Typography>
                    </Box>
                    <Chip label="Scheduled" color="primary" size="small" />
                  </Paper>
                ))}
              </Box>
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
              <Box sx={{ display: "flex", gap: 1 }}>
                {messages.length > 10 && (
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/teacher/messages")}
                    aria-label="View all messages"
                  >
                    View All Messages
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => navigate("/teacher/messages")}
                  aria-label="Go to messages to reply"
                >
                  Go To Messages To Reply
                </Button>
              </Box>
            </Box>
            {isMessagesError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load messages. Please try again later.
              </Alert>
            )}
            {isLoadingStudents && <LinearProgress sx={{ mb: 2 }} />}
            {messages.length === 0 ? (
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  background: alpha(theme.palette.info.main, 0.1),
                }}
              >
                <Message sx={{ fontSize: 48, color: theme.palette.info.main, mb: 2 }} />
                <Typography variant="body1" color="info.main">
                  No messages yet
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {messages.slice(0, 10).map((msg: any, index: number) => (
                  <Paper
                    key={index}
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      cursor: "pointer",
                      background: !msg.isRead
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "transparent",
                      "&:hover": {
                        background: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                    onClick={() => navigate("/teacher/messages")}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={!msg.isRead ? 600 : 400}>
                        {msg.subject || "No Subject"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        From {msg.senderName || "Unknown sender"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ""}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {msg.content?.substring(0, 100) || ""}
                      </Typography>
                    </Box>
                    {!msg.isRead ? <Chip label="Unread" color="warning" size="small" /> : null}
                  </Paper>
                ))}
              </Box>
            )}
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}

export default TeacherDashboard;
