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
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from "@mui/material";
import {
  School,
  Assessment,
  CalendarToday,
  Message,
  TrendingUp,
  Assignment,
  Person,
  Download,
  Close,
} from "@mui/icons-material";
import { HonorRollBadge } from "../../components/ui/HonorRollBadge";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";

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

export function StudentDashboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  const profileQuery = useQuery({
    queryKey: ["student", "profile"],
    queryFn: () => apiGet<any>("/students/profile"),
  });
  const gradesQuery = useQuery({
    queryKey: ["student", "grades"],
    queryFn: () => apiGet<any>("/students/grades"),
  });
  const attendanceQuery = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: () => apiGet<any>("/students/attendance"),
  });
  const scheduleQuery = useQuery({
    queryKey: ["student", "schedule"],
    queryFn: () => apiGet<any>("/students/schedule"),
  });
  const announcementsQuery = useQuery({
    queryKey: ["student", "announcements"],
    queryFn: () => apiGet<any>("/students/announcements"),
  });
  const inboxQuery = useQuery({
    queryKey: ["messages", "inbox", "student"],
    queryFn: () => apiGet<any>("/messages"),
  });

  const student = profileQuery.data?.data ?? profileQuery.data?.user ?? null;
  const studentProfile = student?.studentProfile;
  const studentName =
    `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim() || "Student";
  const gradeLabel = studentProfile?.grade ? `Grade ${studentProfile.grade}` : "";
  const streamLabel =
    studentProfile?.stream || studentProfile?.section
      ? `${studentProfile.stream || studentProfile.section}`
      : "";

  const gradeRows = useMemo(() => {
    const records: any[] = gradesQuery.data?.data || gradesQuery.data || [];
    const approved = Array.isArray(records)
      ? records.filter((r) => r?.status === "Approved" || r?.status === "Submitted")
      : [];

    const bySubject = new Map<
      string,
      { subject: string; midterm: number; final: number; average: number }
    >();

    for (const r of approved) {
      const subject = r?.subject || "Unknown";
      const midExam = Number(r?.marks?.midExam ?? 0);
      const finalExam = Number(r?.marks?.finalExam ?? 0);
      const classQuiz = Number(r?.marks?.classQuiz ?? 0);
      const assignment = Number(r?.marks?.assignment ?? 0);
      const continuousAssessment = Number(r?.marks?.continuousAssessment ?? 0);
      const total = Number(r?.totalMarks ?? midExam + finalExam + classQuiz + assignment + continuousAssessment);
      bySubject.set(subject, {
        subject,
        midterm: Math.round((midExam / 20) * 100),
        final: Math.round((finalExam / 40) * 100),
        average: Math.round(total),
      });
    }

    return Array.from(bySubject.values()).sort((a, b) =>
      a.subject.localeCompare(b.subject),
    );
  }, [gradesQuery.data]);

  const attendanceSummary = attendanceQuery.data?.data?.summary || null;
  const attendanceRecords: any[] = attendanceQuery.data?.data?.records || [];
  const attendanceRate = Number(attendanceSummary?.attendanceRate ?? 0);

  const attendanceByMonth = useMemo(() => {
    const grouped = new Map<
      string,
      { month: string; present: number; absent: number; late: number }
    >();
    for (const r of attendanceRecords) {
      const d = new Date(r?.date);
      if (Number.isNaN(d.getTime())) continue;
      const month = d.toLocaleString("en-US", { month: "long" });
      const current = grouped.get(month) || { month, present: 0, absent: 0, late: 0 };
      if (r?.status === "Present") current.present += 1;
      if (r?.status === "Absent") current.absent += 1;
      if (r?.status === "Late") current.late += 1;
      grouped.set(month, current);
    }
    return Array.from(grouped.values());
  }, [attendanceRecords]);

  const scheduleEntries: any[] =
    scheduleQuery.data?.data?.timetables?.[0]?.schedule || [];
  const scheduleGrid = useMemo(() => {
    const byTime = new Map<
      string,
      Record<string, string> & { time: string }
    >();
    for (const e of scheduleEntries) {
      const time =
        e?.startTime && e?.endTime ? `${e.startTime} - ${e.endTime}` : `Period ${e?.period ?? ""}`;
      const day = (e?.day || "").toLowerCase();
      if (!day) continue;
      const row = byTime.get(time) || {
        time,
        monday: "",
        tuesday: "",
        wednesday: "",
        thursday: "",
        friday: "",
      };
      row[day] = e?.subject || "";
      byTime.set(time, row);
    }
    return Array.from(byTime.values());
  }, [scheduleEntries]);

  const announcements: any[] = announcementsQuery.data?.data || announcementsQuery.data || [];
  const inboxItems: any[] = inboxQuery.data?.data || inboxQuery.data || [];
  const unreadInboxCount = Array.isArray(inboxItems)
    ? inboxItems.filter((item) => !item?.isRead).length
    : 0;

  const overallAverage = useMemo(() => {
    if (!gradeRows.length) return 0;
    const avg = gradeRows.reduce((sum, r) => sum + (Number(r.average) || 0), 0) / gradeRows.length;
    return Math.round(avg * 10) / 10;
  }, [gradeRows]);

  const stats = [
    {
      label: t('pages.dashboard.average'),
      value: overallAverage ? `${overallAverage}%` : "--",
      icon: <TrendingUp />,
      color: "success" as const,
    },
    {
      label: t('common.attendance'),
      value: attendanceSummary ? `${Math.round(attendanceRate)}%` : "--",
      icon: <CalendarToday />,
      color: "primary" as const,
    },
    {
      label: t('pages.dashboard.subjects'),
      value: gradeRows.length,
      icon: <Assignment />,
      color: "warning" as const,
    },
    {
      label: t('common.messages'),
      value: unreadInboxCount,
      icon: <Message />,
      color: "info" as const,
    },
  ];

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
        {t('pages.dashboard.studentDashboard')}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {t('pages.dashboard.studentDashboardSubtitle')}
      </Typography>

      <HonorRollBadge honorRoll={overallAverage >= 90} honorRollType={t('pages.dashboard.firstClass')} size="large" showDetails />

      <Grid container spacing={3} sx={{ mb: 4, mt: 2 }}>
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
        >
          <Tab label={t('common.grades')} icon={<Assessment />} iconPosition="start" />
          <Tab
            label={t('common.attendance')}
            icon={<CalendarToday />}
            iconPosition="start"
          />
          <Tab label={t('common.timetable')} icon={<School />} iconPosition="start" />
          <Tab label={t('common.announcements')} icon={<Message />} iconPosition="start" />
          <Tab label={t('pages.dashboard.myProfile')} icon={<Person />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.academicPerformance')}
            </Typography>
            {(gradesQuery.isLoading || profileQuery.isLoading) && <LinearProgress sx={{ mb: 2 }} />}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pages.dashboard.subject')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.midterm')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.final')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.average')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.grade')}</TableCell>
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
                              ? t('pages.dashboard.excellent')
                              : row.average >= 80
                                ? t('pages.dashboard.veryGood')
                                : row.average >= 70
                                  ? t('pages.dashboard.good')
                                  : row.average >= 60
                                    ? t('pages.dashboard.satisfactory')
                                    : row.average >= 50
                                      ? t('pages.dashboard.pass')
                                      : t('pages.dashboard.fail')
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
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.attendanceRecord')}
            </Typography>
            {attendanceQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pages.dashboard.month')}</TableCell>
                    <TableCell align="center">{t('common.present')}</TableCell>
                    <TableCell align="center">{t('common.absent')}</TableCell>
                    <TableCell align="center">{t('common.late')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.rate')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceByMonth.map((row, index) => {
                    const total = row.present + row.absent + row.late;
                    const rate = Math.round((row.present / total) * 100);
                    return (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {row.month}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.present} ${t('pages.dashboard.days')}`}
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.absent} ${t('pages.dashboard.days')}`}
                            color="error"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${row.late} ${t('pages.dashboard.days')}`}
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
                              {rate}%
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
                                  width: `${rate}%`,
                                  background:
                                    rate >= 90
                                      ? theme.palette.success.main
                                      : rate >= 80
                                        ? theme.palette.warning.main
                                        : theme.palette.error.main,
                                  borderRadius: 3,
                                }}
                              />
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.classTimetable')}
            </Typography>
            {scheduleQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('pages.dashboard.time')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.monday')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.tuesday')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.wednesday')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.thursday')}</TableCell>
                    <TableCell align="center">{t('pages.dashboard.friday')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scheduleGrid.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.time}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.monday} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.tuesday} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.wednesday} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.thursday} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={row.friday} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('pages.dashboard.schoolAnnouncements')}
            </Typography>
            {announcementsQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            <Grid container spacing={2}>
              {announcements.map((item, index) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                  <Paper
                    sx={{
                      p: 3,
                      borderLeft: 4,
                      borderColor:
                        item.priority === "High"
                          ? theme.palette.error.main
                          : theme.palette.primary.main,
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
                        {item.title || item.subject || t('common.announcement')}
                      </Typography>
                      <Chip label={item.category || item.type || t('common.general')} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.date || item.createdAt
                        ? new Date(item.date || item.createdAt).toLocaleDateString()
                        : ""}
                    </Typography>
                    <Button size="small" sx={{ mt: 1 }} onClick={() => setSelectedAnnouncement(item)}>
                      {t('pages.dashboard.readMore')}
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              My Profile
            </Typography>
            {profileQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: "50%",
                      background: getColor("primary").bg,
                      color: getColor("primary").main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      mb: 2,
                    }}
                  >
                    <Person sx={{ fontSize: 50 }} />
                  </Box>
                  <Typography variant="h6">{studentName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.studentIdLabel')}: {student?.username || student?.email || "--"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {gradeLabel}
                    {streamLabel ? ` - ${streamLabel}` : ""}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    {t('pages.dashboard.personalInformation')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('common.email')}
                      </Typography>
                      <Typography variant="body1">
                        {student?.email || "--"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('common.phone')}
                      </Typography>
                      <Typography variant="body1">{student?.phone || "--"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('common.dateOfBirth')}
                      </Typography>
                      <Typography variant="body1">
                        {studentProfile?.dateOfBirth
                          ? new Date(studentProfile.dateOfBirth).toLocaleDateString()
                          : "--"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('common.gender')}
                      </Typography>
                      <Typography variant="body1">{studentProfile?.gender || "--"}</Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                    <Button variant="contained" startIcon={<Download />}>
                      {t('pages.dashboard.downloadReportCard')}
                    </Button>
                    <Button variant="outlined">{t('common.editProfile')}</Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Paper>

      {/* Announcement Detail Dialog */}
      <Dialog
        open={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAnnouncement && (
          <>
            <DialogTitle sx={{ pr: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={selectedAnnouncement.category || selectedAnnouncement.type || "General"}
                  size="small"
                  color={
                    selectedAnnouncement.priority === "High" || selectedAnnouncement.priority === "Urgent"
                      ? "error"
                      : "primary"
                  }
                />
                {selectedAnnouncement.title || selectedAnnouncement.subject || "Announcement"}
              </Box>
              <IconButton
                onClick={() => setSelectedAnnouncement(null)}
                size="small"
                sx={{ position: "absolute", top: 12, right: 12 }}
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('pages.dashboard.posted')}{" "}
                {selectedAnnouncement.date || selectedAnnouncement.createdAt
                  ? new Date(selectedAnnouncement.date || selectedAnnouncement.createdAt).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" }
                    )
                  : ""}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {selectedAnnouncement.content || selectedAnnouncement.description || t('pages.dashboard.noContentAvailable')}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAnnouncement(null)}>{t('common.close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default StudentDashboard;
