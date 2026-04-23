import React, { useEffect, useState, useMemo } from "react";
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
  TablePagination,
  alpha,
  useTheme,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Warning,
  Assessment,
  School,
  InfoOutlined,
  Refresh,
  Person,
  CheckCircle,
  Cancel,
  Delete,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { useStudents } from "@/hooks/students/useStudents";
import { useAcademicRecords } from "@/hooks/academic/useAcademicRecords";
import { useQueryClient } from "@tanstack/react-query";
import { getStatus, getGradeColor, academicService } from "@/services/academicService";
import { academicYearService } from "@/services/academicYearService";
import { useAuthStore } from "@/stores/authStore";

// ─── marks breakdown configuration ─────────────────────────────────────────
const COMPONENTS = [
  {
    key: "midMarks",
    label: "Mid Exam",
    max: 20,
    assessmentType: "mid_exam",
    weight: 0.2,
  },
  {
    key: "finalMarks",
    label: "Final Exam",
    max: 40,
    assessmentType: "final_exam",
    weight: 0.4,
  },
  {
    key: "assignmentMarks",
    label: "Assignment",
    max: 20,
    assessmentType: "assignment",
    weight: 0.2,
  },
  {
    key: "quizMarks",
    label: "Quiz/Test",
    max: 20,
    assessmentType: "test",
    weight: 0.2,
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────
const normalizeGradeValue = (value: unknown) =>
  String(value || "")
    .replace(/^Grade\s+/i, "")
    .trim();

const normalizeTextValue = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeSubjectValue = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeSemesterValue = (value: unknown) => {
  const normalized = String(value || "").trim();
  if (normalized === "1") return "Semester 1";
  if (normalized === "2") return "Semester 2";
  return normalized;
};

const gradeRequiresStream = (grade: string) => {
  const n = Number.parseInt(normalizeGradeValue(grade), 10);
  return n === 11 || n === 12;
};

const streamFilterLabel = (stream: string) =>
  stream === "Natural"
    ? "Natural Science"
    : stream === "Social"
      ? "Social Science"
      : stream;

const csvEscape = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

// ─── Component ───────────────────────────────────────────────────────────────
export function SchoolAdminGradesPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  const [filters, setFilters] = useState({
    grade: "",
    stream: "",
    subject: "",
    assessmentType: "",
    semester: "",
    academicYear: "",
    selectedStudentId: "",
    status: "",
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [activeAcademicYear, setActiveAcademicYear] = useState("2025-2026");
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");

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

  useEffect(() => {
    if (!filters.grade || !gradeRequiresStream(filters.grade)) {
      setFilters((p) => (p.stream ? { ...p, stream: "" } : p));
    }
  }, [filters.grade]);

  // Fetch all students (no teacher filtering for admin)
  const { data: studentsData } = useStudents({
    status: "active",
    limit: 5000,
  });

  const allStudents: any[] = useMemo(
    () =>
      Array.isArray((studentsData as any)?.data)
        ? (studentsData as any).data
        : [],
    [studentsData],
  );

  // Fetch all academic records using useAcademicRecords
  const { data: recordsData, isLoading: isLoadingRecords, refetch: refetchGrades } = useAcademicRecords({
    limit: 1000,
  }) as { data: any; isLoading: boolean; refetch: () => void };

  const studentLookup = useMemo(() => {
    const lookup = new Map<string, any>();

    const register = (key: unknown, student: any) => {
      const normalized = String(key || "").trim();
      if (!normalized || lookup.has(normalized)) return;
      lookup.set(normalized, student);
    };

    allStudents.forEach((student) => {
      register(student?._id, student);
      register(student?.id, student);
      register(student?.studentProfile?.studentId, student);
      register(student?.studentId, student);
      register(student?.username, student);
    });

    return lookup;
  }, [allStudents]);

  // Transform records to grades using original GradesPage's flatMap approach
  const grades = useMemo(() => {
    if (!recordsData) return [];
    const records = Array.isArray(recordsData.data) ? recordsData.data : [];
    
    // Debug: log the first record to see the data structure
    if (records.length > 0) {
      console.log('First record from API:', JSON.stringify(records[0], null, 2));
    }
    
    return records.flatMap((record: any) => {
      const studentRef = record?.student;
      const recordStudent =
        studentRef && typeof studentRef === "object" ? studentRef : {};
      const lookupKeyCandidates = [
        typeof studentRef === "string" ? studentRef : "",
        recordStudent?._id,
        recordStudent?.id,
        record?.studentId,
      ].map((value) => String(value || "").trim())
        .filter(Boolean);
      const linkedStudent =
        lookupKeyCandidates
          .map((key) => studentLookup.get(key))
          .find(Boolean) || {};

      const studentProfile = {
        ...(linkedStudent?.studentProfile || {}),
        ...(recordStudent?.studentProfile || {}),
      };

      let studentId = "Unknown";
      if (studentProfile?.studentId) {
        studentId = String(studentProfile.studentId);
      } else if (linkedStudent?._id || recordStudent?._id) {
        studentId = String(linkedStudent?._id || recordStudent?._id);
      } else if (linkedStudent?.id || recordStudent?.id) {
        studentId = String(linkedStudent?.id || recordStudent?.id);
      } else if (linkedStudent?.username || recordStudent?.username) {
        studentId = String(linkedStudent?.username || recordStudent?.username);
      } else if (record?.studentId) {
        studentId = String(record.studentId);
      }

      const firstName =
        recordStudent?.firstName || linkedStudent?.firstName || "";
      const lastName =
        recordStudent?.lastName || linkedStudent?.lastName || "";
      const studentName =
        `${firstName} ${lastName}`.trim() ||
        linkedStudent?.fullName ||
        "Unknown Student";
      const grade = normalizeGradeValue(
        studentProfile?.grade ||
          recordStudent?.grade ||
          linkedStudent?.grade ||
          record?.gradeLevel ||
          "",
      );
      const stream = String(
        studentProfile?.stream ||
          studentProfile?.section ||
          recordStudent?.stream ||
          recordStudent?.section ||
          linkedStudent?.stream ||
          linkedStudent?.section ||
          "",
      ).trim();
      const baseId = String(
        record?._id ||
          record?.id ||
          `${studentId}-${record?.subject || "subject"}`,
      );
      const semester = String(record?.semester || "");
      const academicYear = String(record?.academicYear || "");
      const subject = String(record?.subject || "");

      // Group by student and subject - don't flatten by assessment type
      const midExam = Number(record?.marks?.midExam || 0);
      const finalExam = Number(record?.marks?.finalExam || 0);
      const assignment = Number(record?.marks?.assignment || 0);
      const classQuiz = Number(record?.marks?.classQuiz || 0);
      const totalScore = midExam + finalExam + assignment + classQuiz;
      const maxScore = 100; // Mid(20) + Final(40) + Quiz(20) + Assignment(20)
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      return [{
        id: baseId,
        studentId,
        studentName,
        grade,
        stream,
        section: stream,
        subject,
        assessmentType: "overall",
        score: totalScore,
        maxScore,
        percentage,
        weight: 1,
        semester,
        academicYear,
        enteredBy: String(
          record?.teacher?.firstName && record?.teacher?.lastName
            ? `${record.teacher.firstName} ${record.teacher.lastName}`
            : record?.teacher || "Unknown",
        ),
        createdAt: record?.createdAt,
        status: record?.status || "Draft",
        rawRecordId: record?._id || record?.id || baseId,
        // Store component scores for detail view
        midExam,
        finalExam,
        assignment,
        classQuiz,
      }];
    });
  }, [recordsData, studentLookup]);

  // Filter grades
  const filteredGrades = useMemo(() => {
    return grades.filter((g: any) => {
      if (filters.selectedStudentId && g.studentId !== filters.selectedStudentId) {
        return false;
      }
      if (
        filters.grade &&
        normalizeGradeValue(g.grade) !== normalizeGradeValue(filters.grade)
      )
        return false;
      if (
        filters.stream &&
        gradeRequiresStream(filters.grade) &&
        normalizeTextValue(g.stream) !== normalizeTextValue(filters.stream)
      ) {
        return false;
      }
      if (
        filters.academicYear &&
        String(g.academicYear || "").trim() !== String(filters.academicYear).trim()
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
      if (
        filters.subject &&
        normalizeSubjectValue(g.subject) !==
          normalizeSubjectValue(filters.subject)
      )
        return false;
      if (filters.assessmentType && g.assessmentType !== filters.assessmentType)
        return false;
      return true;
    });
  }, [grades, filters]);

  // Organize by student
  const studentRows = useMemo(() => {
    const map = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        grade: string;
        stream: string;
        subjects: Set<string>;
        grades: typeof grades;
        totalPercentage: number;
        recordCount: number;
        statuses: Set<string>;
      }
    >();

    filteredGrades.forEach((grade: any) => {
      if (!map.has(grade.studentId)) {
        map.set(grade.studentId, {
          studentId: grade.studentId,
          studentName: grade.studentName,
          grade: grade.grade,
          stream: grade.stream || "",
          subjects: new Set<string>(),
          grades: [],
          totalPercentage: 0,
          recordCount: 0,
          statuses: new Set<string>(),
        });
      }

      const row = map.get(grade.studentId)!;
      row.subjects.add(grade.subject);
      if (grade.status) {
        row.statuses.add(grade.status);
      }
      row.grades.push(grade);
      row.totalPercentage += grade.percentage || 0;
      row.recordCount += 1;
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        subjectsList: Array.from(row.subjects),
        statusesList: Array.from(row.statuses),
        average:
          row.recordCount > 0
            ? Math.round(row.totalPercentage / row.recordCount)
            : 0,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredGrades]);

  const paginatedStudentRows = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return studentRows.slice(startIndex, startIndex + rowsPerPage);
  }, [studentRows, page, rowsPerPage]);

  // School-wide stats
  const schoolStats = useMemo(() => {
    if (filteredGrades.length === 0)
      return { average: 0, highest: 0, lowest: 0, passed: 0, failed: 0, totalStudents: 0 };
    
    const percentages = filteredGrades.map((g: { percentage: number }) => g.percentage);
    const passed = filteredGrades.filter((g: { percentage: number }) => getStatus(g.percentage) === "passed").length;
    const uniqueStudents = new Set(filteredGrades.map((g: { studentId: string }) => g.studentId)).size;

    return {
      average: Math.round(percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length),
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      passed,
      failed: filteredGrades.length - passed,
      totalStudents: uniqueStudents,
    };
  }, [filteredGrades]);

  // Class comparison stats
  const classComparison = useMemo(() => {
    const classMap = new Map<string, { count: number; total: number }>();

    filteredGrades.forEach((g: any) => {
      const classKey = gradeRequiresStream(g.grade) && g.stream
        ? `${g.grade}-${g.stream}`
        : g.grade;
      
      if (!classMap.has(classKey)) {
        classMap.set(classKey, { count: 0, total: 0 });
      }
      const entry = classMap.get(classKey)!;
      entry.count++;
      entry.total += g.percentage;
    });

    return Array.from(classMap.entries()).map(([classKey, data]) => ({
      class: classKey,
      average: Math.round(data.total / data.count),
      count: data.count,
    })).sort((a, b) => b.average - a.average);
  }, [filteredGrades]);

  // Subject performance
  const subjectPerformance = useMemo(() => {
    const subjectMap = new Map<string, { count: number; total: number }>();

    filteredGrades.forEach((g: any) => {
      if (!subjectMap.has(g.subject)) {
        subjectMap.set(g.subject, { count: 0, total: 0 });
      }
      const entry = subjectMap.get(g.subject)!;
      entry.count++;
      entry.total += g.percentage;
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
      count: data.count,
    })).sort((a, b) => b.average - a.average);
  }, [filteredGrades]);

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const distribution = {
      "90+": 0,
      "80-89": 0,
      "70-79": 0,
      "60-69": 0,
      "<60": 0,
    };

    filteredGrades.forEach((g: any) => {
      if (g.percentage >= 90) distribution["90+"]++;
      else if (g.percentage >= 80) distribution["80-89"]++;
      else if (g.percentage >= 70) distribution["70-79"]++;
      else if (g.percentage >= 60) distribution["60-69"]++;
      else distribution["<60"]++;
    });

    return distribution;
  }, [filteredGrades]);

  // Failing students alert
  const failingStudents = useMemo(() => {
    const failingMap = new Map<string, { studentId: string; studentName: string; grade: string; failingSubjects: string[]; average: number }>();

    studentRows.forEach((row) => {
      const failingSubjects = row.grades
        .filter((g: any) => getStatus(g.percentage) === "failed")
        .map((g: any) => g.subject);

      if (failingSubjects.length > 0) {
        failingMap.set(row.studentId, {
          studentId: row.studentId,
          studentName: row.studentName,
          grade: row.grade,
          failingSubjects,
          average: row.average,
        });
      }
    });

    return Array.from(failingMap.values()).sort((a, b) => a.average - b.average);
  }, [studentRows]);

  // Selected student detail
  const selectedStudent = useMemo(() => {
    return studentRows.find((row) => row.studentId === selectedStudentId) || null;
  }, [studentRows, selectedStudentId]);

  // Subject grades for selected student
  const studentSubjectGrades = useMemo(() => {
    if (!selectedStudentId) return [];

    const subjectMap = new Map<string, {
      subject: string;
      midExam: number;
      finalExam: number;
      assignment: number;
      quiz: number;
      total: number;
      percentage: number;
      grade: string;
      teacher: string;
    }>();

    grades.forEach((g: any) => {
      if (g.studentId !== selectedStudentId) return;

      if (!subjectMap.has(g.subject)) {
        subjectMap.set(g.subject, {
          subject: g.subject,
          midExam: 0,
          finalExam: 0,
          assignment: 0,
          quiz: 0,
          total: 0,
          percentage: 0,
          grade: "",
          teacher: "",
        });
      }

      const subject = subjectMap.get(g.subject)!;
      
      // Use component scores directly from the grade object
      subject.midExam = g.midExam || 0;
      subject.finalExam = g.finalExam || 0;
      subject.assignment = g.assignment || 0;
      subject.quiz = g.classQuiz || 0;
      subject.teacher = g.enteredBy || "";
    });

    subjectMap.forEach((subject) => {
      subject.total = subject.midExam + subject.finalExam + subject.assignment + subject.quiz;
      const maxScore = 100; // Mid(20) + Final(40) + Quiz(20) + Assignment(20)
      subject.percentage = maxScore > 0 ? Math.round((subject.total / maxScore) * 100) : 0;
      subject.grade = getStatus(subject.percentage);
    });

    return Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [grades, selectedStudentId]);

  const handleExportGrades = () => {
    if (filteredGrades.length === 0) {
      toast.error("No grades available to export");
      return;
    }

    setExporting(true);
    try {
      const headers = [
        "Student ID",
        "Student Name",
        "Grade",
        "Stream",
        "Subject",
        "Assessment Type",
        "Score",
        "Max Score",
        "Percentage",
        "Semester",
        "Academic Year",
        "Entered By",
      ];

      const rows = filteredGrades.map((grade) => [
        grade.studentId,
        grade.studentName,
        grade.grade,
        grade.section || "",
        grade.subject,
        grade.assessmentType,
        grade.score,
        grade.maxScore,
        grade.percentage + "%",
        normalizeSemesterValue(grade.semester),
        grade.academicYear,
        grade.enteredBy,
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell: unknown) => csvEscape(cell)).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `school-grades-${filters.academicYear || "all-years"}-sem-${filters.semester || "all"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Grades exported successfully");
    } catch (error) {
      console.error("Failed to export grades:", error);
      toast.error("Failed to export grades");
    } finally {
      setExporting(false);
    }
  };

  const openStudentDetail = (studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentDetailOpen(true);
  };

  const handleApprove = async (recordId: string) => {
    try {
      await academicService.approveGrade(recordId);
      toast.success("Grade approved successfully");
      refetchGrades();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve grade");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await academicService.rejectGrade(selectedRecordId, rejectReason);
      toast.success("Grade rejected successfully");
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedRecordId("");
      refetchGrades();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject grade");
    }
  };

  const openRejectDialog = (recordId: string) => {
    setSelectedRecordId(recordId);
    setRejectDialogOpen(true);
  };

  const handleClearCache = () => {
    queryClient.clear();
    refetchGrades();
    toast.success("Cache cleared and data refreshed");
  };

  const handleDelete = async (recordId: string) => {
    if (!window.confirm("Are you sure you want to delete this grade? This action cannot be undone.")) {
      return;
    }
    try {
      await academicService.deleteAcademicRecord(recordId);
      toast.success("Grade deleted successfully");
      refetchGrades();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete grade");
    }
  };

  const handleDeleteAllStudentGrades = async (studentId: string) => {
    try {
      // Get all grades for this student
      const studentGrades = grades.filter((g: any) => g.studentId === studentId);
      
      if (studentGrades.length === 0) {
        toast.error("No grades found for this student");
        return;
      }

      // Delete each grade
      await Promise.all(
        studentGrades.map((g: any) => 
          academicService.deleteAcademicRecord(g.rawRecordId || g.id)
        )
      );

      toast.success(`Deleted ${studentGrades.length} grade(s) for this student`);
      refetchGrades();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete grades");
    }
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Academic" }, { label: "School Grades" }]} />

      <PageHeader
        title="School Grades Overview"
        subtitle="Track and analyze all student grades across the school (Read-Only View)"
        action={
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleClearCache}
              size="small"
            >
              Clear Cache
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportGrades}
              disabled={filteredGrades.length === 0 || exporting}
              aria-label="Export grades"
            >
              {exporting ? "Exporting..." : "Export Grades"}
            </Button>
          </Box>
        }
      />

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label="All Students" />
          <Tab label="Pending Approvals" />
        </Tabs>
      </Paper>

      {/* Tab 1: Pending Approvals */}
      {tabValue === 1 && (
        <>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Pending Approvals
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearCache}
              >
                Clear Cache
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Review and approve grades entered by teachers
            </Typography>
            
            {isLoadingRecords ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredGrades.filter((g: any) => g.status === "Pending Approval").length === 0 ? (
              <Alert severity="info">
                No grades pending approval
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                      <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Entered By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredGrades
                      .filter((g: any) => g.status === "Pending Approval")
                      .map((grade: any) => (
                        <TableRow
                          key={grade.id}
                          sx={{ "&:hover": { background: alpha(theme.palette.primary.main, 0.02) } }}
                        >
                          <TableCell>{grade.studentName}</TableCell>
                          <TableCell>{grade.subject}</TableCell>
                          <TableCell>
                            {gradeRequiresStream(grade.grade) && grade.stream
                              ? `Grade ${grade.grade} – ${streamFilterLabel(grade.stream)}`
                              : `Grade ${grade.grade}`}
                          </TableCell>
                          <TableCell>{grade.score}/{grade.maxScore} ({grade.percentage}%)</TableCell>
                          <TableCell>{grade.enteredBy}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleApprove(grade.rawRecordId || grade.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={() => openRejectDialog(grade.rawRecordId || grade.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => handleDelete(grade.rawRecordId || grade.id)}
                              >
                                Delete
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* Tab 0: All Students */}
      {tabValue === 0 && (
        <>
          {/* School Stats Cards */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <StatsCard
              title="Total Students"
              value={schoolStats.totalStudents}
              icon={<School />}
              color="primary"
            />
            <StatsCard
              title="School Average"
              value={`${schoolStats.average}%`}
              icon={<Assessment />}
              color="primary"
            />
            <StatsCard
              title="Highest Score"
              value={`${schoolStats.highest}%`}
              icon={<TrendingUp />}
              color="success"
            />
            <StatsCard
              title="Lowest Score"
              value={`${schoolStats.lowest}%`}
              icon={<TrendingDown />}
              color="warning"
            />
            <StatsCard
              title="Passed (≥50%)"
              value={schoolStats.passed}
              icon={<Assessment />}
              color="success"
            />
            <StatsCard
              title="Failed (<50%)"
              value={schoolStats.failed}
              icon={<Warning />}
              color="error"
            />
          </Box>

          {/* Filters */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Filters
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filter by class, subject, academic year, and assessment type
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Showing {studentRows.length} student{studentRows.length === 1 ? "" : "s"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, status: e.target.value }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 150,
                }}
              >
                <option value="">All Status</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={filters.grade}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, grade: e.target.value }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 100,
                }}
              >
                <option value="">All Grades</option>
                {["9", "10", "11", "12"].map((gradeOption) => (
                  <option key={gradeOption} value={gradeOption}>
                    Grade {gradeOption}
                  </option>
                ))}
              </select>

              {(filters.grade === "11" || filters.grade === "12") && (
                <select
                  value={filters.stream}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, stream: e.target.value }))
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${theme.palette.divider}`,
                    minWidth: 160,
                  }}
                >
                  <option value="">All streams</option>
                  {["Natural", "Social"].map((streamOption) => (
                    <option key={streamOption} value={streamOption}>
                      {streamFilterLabel(streamOption)}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filters.subject}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, subject: e.target.value }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 120,
                }}
              >
                <option value="">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="History">History</option>
                <option value="Geography">Geography</option>
              </select>

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

              <select
                value={filters.assessmentType}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, assessmentType: e.target.value }))
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${theme.palette.divider}`,
                  minWidth: 140,
                }}
              >
                <option value="">All Components</option>
                <option value="mid_exam">Mid Exam</option>
                <option value="final_exam">Final Exam</option>
                <option value="assignment">Assignment</option>
                <option value="test">Quiz/Test</option>
              </select>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => refetchGrades()}
                aria-label="Refresh data"
              >
                Refresh
              </Button>
            </Box>
          </Paper>

          {/* Students Table */}
          <Paper sx={{ borderRadius: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Subjects</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Records</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Average</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingRecords ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : studentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No grades found for the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudentRows.map((row) => (
                      <TableRow
                        key={row.studentId}
                        sx={{ "&:hover": { background: alpha(theme.palette.primary.main, 0.02) } }}
                      >
                        <TableCell>{row.studentId}</TableCell>
                        <TableCell>{row.studentName}</TableCell>
                        <TableCell>
                          {gradeRequiresStream(row.grade) && row.stream
                            ? `Grade ${row.grade} – ${streamFilterLabel(row.stream)}`
                            : `Grade ${row.grade}`}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {row.subjectsList.slice(0, 3).map((subject) => (
                              <Chip key={subject} label={subject} size="small" variant="outlined" />
                            ))}
                            {row.subjectsList.length > 3 && (
                              <Chip label={`+${row.subjectsList.length - 3}`} size="small" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{row.grades.length}</TableCell>
                        <TableCell>
                          {row.statusesList && row.statusesList.length > 0 ? (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                              {row.statusesList.map((status: string, idx: number) => (
                                <Chip
                                  key={idx}
                                  label={status}
                                  size="small"
                                  sx={{
                                    backgroundColor: status === "Approved" ? alpha("#4caf50", 0.1) :
                                                   status === "Rejected" ? alpha("#f44336", 0.1) :
                                                   status === "Pending Approval" ? alpha("#ff9800", 0.1) :
                                                   alpha("#9e9e9e", 0.1),
                                    color: status === "Approved" ? "#4caf50" :
                                           status === "Rejected" ? "#f44336" :
                                           status === "Pending Approval" ? "#ff9800" :
                                           "#9e9e9e",
                                    fontWeight: 500,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: getGradeColor(row.average),
                                fontWeight: 600,
                              }}
                            >
                              {row.average}%
                            </Typography>
                            <Chip
                              label={getStatus(row.average)}
                              size="small"
                              sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                background: alpha(theme.palette.grey[500], 0.2),
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openStudentDetail(row.studentId)}
                              aria-label={`View grades for ${row.studentName}`}
                            >
                              View
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete all grades for ${row.studentName}? This action cannot be undone.`)) {
                                  handleDeleteAllStudentGrades(row.studentId);
                                }
                              }}
                              aria-label={`Delete all grades for ${row.studentName}`}
                            >
                              Delete All
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={studentRows.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </>
      )}

      {/* Tab 2: Analytics */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {/* Class Comparison */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Class Performance Comparison
              </Typography>
              {classComparison.length === 0 ? (
                <Typography color="text.secondary">No data available</Typography>
              ) : (
                classComparison.map((item) => (
                  <Box key={item.class} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {item.class}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.average}% ({item.count} students)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.average}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        background: alpha(theme.palette.grey[500], 0.2),
                      }}
                    />
                  </Box>
                ))
              )}
            </Paper>
          </Grid>

          {/* Subject Performance */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Subject Performance
              </Typography>
              {subjectPerformance.length === 0 ? (
                <Typography color="text.secondary">No data available</Typography>
              ) : (
                subjectPerformance.map((item) => (
                  <Box key={item.subject} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {item.subject}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.average}% ({item.count} records)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.average}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        background: alpha(theme.palette.grey[500], 0.2),
                      }}
                    />
                  </Box>
                ))
              )}
            </Paper>
          </Grid>

          {/* Grade Distribution */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Grade Distribution
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(gradeDistribution).map(([range, count]) => (
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={range}>
                    <Card sx={{ textAlign: "center" }}>
                      <CardContent>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {range}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Student Detail Dialog */}
      <Dialog
        open={studentDetailOpen}
        onClose={() => setStudentDetailOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            {selectedStudent
              ? `${selectedStudent.studentName} — Grade Details`
              : "Student Details"}
          </Typography>
          {selectedStudent && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {selectedStudent.studentId} • Grade {selectedStudent.grade}
              {selectedStudent.stream && ` – ${streamFilterLabel(selectedStudent.stream)}`}
            </Typography>
          )}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedStudent && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Overall Performance
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {selectedStudent.average}%
                  </Typography>
                  <Chip
                    label={getStatus(selectedStudent.average) === "passed" ? "Passing" : "Failing"}
                    color={getStatus(selectedStudent.average) === "passed" ? "success" : "error"}
                  />
                </Box>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ background: alpha(theme.palette.primary.main, 0.05) }}>
                      <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mid (20)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Final (40)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Assignment (20)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Quiz (20)</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Entered By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {studentSubjectGrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary">
                            No grades available for this student.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentSubjectGrades.map((row) => (
                        <TableRow key={row.subject}>
                          <TableCell sx={{ fontWeight: 500 }}>{row.subject}</TableCell>
                          <TableCell align="center">{row.midExam > 0 ? `${row.midExam}/20` : "-"}</TableCell>
                          <TableCell align="center">{row.finalExam > 0 ? `${row.finalExam}/40` : "-"}</TableCell>
                          <TableCell align="center">{row.assignment > 0 ? `${row.assignment}/20` : "-"}</TableCell>
                          <TableCell align="center">{row.quiz > 0 ? `${row.quiz}/20` : "-"}</TableCell>
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
                          <TableCell align="center">
                            <Tooltip title={`Teacher: ${row.teacher}`}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="body2">{row.teacher}</Typography>
                              </Box>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Grade</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please provide a reason for rejecting this grade:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
