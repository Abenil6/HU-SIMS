import React, { useMemo, useState } from "react";
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
  LinearProgress,
} from "@mui/material";
import { Download, Refresh, CalendarToday } from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  reason?: string;
  note?: string;
  teacher?: {
    firstName: string;
    lastName: string;
  };
}

interface AttendanceSummary {
  attendanceRate: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
}

export function StudentAttendancePage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: () => apiGet<any>("/students/attendance"),
  });

  const records: AttendanceRecord[] = useMemo(() => {
    const data = attendanceData?.data?.records || attendanceData?.records || [];
    return Array.isArray(data) ? data : [];
  }, [attendanceData]);

  const summary: AttendanceSummary = useMemo(() => {
    // Calculate summary from actual records instead of relying on API summary
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === "Present").length;
    const absentDays = records.filter(r => r.status === "Absent").length;
    const lateDays = records.filter(r => r.status === "Late").length;
    const excusedDays = records.filter(r => r.status === "Excused").length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      attendanceRate,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      excusedDays,
    };
  }, [records]);

  const attendanceByMonth = useMemo(() => {
    const grouped = new Map<
      string,
      { month: string; present: number; absent: number; late: number; excused: number; total: number }
    >();
    
    for (const r of records) {
      const d = new Date(r?.date);
      if (Number.isNaN(d.getTime())) continue;
      const month = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      const current = grouped.get(month) || { 
        month, 
        present: 0, 
        absent: 0, 
        late: 0, 
        excused: 0,
        total: 0
      };
      
      if (r?.status === "Present") current.present += 1;
      if (r?.status === "Absent") current.absent += 1;
      if (r?.status === "Late") current.late += 1;
      if (r?.status === "Excused") current.excused += 1;
      current.total += 1;
      
      grouped.set(month, current);
    }
    
    return Array.from(grouped.values()).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB.getTime() - dateA.getTime();
    });
  }, [records]);

  const handleExportAttendance = () => {
    if (records.length === 0) {
      toast.error("No attendance data available to export");
      return;
    }

    setExporting(true);
    try {
      const headers = ["Date", "Status", "Reason", "Note", "Teacher"];
      const rows = records.map((record) => [
        new Date(record.date).toLocaleDateString(),
        record.status,
        record.reason || "-",
        record.note || "-",
        record.teacher ? `${record.teacher.firstName} ${record.teacher.lastName}` : "-",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance exported successfully");
    } catch (error) {
      console.error("Failed to export attendance:", error);
      toast.error("Failed to export attendance");
    } finally {
      setExporting(false);
    }
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

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Attendance" }, { label: "My Attendance" }]} />

      <PageHeader
        title="My Attendance"
        subtitle="View your attendance record and summary"
        action={
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportAttendance}
            disabled={records.length === 0 || exporting}
          >
            {exporting ? "Exporting..." : "Export Attendance"}
          </Button>
        }
      />

      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title="Attendance Rate"
          value={`${Math.round(summary.attendanceRate)}%`}
          icon={<CalendarToday />}
          color={summary.attendanceRate >= 90 ? "success" : summary.attendanceRate >= 75 ? "info" : "warning"}
        />
        <StatsCard
          title="Total Days"
          value={summary.totalDays}
          icon={<CalendarToday />}
          color="primary"
        />
        <StatsCard
          title="Present"
          value={summary.presentDays}
          icon={<CalendarToday />}
          color="success"
        />
        <StatsCard
          title="Absent"
          value={summary.absentDays}
          icon={<CalendarToday />}
          color="error"
        />
        <StatsCard
          title="Late"
          value={summary.lateDays}
          icon={<CalendarToday />}
          color="warning"
        />
      </Box>

      {/* Monthly Breakdown */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Monthly Attendance Summary
          </Typography>
          {isLoading ? (
            <LinearProgress />
          ) : attendanceByMonth.length === 0 ? (
            <Typography color="text.secondary">No attendance records found.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Present</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Absent</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Late</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Excused</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Total</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceByMonth.map((row) => {
                    const rate = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
                    return (
                      <TableRow key={row.month} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{row.month}</TableCell>
                        <TableCell align="center">
                          <Chip label={`${row.present} days`} color="success" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${row.absent} days`} color="error" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${row.late} days`} color="warning" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${row.excused} days`} color="info" size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">{row.total}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                            <Typography variant="body2" fontWeight={500}>{rate}%</Typography>
                            <LinearProgress
                              variant="determinate"
                              value={rate}
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                              color={rate >= 90 ? "success" : rate >= 75 ? "info" : "warning"}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Detailed Records */}
      <Paper sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Attendance Records
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
            size="small"
          >
            Refresh
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Note</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teacher</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">No attendance records found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record._id} hover>
                    <TableCell>
                      {new Date(record.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        color={getStatusColor(record.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{record.reason || "-"}</TableCell>
                    <TableCell>{record.note || "-"}</TableCell>
                    <TableCell>
                      {record.teacher?.firstName && record.teacher?.lastName
                        ? `${record.teacher.firstName} ${record.teacher.lastName}`
                        : record.teacher?.firstName || record.teacher?.lastName
                        ? `${record.teacher?.firstName || ""}${record.teacher?.lastName || ""}`
                        : "-"}
                    </TableCell>
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
