import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
  Button,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import { ArrowBack, CalendarToday, TrendingUp, Assessment, CheckCircle, Cancel, Schedule } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  period?: string;
  notes?: string;
}

export function ParentChildAttendancePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { childId } = useParams<{ childId: string }>();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Fetch child information
  const { data: childData, isLoading: isLoadingChild } = useQuery({
    queryKey: ["parent", "child", childId],
    queryFn: () => apiGet<any>(`/parents/children/${childId}`),
    enabled: Boolean(childId),
  });

  const child = childData?.data || childData;

  // Fetch child attendance
  const actualChildId = child?._id || childId;
  const { data: attendanceData, isLoading: isLoadingAttendance, refetch } = useQuery({
    queryKey: ["parent", "child", actualChildId, "attendance", selectedMonth, selectedYear],
    queryFn: () => apiGet<any>(`/parents/children/${actualChildId}/attendance`, {
      month: selectedMonth || undefined,
      year: selectedYear || undefined,
    }),
    enabled: Boolean(actualChildId),
  });

  const attendanceRecords: AttendanceRecord[] = useMemo(() => {
    const records = Array.isArray(attendanceData?.data?.records)
      ? attendanceData.data.records
      : Array.isArray(attendanceData?.data)
      ? attendanceData.data
      : Array.isArray(attendanceData)
      ? attendanceData
      : [];
    return records.sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceData]);

  const stats = useMemo(() => {
    if (attendanceRecords.length === 0)
      return { present: 0, absent: 0, late: 0, excused: 0, percentage: 0, total: 0 };
    
    const present = attendanceRecords.filter((r) => r.status === "Present").length;
    const absent = attendanceRecords.filter((r) => r.status === "Absent").length;
    const late = attendanceRecords.filter((r) => r.status === "Late").length;
    const excused = attendanceRecords.filter((r) => r.status === "Excused").length;
    const total = attendanceRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { present, absent, late, excused, percentage, total };
  }, [attendanceRecords]);

  // Monthly attendance trends
  const monthlyTrends = useMemo(() => {
    const trends = new Map<string, { present: number; total: number }>();
    
    attendanceRecords.forEach((record) => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!trends.has(monthKey)) {
        trends.set(monthKey, { present: 0, total: 0 });
      }
      
      const trend = trends.get(monthKey)!;
      trend.total++;
      if (record.status === "Present") {
        trend.present++;
      }
    });

    return Array.from(trends.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }))
      .sort((a: any, b: any) => b.month.localeCompare(a.month));
  }, [attendanceRecords]);

  const months = [
    { value: "", label: t('parent.allMonths') },
    { value: "1", label: t('parent.january') },
    { value: "2", label: t('parent.february') },
    { value: "3", label: t('parent.march') },
    { value: "4", label: t('parent.april') },
    { value: "5", label: t('parent.may') },
    { value: "6", label: t('parent.june') },
    { value: "7", label: t('parent.july') },
    { value: "8", label: t('parent.august') },
    { value: "9", label: t('parent.september') },
    { value: "10", label: t('parent.october') },
    { value: "11", label: t('parent.november') },
    { value: "12", label: t('parent.december') },
  ];

  const handleBack = () => {
    navigate("/parent/dashboard");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "success";
      case "Absent":
        return "error";
      case "Late":
        return "warning";
      case "Excused":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present":
        return <CheckCircle />;
      case "Absent":
        return <Cancel />;
      case "Late":
        return <Schedule />;
      case "Excused":
        return <CalendarToday />;
      default:
        return null;
    }
  };

  if (isLoadingChild) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs items={[
        { label: t('parent.parent'), path: "/parent/dashboard" },
        { label: t('parent.childAttendance') }
      ]} />

      <PageHeader
        title={`${child?.firstName || ""} ${child?.lastName || ""} - ${t('parent.attendanceHistory')}`}
        subtitle={t('parent.trackAttendance', { name: child?.firstName || t('parent.parent') })}
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBack}
          >
            {t('parent.backToDashboard')}
          </Button>
        }
      />

      {/* Child Info Card */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="h6" fontWeight={600}>
              {child?.firstName} {child?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('parent.gradeLevel')}: {child?.studentProfile?.grade || "N/A"}
              {child?.studentProfile?.stream && ` - ${child.studentProfile.stream}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('parent.studentId')}: {child?.studentProfile?.studentId || "N/A"}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography variant="body2" color="text.secondary">
              {t('parent.totalAttendanceRecords')}: {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('parent.attendanceRate')}: {stats.percentage}%
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title={t('parent.attendanceRatePercent')}
          value={`${stats.percentage}%`}
          icon={<TrendingUp />}
          color={stats.percentage >= 80 ? "success" : stats.percentage >= 60 ? "warning" : "error"}
        />
        <StatsCard
          title={t('parent.presentDays')}
          value={stats.present}
          icon={<CheckCircle />}
          color="success"
        />
        <StatsCard
          title={t('parent.absentDays')}
          value={stats.absent}
          icon={<Cancel />}
          color="error"
        />
        <StatsCard
          title={t('parent.lateArrivals')}
          value={stats.late}
          icon={<Schedule />}
          color="warning"
        />
        <StatsCard
          title={t('parent.excusedDays')}
          value={stats.excused}
          icon={<CalendarToday />}
          color="info"
        />
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('parent.filters')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('parent.filterDescription')}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>{t('parent.year')}</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              label={t('parent.year')}
            >
              <MenuItem value="2024">2024</MenuItem>
              <MenuItem value="2025">2025</MenuItem>
              <MenuItem value="2026">2026</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>{t('parent.month')}</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              label={t('parent.month')}
            >
              {months.map((month) => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={() => refetch()}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Paper>

      {/* Monthly Trends */}
      {monthlyTrends.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t('parent.monthlyAttendanceTrends')}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {monthlyTrends.map((trend) => (
              <Box key={trend.month} sx={{ flex: "1 1 300px", minWidth: 280 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {trend.month}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      <Typography variant="h4" fontWeight={600} sx={{ mr: 1 }}>
                        {trend.percentage}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({trend.present}/{trend.total})
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={trend.percentage}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                      color={trend.percentage >= 80 ? "success" : trend.percentage >= 60 ? "warning" : "error" as any}
                    />
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Attendance Table */}
      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{ background: alpha(theme.palette.primary.main, 0.05) }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.date')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.status')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.period')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.notes')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingAttendance ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : attendanceRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">
                      {t('parent.noAttendanceRecordsFound')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                attendanceRecords.map((record) => (
                  <TableRow
                    key={record._id}
                    sx={{ "&:hover": { background: alpha(theme.palette.primary.main, 0.02) } }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        color={getStatusColor(record.status) as any}
                        size="small"
                        icon={getStatusIcon(record.status) ? getStatusIcon(record.status) as any : undefined}
                      />
                    </TableCell>
                    <TableCell>{record.period || "-"}</TableCell>
                    <TableCell>{record.notes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
