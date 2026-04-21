import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Check, Close, Download, Refresh, Save, Warning } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Breadcrumbs, PageHeader } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { useAttendance, useBulkRecordAttendance } from "@/hooks/attendance/useAttendance";
import { apiGet } from "@/services/api";
import { studentService } from "@/services/studentService";
import { useAuthStore } from "@/stores/authStore";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type RosterFilter = "all" | "not_present" | "with_notes";

interface TeacherClassAssignment {
  key: string;
  grade: string;
  stream?: string;
  label: string;
}

interface RosterStudent {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  stream: string;
  status: AttendanceStatus;
  reason: string;
  note: string;
  selected: boolean;
}

interface AdminAttendanceRecord {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  stream: string;
  status: string;
  date: string;
  teacherName: string;
}

const ABSENCE_REASONS = [
  "Sick",
  "Medical Appointment",
  "Family Emergency",
  "Transport Issue",
  "School Activity",
  "Other",
];

const padDatePart = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (value: Date | string | number) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const normalizeGradeValue = (value: unknown) =>
  String(value || "")
    .replace(/^Grade\s+/i, "")
    .trim();

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const toApiStatus = (status: AttendanceStatus): "Present" | "Absent" | "Late" | "Excused" => {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  if (status === "late") return "Late";
  return "Excused";
};

const classRequiresStream = (grade: string) => {
  const gradeNumber = Number.parseInt(normalizeGradeValue(grade), 10);
  return gradeNumber === 11 || gradeNumber === 12;
};

const buildDraftKey = (userId: string, classKey: string, date: string) =>
  `attendance-draft:${userId}:${classKey}:${date}`;

const csvEscape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function TeacherAttendanceMarkingPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const canTakeAttendance = user?.role === "Teacher";

  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [activeClassKey, setActiveClassKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    return toDateInputValue(new Date());
  });
  const [historyClassFilter, setHistoryClassFilter] = useState("");
  const [historyClassAutoSelected, setHistoryClassAutoSelected] = useState(false);
  const [exporting, setExporting] = useState(false);

  const bulkRecordAttendance = useBulkRecordAttendance();

  const teacherAssignments = useMemo<TeacherClassAssignment[]>(() => {
    const classes = Array.isArray((user as any)?.teacherProfile?.classes)
      ? (user as any).teacherProfile.classes
      : [];

    const unique = new Map<string, TeacherClassAssignment>();

    classes.forEach((entry: any) => {
      const grade = normalizeGradeValue(entry?.grade);
      const stream = String(entry?.stream || entry?.section || "").trim();
      const scopedStream = classRequiresStream(grade) ? stream : "";
      if (!grade) return;

      const key = `${grade}:${scopedStream}`;
      if (!unique.has(key)) {
        unique.set(key, {
          key,
          grade,
          stream: scopedStream || undefined,
          label: scopedStream ? `Grade ${grade} - ${scopedStream}` : `Grade ${grade}`,
        });
      }
    });

    return Array.from(unique.values());
  }, [user]);

  const selectedClass = useMemo(
    () => teacherAssignments.find((cls) => cls.key === selectedClassKey) || null,
    [teacherAssignments, selectedClassKey],
  );

  const activeClass = useMemo(
    () => teacherAssignments.find((cls) => cls.key === activeClassKey) || null,
    [teacherAssignments, activeClassKey],
  );

  useEffect(() => {
    if (!selectedClassKey && teacherAssignments.length > 0) {
      setSelectedClassKey(teacherAssignments[0].key);
    }
  }, [selectedClassKey, teacherAssignments]);

  const studentsQuery = useQuery({
    queryKey: ["attendance", "roster", activeClass?.grade, activeClass?.stream],
    enabled: Boolean(activeClass),
    queryFn: async () => {
      if (!activeClass) return { success: true, data: [] };

      const response = await studentService.getStudents({
        grade: activeClass.grade,
        stream: classRequiresStream(activeClass.grade) ? activeClass.stream : undefined,
        limit: 1000,
      });

      return response as any;
    },
    staleTime: 60 * 1000,
  });

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useAttendance({
    date: historyStartDate,
    limit: 2000,
  });

  useEffect(() => {
    if (!activeClass || !studentsQuery.data) return;

    const rawStudents = Array.isArray((studentsQuery.data as any)?.data)
      ? (studentsQuery.data as any).data
      : [];

    const filteredStudents = rawStudents.filter((student: any) => {
      const studentGrade = normalizeGradeValue(student?.studentProfile?.grade || student?.grade);
      const studentStream = normalizeText(
        student?.studentProfile?.stream || student?.studentProfile?.section || student?.stream,
      );

      if (studentGrade !== normalizeGradeValue(activeClass.grade)) return false;

      if (activeClass.stream && classRequiresStream(activeClass.grade)) {
        return studentStream === normalizeText(activeClass.stream);
      }

      return true;
    });

    const mapped = filteredStudents
      .map((student: any) => {
        const id = String(student?._id || student?.id || "");
        const studentId = String(student?.studentProfile?.studentId || student?.studentId || "-");
        const fullName = `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Unnamed Student";

        if (!id) return null;

        return {
          id,
          studentId,
          fullName,
          grade: normalizeGradeValue(student?.studentProfile?.grade || student?.grade) || activeClass.grade,
          stream: String(student?.studentProfile?.stream || student?.stream || ""),
          status: "present" as AttendanceStatus,
          reason: "",
          note: "",
          selected: false,
        };
      })
      .filter(Boolean) as RosterStudent[];

    const currentUserId = String(user?._id || user?.id || "unknown");
    const draftKey = buildDraftKey(currentUserId, activeClass.key, selectedDate);
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const draftRosterById = new Map<string, { status?: AttendanceStatus; reason?: string; note?: string }>(
          Array.isArray(parsed?.roster)
            ? parsed.roster.map((entry: any) => [String(entry?.id || ""), entry])
            : [],
        );

        const restored = mapped.map((student) => {
          const draftEntry = draftRosterById.get(student.id);
          if (!draftEntry) return student;

          return {
            ...student,
            status: draftEntry.status || student.status,
            reason: String(draftEntry.reason || ""),
            note: String(draftEntry.note || ""),
          };
        });

        setRoster(restored);
        toast.success("Loaded saved draft for this class and date");
        return;
      } catch {
        // Ignore corrupted draft
      }
    }

    setRoster(mapped);
  }, [studentsQuery.data, activeClass, selectedDate, user]);

  const visibleRoster = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return roster.filter((student) => {
      if (query) {
        const searchable = `${student.fullName} ${student.studentId}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      if (rosterFilter === "not_present") {
        return student.status !== "present";
      }

      if (rosterFilter === "with_notes") {
        return Boolean(student.note.trim());
      }

      return true;
    });
  }, [roster, searchQuery, rosterFilter]);

  const summary = useMemo(
    () => ({
      present: roster.filter((s) => s.status === "present").length,
      absent: roster.filter((s) => s.status === "absent").length,
      late: roster.filter((s) => s.status === "late").length,
      excused: roster.filter((s) => s.status === "excused").length,
      withNotes: roster.filter((s) => s.note.trim()).length,
      total: roster.length,
    }),
    [roster],
  );

  const selectedCount = useMemo(() => roster.filter((student) => student.selected).length, [roster]);

  const allVisibleSelected =
    visibleRoster.length > 0 && visibleRoster.every((student) => student.selected);

  const updateStudent = (studentId: string, updates: Partial<RosterStudent>) => {
    setRoster((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, ...updates } : student)),
    );
  };

  const applyStatusToAll = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((student) => ({ ...student, status })));
  };

  const applyStatusToSelected = (status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((student) => (student.selected ? { ...student, status } : student)),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    const visibleIds = new Set(visibleRoster.map((student) => student.id));
    setRoster((prev) =>
      prev.map((student) =>
        visibleIds.has(student.id) ? { ...student, selected: checked } : student,
      ),
    );
  };

  const handleLoadStudents = () => {
    if (!canTakeAttendance) {
      toast.error("You do not have permission to take attendance");
      return;
    }

    if (!selectedClass) {
      toast.error("Please select a class");
      return;
    }

    setActiveClassKey(selectedClass.key);
    setSearchQuery("");
    setRosterFilter("all");
  };

  const handleSaveDraft = () => {
    if (!activeClass || roster.length === 0) {
      toast.error("Load students before saving a draft");
      return;
    }

    const currentUserId = String(user?._id || user?.id || "unknown");
    const draftKey = buildDraftKey(currentUserId, activeClass.key, selectedDate);

    localStorage.setItem(
      draftKey,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        roster: roster.map((student) => ({
          id: student.id,
          status: student.status,
          reason: student.reason,
          note: student.note,
        })),
      }),
    );

    toast.success("Attendance draft saved");
  };

  const handleSubmitAttendance = async () => {
    if (!canTakeAttendance) {
      toast.error("You do not have permission to take attendance");
      return;
    }

    if (!activeClass || roster.length === 0) {
      toast.error("Load students before submitting attendance");
      return;
    }

    const records = roster.map((student) => {
      const remarksParts = [student.reason.trim(), student.note.trim()].filter(Boolean);
      return {
        student: student.id,
        status: toApiStatus(student.status),
        remarks: remarksParts.length ? remarksParts.join(" - ") : undefined,
      };
    });

    try {
      await bulkRecordAttendance.mutateAsync({
        date: selectedDate,
        classGrade: activeClass.grade,
        classStream: activeClass.stream,
        records,
      });

      const currentUserId = String(user?._id || user?.id || "unknown");
      localStorage.removeItem(buildDraftKey(currentUserId, activeClass.key, selectedDate));
      setRoster((prev) => prev.map((student) => ({ ...student, selected: false })));
      refetchHistory();
      toast.success("Attendance submitted successfully");
    } catch {
      // error toast handled by hook
    }
  };

  const historyRecords = useMemo(() => {
    const records = Array.isArray((historyData as any)?.data) ? (historyData as any).data : [];
    return records
      .map((record: any) => {
        const student = record?.student || {};
        const grade = normalizeGradeValue(student?.studentProfile?.grade || "");
        const stream = String(student?.studentProfile?.stream || student?.studentProfile?.section || "").trim();
        const classLabel = stream ? `Grade ${grade} - ${stream}` : `Grade ${grade}`;
        return {
          id: String(record?._id || record?.id || `${student?._id || "unknown"}-${record?.date || ""}`),
          date: record?.date ? toDateInputValue(record.date) : "-",
          classLabel: classLabel || "Unknown Class",
          studentName: `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Unknown Student",
          studentId: student?.studentProfile?.studentId || "-",
          status: String(record?.status || "-"),
          remarks: String(record?.remarks || ""),
        };
      })
  }, [historyData]);

  const filteredHistoryRecords = useMemo(() => {
    if (!historyClassFilter) return historyRecords;
    return historyRecords.filter((record: any) => record.classLabel === historyClassFilter);
  }, [historyRecords, historyClassFilter]);

  const historySummary = useMemo(() => {
    const total = filteredHistoryRecords.length;
    const present = filteredHistoryRecords.filter((r: any) => r.status === "Present").length;
    const late = filteredHistoryRecords.filter((r: any) => r.status === "Late").length;
    const absent = filteredHistoryRecords.filter((r: any) => r.status === "Absent").length;
    const excused = filteredHistoryRecords.filter((r: any) => r.status === "Excused").length;
    return { total, present, late, absent, excused };
  }, [filteredHistoryRecords]);

  const historyClassOptions = useMemo<string[]>(
    () =>
      Array.from(
        new Set<string>(
          [
            ...teacherAssignments.map((assignment) => String(assignment.label || "").trim()),
            ...historyRecords.map((record: any) => String(record.classLabel || "").trim()),
          ].filter(Boolean),
        ),
      ).sort(),
    [teacherAssignments, historyRecords],
  );

  useEffect(() => {
    if (historyClassAutoSelected) return;
    const preferredClassLabel =
      activeClass?.label || selectedClass?.label || teacherAssignments[0]?.label || "";
    if (!preferredClassLabel) return;

    setHistoryClassFilter(preferredClassLabel);
    setHistoryClassAutoSelected(true);
  }, [historyClassAutoSelected, activeClass, selectedClass, teacherAssignments]);

  const handleExportHistory = () => {
    if (filteredHistoryRecords.length === 0) {
      toast.error("No attendance history available to export");
      return;
    }

    setExporting(true);
    try {
      const headers = ["Date", "Class", "Student", "Student ID", "Status", "Remarks"];
      const rows = filteredHistoryRecords.map((record: any) => [
        record.date,
        record.classLabel,
        record.studentName,
        record.studentId,
        record.status,
        record.remarks || "",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell: unknown) => csvEscape(cell)).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-history-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance history exported successfully");
    } catch (error) {
      console.error("Failed to export attendance history:", error);
      toast.error("Failed to export attendance history");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: t('common.attendance') }, { label: t('common.takeAttendance') }]} />
      <PageHeader title={t('common.takeAttendance')} subtitle={t('common.loadClassRoster')} />

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label={t('common.date')}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>{t('pages.dashboard.classes')}</InputLabel>
            <Select
              value={selectedClassKey}
              label={t('pages.dashboard.classes')}
              onChange={(event) => setSelectedClassKey(String(event.target.value))}
            >
              {teacherAssignments.length === 0 ? (
                <MenuItem value="" disabled>
                  No assigned classes
                </MenuItem>
              ) : (
                teacherAssignments.map((cls) => (
                  <MenuItem key={cls.key} value={cls.key}>
                    {cls.label}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <Box sx={{ ml: { md: "auto" }, display: "flex", gap: 1 }}>
            <Button variant="contained" onClick={handleLoadStudents} disabled={!canTakeAttendance || !selectedClassKey}>
              {t('common.takeAttendance')}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {activeClass ? (
        <Paper sx={{ p: 2, borderRadius: 3, mb: 2, position: "sticky", top: 12, zIndex: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {activeClass.label} - {selectedDate}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Present {summary.present} | Absent {summary.absent} | Late {summary.late} | Excused {summary.excused} | Total {summary.total}
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<Save />} onClick={handleSaveDraft} disabled={roster.length === 0} aria-label="Save attendance draft">
              {t('common.save')} {t('common.draft')}
            </Button>
            <Button
              variant="contained"
              startIcon={<Check />}
              onClick={handleSubmitAttendance}
              disabled={roster.length === 0 || bulkRecordAttendance.isPending}
              aria-label="Submit attendance"
            >
              {bulkRecordAttendance.isPending ? t('common.loading') : t('common.submit')} {t('common.attendance')}
            </Button>
          </Stack>
        </Paper>
      ) : null}

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard title={t('common.present')} value={summary.present} icon={<Check />} color="success" />
        <StatsCard title={t('common.absent')} value={summary.absent} icon={<Close />} color="error" />
        <StatsCard title={t('common.late')} value={summary.late} icon={<Warning />} color="warning" />
        <StatsCard title={t('common.excused')} value={summary.excused} icon={<Warning />} color="info" />
      </Box>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField
            label={t('common.searchStudent')}
            size="small"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Name or student ID"
            sx={{ minWidth: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{t('common.filter')}</InputLabel>
            <Select
              label={t('common.filter')}
              value={rosterFilter}
              onChange={(event) => setRosterFilter(event.target.value as RosterFilter)}
            >
              <MenuItem value="all">All Students</MenuItem>
              <MenuItem value="not_present">Not Present Only</MenuItem>
              <MenuItem value="with_notes">With Notes</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", ml: { md: "auto" } }}>
            <Chip label="Mark All Present" color="success" onClick={() => applyStatusToAll("present")} sx={{ cursor: "pointer" }} />
            <Chip label="Mark All Absent" color="error" onClick={() => applyStatusToAll("absent")} sx={{ cursor: "pointer" }} />
            <Chip
              label={`Selected -> Late (${selectedCount})`}
              color="warning"
              onClick={() => applyStatusToSelected("late")}
              sx={{ cursor: "pointer" }}
            />
            <Chip
              label={`Selected -> Excused (${selectedCount})`}
              color="info"
              onClick={() => applyStatusToSelected("excused")}
              sx={{ cursor: "pointer" }}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {studentsQuery.isLoading ? <LinearProgress /> : null}

        {!activeClass ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="info">Select class and click "Take Attendance" to load students.</Alert>
          </Box>
        ) : studentsQuery.isError ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="error">Failed to load students. Please retry.</Alert>
          </Box>
        ) : roster.length === 0 && !studentsQuery.isLoading ? (
          <Box sx={{ p: 4 }}>
            <Alert severity="warning">
              No students found for {activeClass.label}. Check class assignment or student enrollment.
            </Alert>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && selectedCount > 0}
                      onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                    />
                  </TableCell>
                  <TableCell>#</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRoster.map((student, index) => (
                  <TableRow key={student.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={student.selected}
                        onChange={(event) => updateStudent(student.id, { selected: event.target.checked })}
                      />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{student.fullName}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>
                      <ToggleButtonGroup
                        value={student.status}
                        exclusive
                        size="small"
                        onChange={(_, value: AttendanceStatus | null) => {
                          if (!value) return;
                          updateStudent(student.id, { status: value });
                        }}
                      >
                        <ToggleButton value="present" color="success">
                          Present
                        </ToggleButton>
                        <ToggleButton value="late" color="warning">
                          Late
                        </ToggleButton>
                        <ToggleButton value="absent" color="error">
                          Absent
                        </ToggleButton>
                        <ToggleButton value="excused" color="info">
                          Excused
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                          displayEmpty
                          value={student.reason}
                          onChange={(event) => updateStudent(student.id, { reason: String(event.target.value) })}
                          disabled={student.status === "present"}
                        >
                          <MenuItem value="">
                            <em>No reason</em>
                          </MenuItem>
                          {ABSENCE_REASONS.map((reason) => (
                            <MenuItem key={reason} value={reason}>
                              {reason}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={student.note}
                        onChange={(event) => updateStudent(student.id, { note: event.target.value })}
                        placeholder="Optional note"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3, mt: 3 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mb: 2 }}
          alignItems={{ md: "center" }}
        >
          <Typography variant="h6" fontWeight={600}>
            Attendance History By Date
          </Typography>
          <TextField
            size="small"
            type="date"
            label={t('common.date')}
            value={historyStartDate}
            onChange={(event) => setHistoryStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>{t('pages.dashboard.classes')}</InputLabel>
            <Select
              value={historyClassFilter}
              label={t('pages.dashboard.classes')}
              onChange={(event) => setHistoryClassFilter(String(event.target.value))}
            >
              {historyClassOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ ml: { md: "auto" } }}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Download />} onClick={handleExportHistory} disabled={filteredHistoryRecords.length === 0 || exporting}>
                {exporting ? t('common.loading') : t('common.export') + ' ' + t('common.history')}
              </Button>
              <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetchHistory()}>
                {t('common.refresh')}
              </Button>
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
          <Chip label={`Records: ${historySummary.total}`} variant="outlined" />
          <Chip label={`Present: ${historySummary.present}`} color="success" variant="outlined" />
          <Chip label={`Late: ${historySummary.late}`} color="warning" variant="outlined" />
          <Chip label={`Absent: ${historySummary.absent}`} color="error" variant="outlined" />
          <Chip label={`Excused: ${historySummary.excused}`} color="info" variant="outlined" />
        </Box>

        <TableContainer sx={{ maxHeight: 380 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : filteredHistoryRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">No previous attendance records found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistoryRecords.slice(0, 800).map((record: any) => (
                  <TableRow key={record.id} hover>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.classLabel}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{record.studentName}</TableCell>
                    <TableCell>{record.studentId}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={record.status}
                        color={
                          record.status === "Present"
                            ? "success"
                            : record.status === "Late"
                              ? "warning"
                              : record.status === "Excused"
                                ? "info"
                                : "error"
                        }
                      />
                    </TableCell>
                    <TableCell>{record.remarks || "-"}</TableCell>
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

function SchoolAdminAttendanceDashboard() {
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: dashboardData,
    isLoading,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: [
      "attendance",
      "school-admin-dashboard",
      startDate,
      endDate,
      selectedGrade,
      selectedStatus,
      searchQuery,
      page,
      rowsPerPage,
    ],
    queryFn: () =>
      apiGet<any>("/attendance/summary/school-admin-dashboard", {
        startDate,
        endDate,
        grade: selectedGrade,
        status: selectedStatus,
        search: searchQuery,
        page: page + 1,
        limit: rowsPerPage,
      }),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    setPage(0);
  }, [startDate, endDate, selectedGrade, selectedStatus, searchQuery]);

  const summary = (dashboardData as any)?.data?.summary || {
    totalRecords: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    attendanceRate: 0,
    uniqueStudents: 0,
  };
  const gradeRateData = (dashboardData as any)?.data?.gradeRates || [];
  const recentTrend = (dashboardData as any)?.data?.dailyTrend || [];
  const tableRows: AdminAttendanceRecord[] = (dashboardData as any)?.data?.table?.rows || [];
  const tablePagination = (dashboardData as any)?.data?.table?.pagination || {
    page: 1,
    limit: rowsPerPage,
    total: 0,
    pages: 0,
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Attendance" }, { label: "Analytics" }]} />
      <PageHeader
        title="Attendance Analytics"
        subtitle="School-wide attendance across all students with filters, charts, and trends"
        action={
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetchAttendance()}>
            Refresh
          </Button>
        }
      />

      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              label="Grade"
              value={selectedGrade}
              onChange={(event) => setSelectedGrade(String(event.target.value))}
            >
              <MenuItem value="all">All Grades</MenuItem>
              <MenuItem value="9">Grade 9</MenuItem>
              <MenuItem value="10">Grade 10</MenuItem>
              <MenuItem value="11">Grade 11</MenuItem>
              <MenuItem value="12">Grade 12</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(String(event.target.value))}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Present">Present</MenuItem>
              <MenuItem value="Late">Late</MenuItem>
              <MenuItem value="Absent">Absent</MenuItem>
              <MenuItem value="Excused">Excused</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Search Student"
            size="small"
            placeholder="Name or Student ID"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{ minWidth: 220, ml: { md: "auto" } }}
          />
        </Stack>
      </Paper>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard title="Attendance Rate" value={`${summary.attendanceRate}%`} icon={<Check />} color="success" />
        <StatsCard title="Records" value={summary.totalRecords} icon={<Save />} color="info" />
        <StatsCard title="Unique Students" value={summary.uniqueStudents} icon={<Warning />} color="primary" />
        <StatsCard title="Absences" value={summary.absent} icon={<Close />} color="error" />
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Status Distribution
            </Typography>
            {isLoading ? (
              <LinearProgress />
            ) : (
              <Stack spacing={1.25}>
                {[
                  { label: "Present", value: summary.present, color: "success.main" },
                  { label: "Late", value: summary.late, color: "warning.main" },
                  { label: "Absent", value: summary.absent, color: "error.main" },
                  { label: "Excused", value: summary.excused, color: "info.main" },
                ].map((item) => {
                  const width =
                    summary.totalRecords > 0
                      ? `${Math.max(4, Math.round((item.value / summary.totalRecords) * 100))}%`
                      : "0%";
                  return (
                    <Box key={item.label}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="body2">{item.label}</Typography>
                        <Typography variant="body2">{item.value}</Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 8, background: "rgba(0,0,0,0.08)" }}>
                        <Box sx={{ height: "100%", width, borderRadius: 8, background: item.color }} />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Attendance Rate by Grade
            </Typography>
            {isLoading ? (
              <LinearProgress />
            ) : (
              <Box sx={{ display: "flex", alignItems: "end", gap: 1.5, minHeight: 165 }}>
                {gradeRateData.map((entry: any) => (
                  <Box key={entry.grade} sx={{ flex: 1, textAlign: "center" }}>
                    <Box
                      sx={{
                        height: `${Math.max(8, Math.round((entry.rate / 100) * 120))}px`,
                        background: entry.rate >= 90 ? "success.main" : entry.rate >= 80 ? "warning.main" : "error.main",
                        borderRadius: 1.5,
                      }}
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      G{entry.grade}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.rate}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          {t('pages.dashboard.last7DaysTrend')}
        </Typography>
        {isLoading ? (
          <LinearProgress />
        ) : recentTrend.length === 0 ? (
          <Alert severity="info">{t('pages.dashboard.noAttendanceRecordsFilters')}</Alert>
        ) : (
          <Box sx={{ display: "flex", alignItems: "end", gap: 1.25, minHeight: 145 }}>
            {recentTrend.map((entry: any) => (
              <Box key={entry.date} sx={{ flex: 1, textAlign: "center" }}>
                <Box
                  sx={{
                    height: `${Math.max(8, Math.round((entry.rate / 100) * 110))}px`,
                    borderRadius: 1.5,
                    background: "primary.main",
                  }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {entry.rate}%
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {isLoading ? <LinearProgress /> : null}
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('pages.dashboard.date')}</TableCell>
                <TableCell>{t('pages.dashboard.student')}</TableCell>
                <TableCell>{t('pages.dashboard.studentId')}</TableCell>
                <TableCell>{t('pages.dashboard.grade')}</TableCell>
                <TableCell>{t('pages.dashboard.stream')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('pages.dashboard.teacher')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((record: AdminAttendanceRecord) => (
                <TableRow key={record.id} hover>
                  <TableCell>{record.date ? toDateInputValue(record.date) : "-"}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{record.fullName}</TableCell>
                  <TableCell>{record.studentId}</TableCell>
                  <TableCell>{record.grade ? `${t('pages.dashboard.grade')} ${record.grade}` : "-"}</TableCell>
                  <TableCell>{record.stream || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      size="small"
                      color={
                        record.status === "Present"
                          ? "success"
                          : record.status === "Late"
                            ? "warning"
                            : record.status === "Excused"
                              ? "info"
                              : "error"
                      }
                    />
                  </TableCell>
                  <TableCell>{record.teacherName}</TableCell>
                </TableRow>
              ))}
              {!isLoading && tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">{t('pages.dashboard.noAttendanceRecordsCurrent')}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={tablePagination.total}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </Paper>
    </Box>
  );
}

export function AttendanceMarkingPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  if (user?.role === "SchoolAdmin") {
    return <SchoolAdminAttendanceDashboard />;
  }
  if (user?.role === "SystemAdmin") {
    return (
      <Box>
        <Breadcrumbs items={[{ label: t('common.attendance') }]} />
        <PageHeader
          title={t('common.attendance')}
          subtitle="System Admin does not manage school-level attendance tasks."
        />
        <Alert severity="info">
          This page is reserved for School Admin and Teacher roles.
        </Alert>
      </Box>
    );
  }
  return <TeacherAttendanceMarkingPage />;
}
