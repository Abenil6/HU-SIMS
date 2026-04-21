import React, { useMemo, useState } from "react";
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

const classBadgeLabel = (cls: AssignedClass, t: any) => {
  if (cls.stream) return `${t('pages.dashboard.grade')} ${cls.grade} - ${cls.stream}`;
  return `${t('pages.dashboard.grade')} ${cls.grade}`;
};

export function TeacherDashboard() {
  const { t } = useTranslation();
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
      label: t('pages.dashboard.assignedClasses'),
      value: assignedClasses.length,
      icon: <School />,
      color: "primary" as const,
    },
    {
      label: t('pages.dashboard.assignedStudents'),
      value: assignedStudents.length,
      icon: <People />,
      color: "info" as const,
    },
    {
      label: t('pages.dashboard.unreadMessages'),
      value: unreadMessages,
      icon: <Message />,
      color: "warning" as const,
    },
    {
      label: t('pages.dashboard.todaysClasses'),
      value: todaySchedule.length,
      icon: <CalendarToday />,
      color: "success" as const,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h4" fontWeight={700}>
          {t('pages.dashboard.teacherDashboard')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
        >
          {t('common.refresh')}
        </Button>
      </Box>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {t('pages.dashboard.assignedClassesSubtitle')}
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
          <Tab label={t('pages.dashboard.assignedClasses')} icon={<School />} iconPosition="start" aria-label="Assigned Classes tab" />
          <Tab label={t('pages.dashboard.assignedStudents')} icon={<People />} iconPosition="start" aria-label="Assigned Students tab" />
          <Tab label={t('pages.dashboard.todaysSchedule')} icon={<CalendarToday />} iconPosition="start" aria-label="Today's Schedule tab" />
          <Tab label={t('common.messages')} icon={<Message />} iconPosition="start" aria-label="Messages tab" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.assignedClasses')}
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
                  {t('pages.dashboard.noAssignedClasses')}
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
                      aria-label={`View students for ${classBadgeLabel(cls, t)}`}
                    >
                      <Typography variant="h6" fontWeight={600} mb={1}>
                        {classBadgeLabel(cls, t)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cls.stream
                          ? `${t('pages.dashboard.stream')}: ${cls.stream}`
                          : t('pages.dashboard.generalClassAssignment')}
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
                {t('pages.dashboard.studentsInAssignedClasses')}
              </Typography>
              {assignedStudents.length > 20 && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/teacher/students")}
                  aria-label="View all students"
                >
                  {t('pages.dashboard.viewAllStudents')}
                </Button>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('pages.dashboard.filterByClass')}</InputLabel>
                <Select
                  value={selectedClassFilter}
                  label={t('pages.dashboard.filterByClass')}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  aria-label="Filter students by class"
                >
                  <MenuItem value="">{t('pages.dashboard.allClasses')}</MenuItem>
                  {assignedClasses.map((cls) => (
                    <MenuItem key={`${cls.grade}-${cls.stream || ""}`} value={cls.stream || "General"}>
                      {classBadgeLabel(cls, t)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('pages.dashboard.filterByStatus')}</InputLabel>
                <Select
                  value={selectedStatusFilter}
                  label={t('pages.dashboard.filterByStatus')}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  aria-label="Filter students by status"
                >
                  <MenuItem value="">{t('pages.dashboard.allStatus')}</MenuItem>
                  <MenuItem value="Active">{t('pages.dashboard.active')}</MenuItem>
                  <MenuItem value="Inactive">{t('pages.dashboard.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {isStudentsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {t('pages.dashboard.failedToLoadStudents')}
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
                  {t('pages.dashboard.noStudentsMatched')}
                </Typography>
              </Paper>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('pages.dashboard.studentName')}</TableCell>
                      <TableCell>{t('pages.dashboard.studentId')}</TableCell>
                      <TableCell>{t('pages.dashboard.grade')}</TableCell>
                      <TableCell>{t('pages.dashboard.studentClass')}</TableCell>
                      <TableCell>{t('common.status')}</TableCell>
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
                            <Chip label={`${t('pages.dashboard.grade')} ${grade}`} size="small" />
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
                {t('pages.dashboard.todaysSchedule')}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => navigate("/teacher/timetable")}
                aria-label="View full schedule"
              >
                {t('pages.dashboard.viewFullSchedule')}
              </Button>
            </Box>
            {isScheduleError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {t('pages.dashboard.failedToLoadSchedule')}
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
                  {t('pages.dashboard.noClassesToday')}
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
                    <Chip label={t('pages.dashboard.scheduled')} color="primary" size="small" />
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
                {t('common.messages')}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {messages.length > 10 && (
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/teacher/messages")}
                    aria-label="View all messages"
                  >
                    {t('pages.dashboard.viewAllMessages')}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => navigate("/teacher/messages")}
                  aria-label="Go to messages to reply"
                >
                  {t('pages.dashboard.goToMessagesToReply')}
                </Button>
              </Box>
            </Box>
            {isMessagesError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {t('pages.dashboard.failedToLoadMessages')}
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
                  {t('pages.dashboard.noMessagesYet')}
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
                        {msg.subject || t('pages.dashboard.noSubject')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('pages.dashboard.from')} {msg.senderName || t('pages.dashboard.unknownSender')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ""}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {msg.content?.substring(0, 100) || ""}
                      </Typography>
                    </Box>
                    {!msg.isRead ? <Chip label={t('pages.dashboard.unread')} color="warning" size="small" /> : null}
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
