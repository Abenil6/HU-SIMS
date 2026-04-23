import React, { useEffect, useState, useMemo } from "react";
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
  Avatar,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { Download, Refresh, TrendingUp, Assessment, Person, School, EmojiEvents, Star } from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { getStatus } from "@/services/academicService";
import { academicYearService } from "@/services/academicYearService";
import { useAuthStore } from "@/stores/authStore";

// ─── marks breakdown configuration ─────────────────────────────────────────
const COMPONENTS = [
  {
    key: "midMarks",
    label: "Mid Exam",
    max: 20,
    assessmentType: "mid_exam",
  },
  {
    key: "finalMarks",
    label: "Final Exam",
    max: 40,
    assessmentType: "final_exam",
  },
  {
    key: "assignmentMarks",
    label: "Assignment",
    max: 20,
    assessmentType: "assignment",
  },
  {
    key: "quizMarks",
    label: "Quiz/Test",
    max: 20,
    assessmentType: "test",
  },
] as const;

interface Grade {
  subject: string;
  midExam: number;
  finalExam: number;
  assignment: number;
  classQuiz: number;
  total: number;
  percentage: number;
  semester: string;
  academicYear: string;
}

const normalizeSemesterValue = (value: unknown) => {
  const normalized = String(value || "").trim();
  if (normalized === "1") return "Semester 1";
  if (normalized === "2") return "Semester 2";
  return normalized;
};

const csvEscape = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

// ─── component ───────────────────────────────────────────────────────────────
export function StudentGradesPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({
    semester: "",
    academicYear: "",
  });
  const [activeAcademicYear, setActiveAcademicYear] = useState("2025-2026");
  const [exporting, setExporting] = useState(false);

  // Fetch student profile for personalized header
  const { data: studentProfile } = useQuery({
    queryKey: ["student", "profile"],
    queryFn: () => apiGet<any>("/students/profile"),
  });

  const studentData = studentProfile?.data ?? studentProfile;
  const studentName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Student";
  const gradeLevel = studentData?.studentProfile?.grade || "";
  const stream = studentData?.studentProfile?.stream || "";

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
        if (error?.response?.status === 404) {
          setActiveAcademicYear("2025-2026");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── fetch all grade records for the student ──
  const { data: recordsData, isLoading: isLoadingRecords, refetch: refetchGrades } = useQuery({
    queryKey: ["student", "grades"],
    queryFn: () => apiGet<any>("/students/grades"),
  });

  const grades = useMemo((): Grade[] => {
    const records = Array.isArray(recordsData?.data)
      ? recordsData.data
      : Array.isArray(recordsData)
      ? recordsData
      : [];

    // Show all grades regardless of status (Draft, Submitted, Approved)
    // Teachers enter grades and students should see them immediately
    const approvedRecords = records;

    // Group by subject directly (like StudentDashboard)
    const subjectMap = new Map<string, {
      subject: string;
      midExam: number;
      finalExam: number;
      assignment: number;
      classQuiz: number;
      total: number;
      percentage: number;
      semester: string;
      academicYear: string;
    }>();

    approvedRecords.forEach((record: any) => {
      const subject = String(record?.subject || "");
      const semester = String(record?.semester || "");
      const academicYear = String(record?.academicYear || "");
      
      let midExam = Number(record?.marks?.midExam ?? 0);
      let finalExam = Number(record?.marks?.finalExam ?? 0);
      let assignment = Number(record?.marks?.assignment ?? 0);
      let classQuiz = Number(record?.marks?.classQuiz ?? 0);
      let continuousAssessment = Number(record?.marks?.continuousAssessment ?? 0);
      
      // Convert percentages to raw marks if values exceed max possible raw marks
      if (midExam > 20) midExam = (midExam / 100) * 20;
      if (finalExam > 40) finalExam = (finalExam / 100) * 40;
      if (assignment > 20) assignment = (assignment / 100) * 20;
      if (classQuiz > 20) classQuiz = (classQuiz / 100) * 20;
      if (continuousAssessment > 10) continuousAssessment = (continuousAssessment / 100) * 10;
      
      const totalMarks = Number(record?.totalMarks ?? midExam + finalExam + assignment + classQuiz + continuousAssessment);

      const key = `${subject}-${semester}-${academicYear}`;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subject,
          midExam,
          finalExam,
          assignment,
          classQuiz,
          total: totalMarks,
          percentage: Math.round(totalMarks),
          semester,
          academicYear,
        });
      }
    });

    return Array.from(subjectMap.values());
  }, [recordsData]);

  const filteredGrades = useMemo(() => {
    return grades.filter((g: Grade) => {
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
      return true;
    });
  }, [grades, filters]);

  // Organize grades by subject
  const subjectGrades = useMemo(() => {
    const subjectMap = new Map<string, Grade & { grade: string }>();

    filteredGrades.forEach((g: Grade) => {
      const key = g.subject;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          ...g,
          grade: getStatus(g.percentage),
        });
      }
    });

    return Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [filteredGrades]);

  const stats = useMemo(() => {
    if (filteredGrades.length === 0)
      return { average: 0, highest: 0, lowest: 0, passed: 0, failed: 0 };
    const percentages = filteredGrades.map((g: Grade) => g.percentage);
    const passed = filteredGrades.filter(
      (g) => getStatus(g.percentage) === "passed",
    ).length;
    return {
      average: Math.round(
        percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length,
      ),
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      passed,
      failed: filteredGrades.length - passed,
    };
  }, [filteredGrades]);

  const overallAverage = useMemo(() => {
    if (subjectGrades.length === 0) return 0;
    const avg = subjectGrades.reduce((sum: number, s: { percentage: number }) => sum + s.percentage, 0) / subjectGrades.length;
    return Math.round(avg * 10) / 10;
  }, [subjectGrades]);

  const handleExportGrades = () => {
    if (subjectGrades.length === 0) {
      toast.error("No grades available to export");
      return;
    }

    setExporting(true);
    try {
      const headers = [
        "Subject",
        "Mid Exam",
        "Final Exam",
        "Assignment",
        "Quiz/Test",
      ];

      const rows = subjectGrades.map((subject) => [
        subject.subject,
        `${subject.midExam}/20`,
        `${subject.finalExam}/40`,
        `${subject.assignment}/20`,
        `${subject.classQuiz}/20`,
        `${subject.total}/100`,
        `${subject.percentage}%`,
        subject.grade,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-grades-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Grades exported successfully");
    } catch (error) {
      console.error("Failed to export grades:", error);
      toast.error("Failed to export grades");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Academic" }, { label: "My Grades" }]} />

      {/* Personalized Student Header */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              fontSize: 32,
            }}
          >
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              Welcome back, {user?.firstName}! 👋
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {gradeLevel && `Grade ${gradeLevel}`}{gradeLevel && stream && ` - ${stream}`} · Track your academic progress
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {overallAverage}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overall Average
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title="Overall Average"
          value={`${overallAverage}%`}
          icon={<TrendingUp />}
          color="primary"
        />
        <StatsCard
          title="Subjects"
          value={subjectGrades.length}
          icon={<Assessment />}
          color="info"
        />
        <StatsCard
          title="Highest Score"
          value={`${stats.highest}%`}
          icon={<EmojiEvents />}
          color="success"
        />
        <StatsCard
          title="Passed (≥50%)"
          value={stats.passed}
          icon={<Star />}
          color="success"
        />
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Filter by academic year and semester to view your grades
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportGrades}
            disabled={subjectGrades.length === 0 || exporting}
          >
            {exporting ? "Exporting..." : "Export My Grades"}
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
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

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetchGrades()}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Subject Breakdown Table */}
      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
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
                      No grades have been entered for you yet.
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
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
