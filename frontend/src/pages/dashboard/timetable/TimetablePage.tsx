import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  alpha,
  useTheme,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from "@mui/material";
import { Add, Download, AccessTime, EventAvailable } from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { FormModal } from "@/components/ui/FormModal";
import type { FormField } from "@/components/ui/FormModal";
import {
  useTimetables,
  useCreateTimetable,
  useUpdateTimetable,
} from "@/hooks/timetable/useTimetable";
import { useTeachers } from "@/hooks/teachers/useTeachers";
import { useAuthStore } from "@/stores/authStore";
import { apiGet } from "@/services/api";
import { academicYearService } from "@/services/academicYearService";
import {
  type DayOfWeek,
  type Period,
  type TimetableScheduleEntry,
  defaultPeriods,
  subjects,
  timetableService,
} from "@/services/timetableService";

const weekDays: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

type TimetableEntry = {
  id: string;
  timetableId: string;
  day: DayOfWeek;
  periodId: string;
  period: Period;
  subject: string;
  teacherId: string;
  teacherName: string;
  className: string;
  stream: string;
  room?: string;
  semester: string;
  academicYear: string;
};

type RestrictedClassOption = {
  grade: string;
  stream: string;
  label: string;
};

const adminClassOptions: RestrictedClassOption[] = [
  { grade: "9", stream: "", label: "Grade 9" },
  { grade: "10", stream: "", label: "Grade 10" },
  { grade: "11", stream: "Natural", label: "Grade 11 - Natural" },
  { grade: "11", stream: "Social", label: "Grade 11 - Social" },
  { grade: "12", stream: "Natural", label: "Grade 12 - Natural" },
  { grade: "12", stream: "Social", label: "Grade 12 - Social" },
];

const toMinutes = (time: string): number => {
  const [h = "0", m = "0"] = String(time).split(":");
  return Number(h) * 60 + Number(m);
};

const getNowMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export function TimetablePage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const canManageTimetable =
    user?.role === "SchoolAdmin" || user?.role === "SystemAdmin";
  const isViewOnly = !canManageTimetable;

  const [selectedClass, setSelectedClass] = useState("10");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [activeAcademicYear, setActiveAcademicYear] = useState("");
  const [restrictedClassOptions, setRestrictedClassOptions] = useState<
    RestrictedClassOption[]
  >([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableEntry | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [precheckOpen, setPrecheckOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [precheckData, setPrecheckData] = useState<any>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsData, setVersionsData] = useState<any[]>([]);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const semesterLabel = useMemo(
    () =>
      String(selectedSemester).startsWith("Semester")
        ? selectedSemester
        : `Semester ${selectedSemester}`,
    [selectedSemester],
  );
  const isStreamGrade = selectedClass === "11" || selectedClass === "12";
  const visibleClassOptions = canManageTimetable
    ? adminClassOptions
    : restrictedClassOptions;
  const selectedClassOptionValue = `${selectedClass}::${selectedStream || ""}`;

  const { data: timetableData, isLoading: isLoadingTimetable, refetch: refetchTimetables } =
    useTimetables(
      {
        class: selectedClass,
        stream: isStreamGrade ? selectedStream : undefined,
        semester: semesterLabel,
        academicYear: activeAcademicYear || undefined,
      },
      {
        enabled: Boolean(
          selectedClass &&
            semesterLabel &&
            activeAcademicYear &&
            (canManageTimetable || visibleClassOptions.length > 0),
        ),
      },
    );

  const timetablesRaw: any[] = useMemo(() => {
    const raw =
      (timetableData as any)?.data ||
      (timetableData as any)?.timetables ||
      (Array.isArray(timetableData) ? timetableData : []);
    return Array.isArray(raw) ? raw : [];
  }, [timetableData]);

  const currentSelectionTimetables = useMemo(
    () =>
      timetablesRaw.filter((t) => {
        const grade = String(t?.class || t?.grade || "");
        const tmSemester = String(t?.semester || "");
        const tmStream = String(t?.stream || t?.section || "");
        const tmAcademicYear = String(t?.academicYear || "");
        if (grade !== selectedClass) return false;
        if (isStreamGrade && tmStream !== selectedStream) return false;
        if (tmSemester !== semesterLabel) return false;
        if (activeAcademicYear && tmAcademicYear !== activeAcademicYear) return false;
        if (!canManageTimetable && t?.status !== "Published") return false;
        return true;
      }),
    [
      activeAcademicYear,
      canManageTimetable,
      isStreamGrade,
      selectedClass,
      selectedStream,
      semesterLabel,
      timetablesRaw,
    ],
  );

  const latestTimetableMeta = useMemo(() => {
    if (!currentSelectionTimetables.length) return null;
    const sorted = [...currentSelectionTimetables].sort((a, b) => {
      const av = Number(a?.version || 0);
      const bv = Number(b?.version || 0);
      if (av !== bv) return bv - av;
      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    });
    return sorted[0];
  }, [currentSelectionTimetables]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardContext = async () => {
      try {
        const activeYearResponse: any =
          await academicYearService.getActiveAcademicYear();
        const activeYearData =
          activeYearResponse?.data ?? activeYearResponse?.year ?? activeYearResponse;
        const nextAcademicYear = String(
          activeYearData?.year || activeYearData || "",
        );
        if (!cancelled && nextAcademicYear) {
          setActiveAcademicYear(nextAcademicYear);
        }
      } catch {
        if (!cancelled) {
          setActiveAcademicYear("2025-2026");
        }
      }

      if (canManageTimetable || !user?.role) {
        if (!cancelled) {
          setRestrictedClassOptions([]);
        }
        return;
      }

      try {
        let nextOptions: RestrictedClassOption[] = [];

        if (user.role === "Teacher") {
          const response: any = await apiGet("/teachers/profile");
          const profile = (response?.data ?? response)?.teacherProfile || {};
          nextOptions = (profile.classes || []).map((entry: any) => ({
            grade: String(entry.grade || ""),
            stream: String(entry.stream || entry.section || ""),
            label: `Grade ${entry.grade}${
              entry.stream || entry.section ? ` - ${entry.stream || entry.section}` : ""
            }`,
          }));
        } else if (user.role === "Student") {
          const response: any = await apiGet("/students/profile");
          const profile = (response?.data ?? response)?.studentProfile || {};
          nextOptions = [
            {
              grade: String(profile.grade || ""),
              stream: String(profile.stream || profile.section || ""),
              label: `Grade ${profile.grade}${
                profile.stream || profile.section
                  ? ` - ${profile.stream || profile.section}`
                  : ""
              }`,
            },
          ];
        } else if (user.role === "Parent") {
          const response: any = await apiGet("/parents/children");
          const children =
            response?.data?.children ||
            response?.children ||
            response?.data ||
            [];
          const seen = new Set<string>();
          nextOptions = children
            .map((child: any) => {
              const profile = child?.studentProfile || {};
              const grade = String(profile.grade || child?.grade || "");
              const stream = String(
                profile.stream || profile.section || child?.stream || "",
              );
              return {
                grade,
                stream,
                label: `Grade ${grade}${stream ? ` - ${stream}` : ""}`,
              };
            })
            .filter((option: RestrictedClassOption) => {
              const key = `${option.grade}::${option.stream}`;
              if (!option.grade || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        }

        if (!cancelled) {
          setRestrictedClassOptions(nextOptions);
          if (nextOptions.length) {
            setSelectedClass(nextOptions[0].grade);
            setSelectedStream(nextOptions[0].stream);
          }
        }
      } catch {
        if (!cancelled) {
          setRestrictedClassOptions([]);
        }
      }
    };

    void loadDashboardContext();

    return () => {
      cancelled = true;
    };
  }, [canManageTimetable, user?.role]);

  const { data: teachersData } = useTeachers({ limit: 100 });
  const teachers = useMemo(
    () =>
      ((teachersData as any)?.data || (teachersData as any)?.teachers || []).map((t: any) => ({
        value: t.id || t._id,
        label: `${t.firstName || ""} ${t.lastName || ""}`.trim(),
      })),
    [teachersData],
  );

  const slots: TimetableEntry[] = useMemo(() => {
    const displayedTimetables = latestTimetableMeta ? [latestTimetableMeta] : [];

    return displayedTimetables.flatMap((t: any) => {
      const rows = t?.schedule || t?.schedules || [];
      if (!Array.isArray(rows)) return [];

      return rows
        .map((row: any, idx: number) => {
          const day = row?.day as DayOfWeek;
          if (!day || !weekDays.includes(day)) return null;

          const periodObj = row?.period && typeof row.period === "object"
            ? {
                id: String(row.period.id || row.period.periodNumber || idx + 1),
                periodNumber: Number(row.period.periodNumber || idx + 1),
                startTime: row.period.startTime || "08:00",
                endTime: row.period.endTime || "08:45",
                duration: Number(row.period.duration || 45),
              }
            : defaultPeriods.find((p) => String(p.periodNumber) === String(row?.period)) || defaultPeriods[0];

          const teacherName =
            row?.teacherName ||
            `${row?.teacher?.firstName || ""} ${row?.teacher?.lastName || ""}`.trim() ||
            "-";

          return {
            id: row?._id || row?.id || `${t?._id || t?.id}-${day}-${periodObj.id}-${idx}`,
            timetableId: t?._id || t?.id || "",
            day,
            periodId: String(periodObj.id),
            period: periodObj,
            subject: row?.subject || "-",
            teacherId: row?.teacherId || row?.teacher?._id || row?.teacher || "",
            teacherName,
            className: String(t?.class || t?.grade || selectedClass),
            stream: String(t?.stream || t?.section || ""),
            room: row?.room || "",
            semester: String(t?.semester || selectedSemester),
            academicYear: String(t?.academicYear || activeAcademicYear || ""),
          } as TimetableEntry;
        })
        .filter(Boolean) as TimetableEntry[];
    });
  }, [activeAcademicYear, latestTimetableMeta, selectedClass, selectedSemester]);

  const getSlotForCell = (day: DayOfWeek, period: Period): TimetableEntry | null =>
    slots.find((s) => s.day === day && String(s.period.periodNumber) === String(period.periodNumber)) || null;

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const today = useMemo(
    () => new Date(nowTick).toLocaleDateString("en-US", { weekday: "long" }) as DayOfWeek,
    [nowTick],
  );
  const nowMinutes = useMemo(() => getNowMinutes(), [nowTick]);

  const todaySlots = useMemo(
    () =>
      slots
        .filter((s) => s.day === today)
        .sort((a, b) => toMinutes(a.period.startTime) - toMinutes(b.period.startTime)),
    [slots, today],
  );

  const currentClass = useMemo(
    () =>
      todaySlots.find((s) => {
        const start = toMinutes(s.period.startTime);
        const end = toMinutes(s.period.endTime);
        return nowMinutes >= start && nowMinutes < end;
      }) || null,
    [todaySlots, nowMinutes],
  );

  const nextClass = useMemo(
    () => todaySlots.find((s) => toMinutes(s.period.startTime) > nowMinutes) || null,
    [todaySlots, nowMinutes],
  );

  const stats = useMemo(() => {
    const uniqueSubjects = new Set(slots.map((s) => s.subject));
    const uniqueTeachers = new Set(slots.map((s) => s.teacherName));
    const uniqueRooms = new Set(slots.map((s) => s.room).filter(Boolean));

    return {
      periods: slots.length,
      subjects: uniqueSubjects.size,
      teachers: uniqueTeachers.size,
      rooms: uniqueRooms.size,
    };
  }, [slots]);

  const createTimetable = useCreateTimetable();
  const updateTimetable = useUpdateTimetable();

  const formFields: FormField[] = [
    {
      name: "day",
      label: "Day",
      type: "select",
      required: true,
      options: weekDays.map((d) => ({ value: d, label: d })),
    },
    {
      name: "periodId",
      label: "Period",
      type: "select",
      required: true,
      options: defaultPeriods.map((p) => ({
        value: p.id,
        label: `${p.periodNumber}. ${p.startTime} - ${p.endTime}`,
      })),
    },
    {
      name: "subject",
      label: "Subject",
      type: "select",
      required: true,
      options: subjects.map((s) => ({ value: s, label: s })),
    },
    {
      name: "teacherId",
      label: "Teacher",
      type: "select",
      required: true,
      options: teachers,
    },
    {
      name: "room",
      label: "Room",
      type: "text",
      placeholder: "e.g., Room 201",
    },
  ];

  const normalizeScheduleForUpdate = (
    rows: TimetableScheduleEntry[] = [],
  ): TimetableScheduleEntry[] =>
    rows.map((row, idx) => ({
      day: row.day,
      period:
        typeof row.period === "object"
          ? Number(row.period.periodNumber || row.period.id || idx + 1)
          : Number(row.period),
      subject: row.subject,
      teacher:
        row.teacherId ||
        (typeof row.teacher === "object"
          ? (row.teacher as any)?._id || (row.teacher as any)?.id
          : row.teacher),
      room: row.room,
      startTime:
        row.startTime ||
        (typeof row.period === "object" ? row.period.startTime : undefined),
      endTime:
        row.endTime ||
        (typeof row.period === "object" ? row.period.endTime : undefined),
    }));

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    const period = defaultPeriods.find((p) => p.id === values.periodId) || defaultPeriods[0];
    const latestTimetableId = latestTimetableMeta?._id || latestTimetableMeta?.id;
    const latestSchedule = normalizeScheduleForUpdate(
      (latestTimetableMeta?.schedule || []) as TimetableScheduleEntry[],
    );

    const scheduleData: TimetableScheduleEntry = {
      day: values.day as DayOfWeek,
      period: period.periodNumber,
      subject: values.subject as string,
      teacher: values.teacherId as string,
      teacherId: values.teacherId as string,
      room: (values.room as string) || "",
      startTime: period.startTime,
      endTime: period.endTime,
    };

    const hasConflictingSlot = slots.some(
      (slot) =>
        slot.day === scheduleData.day &&
        String(slot.period.periodNumber) === String(period.periodNumber) &&
        (!selectedSlot || slot.id !== selectedSlot.id),
    );

    if (hasConflictingSlot) {
      toast.error("A class is already scheduled for that day and period");
      return;
    }

    if (
      selectedSlot &&
      latestTimetableId &&
      latestTimetableMeta?.status === "Draft"
    ) {
      const nextSchedule = latestSchedule.map((row, idx) => {
        const rowId =
          (latestTimetableMeta?.schedule?.[idx] as any)?._id ||
          (latestTimetableMeta?.schedule?.[idx] as any)?.id ||
          `${selectedSlot.timetableId}-${row.day}-${row.period}-${idx}`;
        return rowId === selectedSlot.id ? scheduleData : row;
      });

      await updateTimetable.mutateAsync({
        id: latestTimetableId,
        data: { schedule: nextSchedule },
      });
    } else if (latestTimetableId && latestTimetableMeta) {
      const nextSchedule = selectedSlot
        ? latestSchedule.map((row, idx) => {
            const rowId =
              (latestTimetableMeta?.schedule?.[idx] as any)?._id ||
              (latestTimetableMeta?.schedule?.[idx] as any)?.id ||
              `${selectedSlot.timetableId}-${row.day}-${row.period}-${idx}`;
            return rowId === selectedSlot.id ? scheduleData : row;
          })
        : [...latestSchedule, scheduleData];

      await createTimetable.mutateAsync({
        grade: selectedClass,
        stream: isStreamGrade ? selectedStream : undefined,
        semester: selectedSemester,
        academicYear: activeAcademicYear,
        schedule: nextSchedule,
      } as any);
    } else {
      await createTimetable.mutateAsync({
        grade: selectedClass,
        stream: isStreamGrade ? selectedStream : undefined,
        semester: selectedSemester,
        academicYear: activeAcademicYear,
        schedules: [scheduleData],
      } as any);
    }

    setFormModalOpen(false);
    setSelectedSlot(null);
  };

  const runPrecheck = async () => {
    try {
      const response = await timetableService.generatePrecheck({
        class: selectedClass,
        stream: isStreamGrade ? selectedStream : "",
        academicYear: activeAcademicYear,
        semester: semesterLabel,
      });
      setPrecheckData((response as any)?.data || (response as any));
      setPrecheckOpen(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to run pre-check");
    }
  };

  const runGenerate = async (force = false) => {
    try {
      setIsGenerating(true);
      const response = await timetableService.generateTimetable({
        class: selectedClass,
        stream: isStreamGrade ? selectedStream : "",
        academicYear: activeAcademicYear,
        semester: semesterLabel,
        force,
      });
      const summary = (response as any)?.data?.summary;
      const warnings = summary?.warnings || [];
      if (warnings.length) {
        toast.success(`Generated with ${warnings.length} warning(s)`);
      } else {
        toast.success("Timetable generated successfully");
      }
      await refetchTimetables();
      setPrecheckOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate timetable");
    } finally {
      setIsGenerating(false);
    }
  };

  const publishLatestDraft = async () => {
    try {
      if (!latestTimetableMeta?._id && !latestTimetableMeta?.id) {
        toast.error("No timetable version found to publish");
        return;
      }
      const id = latestTimetableMeta._id || latestTimetableMeta.id;
      await timetableService.publishTimetable(id, true);
      toast.success("Draft published and locked");
      await refetchTimetables();
    } catch (error: any) {
      toast.error(error?.message || "Failed to publish timetable");
    }
  };

  const openVersions = async () => {
    try {
      const response = await timetableService.getVersions({
        class: selectedClass,
        stream: isStreamGrade ? selectedStream : "",
        academicYear: activeAcademicYear,
        semester: semesterLabel,
      });
      const data = (response as any)?.data || [];
      setVersionsData(Array.isArray(data) ? data : []);
      setCompareResult(null);
      setVersionsOpen(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load versions");
    }
  };

  const compareTopTwoVersions = async () => {
    try {
      if (versionsData.length < 2) {
        toast.error("Need at least two versions to compare");
        return;
      }
      const left = versionsData[0]?._id || versionsData[0]?.id;
      const right = versionsData[1]?._id || versionsData[1]?.id;
      const response = await timetableService.compareVersions(left, right);
      setCompareResult((response as any)?.data || null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to compare versions");
    }
  };

  const rollbackToVersion = async (id: string) => {
    try {
      await timetableService.rollbackVersion(id);
      toast.success("Rollback draft created");
      await refetchTimetables();
      await openVersions();
    } catch (error: any) {
      toast.error(error?.message || "Failed to rollback");
    }
  };

  const deleteAllVersions = async () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteAllVersions = async () => {
    try {
      const deletableVersions = versionsData.filter(
        (version) => version?.status !== "Published" && !version?.isLocked,
      );

      if (!deletableVersions.length) {
        toast.error("No draft versions found to delete");
        return;
      }

      for (const version of deletableVersions) {
        const id = version?._id || version?.id;
        if (!id) continue;
        await timetableService.deleteTimetable(id);
      }

      toast.success("Draft timetable versions deleted");
      setVersionsData((prev) =>
        prev.filter((version) => version?.status === "Published" || version?.isLocked),
      );
      setCompareResult(null);
      await refetchTimetables();
      setVersionsOpen(false);
      setDeleteConfirmOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete timetable versions");
    }
  };

  const exportVisibleTimetable = () => {
    if (!slots.length) {
      toast.error("No timetable data available to export");
      return;
    }

    const header = ["Day", "Period", "Start Time", "End Time", "Subject", "Teacher", "Room"];
    const rows = slots
      .slice()
      .sort((a, b) => {
        const dayDiff = weekDays.indexOf(a.day) - weekDays.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.period.periodNumber - b.period.periodNumber;
      })
      .map((slot) => [
        slot.day,
        String(slot.period.periodNumber),
        slot.period.startTime,
        slot.period.endTime,
        slot.subject,
        slot.teacherName,
        slot.room || "",
      ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timetable-grade-${selectedClass}${
      selectedStream ? `-${selectedStream.toLowerCase()}` : ""
    }-${selectedSemester}-${activeAcademicYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Timetable exported");
  };

  const getSubjectColor = (subject: string): string => {
    const colors: Record<string, string> = {
      Mathematics: "#1e88e5",
      English: "#43a047",
      Biology: "#00acc1",
      Chemistry: "#8e24aa",
      Physics: "#fb8c00",
      Geography: "#546e7a",
      History: "#6d4c41",
      Civics: "#d81b60",
      "Information Communication Technology (ICT)": "#3949ab",
      Amharic: "#00897b",
      "Physical and Health Education (HPE)": "#e53935",
      Economics: "#6d4c41",
    };
    return colors[subject] || theme.palette.primary.main;
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Timetable" }]} />

      <PageHeader
        title="Timetable"
        subtitle="Weekly class schedule with live class tracking"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={exportVisibleTimetable}
              aria-label="Export timetable"
              disabled={!slots.length}
            >
              Export
            </Button>
            {!isViewOnly && (
              <Button
                variant="outlined"
                onClick={runPrecheck}
                aria-label="Generate timetable"
              >
                Generate Timetable
              </Button>
            )}
            {!isViewOnly && (
              <Button variant="outlined" onClick={openVersions}>
                Versions
              </Button>
            )}
            {!isViewOnly && latestTimetableMeta?.status === "Draft" && (
              <Button variant="contained" color="success" onClick={publishLatestDraft}>
                Publish Draft
              </Button>
            )}
            {!isViewOnly && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setFormModalOpen(true)}>
                {latestTimetableMeta?.status === "Draft" ? "Add Slot" : "Create Draft"}
              </Button>
            )}
          </Box>
        }
      />

      {latestTimetableMeta && (
        <Box sx={{ mb: 2, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Version ${latestTimetableMeta.version || 1}`} size="small" />
          <Chip
            label={latestTimetableMeta.status || "Draft"}
            size="small"
            color={latestTimetableMeta.status === "Published" ? "success" : "default"}
          />
          {latestTimetableMeta.isLocked && <Chip label="Locked" size="small" color="warning" />}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Paper sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 260 }}>
          <Typography variant="caption" color="text.secondary">Current Class</Typography>
          {currentClass ? (
            <Box>
              <Typography variant="h6" fontWeight={700}>{currentClass.subject}</Typography>
              <Typography variant="body2" color="text.secondary">
                {currentClass.period.startTime} - {currentClass.period.endTime} | {currentClass.teacherName} | {currentClass.room || "Room -"}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No class right now</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 260 }}>
          <Typography variant="caption" color="text.secondary">Next Class</Typography>
          {nextClass ? (
            <Box>
              <Typography variant="h6" fontWeight={700}>{nextClass.subject}</Typography>
              <Typography variant="body2" color="text.secondary">
                {nextClass.period.startTime} - {nextClass.period.endTime} | {nextClass.teacherName} | {nextClass.room || "Room -"}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No more classes today</Typography>
          )}
        </Paper>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard title="Periods" value={stats.periods} icon={<AccessTime />} color="primary" />
        <StatsCard title="Subjects" value={stats.subjects} icon={<EventAvailable />} color="success" />
        <StatsCard title="Teachers" value={stats.teachers} icon={<EventAvailable />} color="info" />
        <StatsCard title="Rooms" value={stats.rooms} icon={<EventAvailable />} color="warning" />
      </Box>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          {canManageTimetable ? (
            <>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Class</InputLabel>
                <Select
                  label="Class"
                  value={selectedClass}
                  onChange={(e) => {
                    const nextClass = String(e.target.value);
                    setSelectedClass(nextClass);
                    if (nextClass === "11" || nextClass === "12") {
                      setSelectedStream("Natural");
                    } else {
                      setSelectedStream("");
                    }
                  }}
                >
                  <MenuItem value="9">Grade 9</MenuItem>
                  <MenuItem value="10">Grade 10</MenuItem>
                  <MenuItem value="11">Grade 11</MenuItem>
                  <MenuItem value="12">Grade 12</MenuItem>
                </Select>
              </FormControl>

              {isStreamGrade && (
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <InputLabel>Stream</InputLabel>
                  <Select
                    label="Stream"
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(String(e.target.value))}
                  >
                    <MenuItem value="Natural">Natural</MenuItem>
                    <MenuItem value="Social">Social</MenuItem>
                  </Select>
                </FormControl>
              )}
            </>
          ) : visibleClassOptions.length > 1 ? (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Class</InputLabel>
              <Select
                label="Class"
                value={selectedClassOptionValue}
                onChange={(e) => {
                  const [grade, stream] = String(e.target.value).split("::");
                  setSelectedClass(grade);
                  setSelectedStream(stream || "");
                }}
              >
                {visibleClassOptions.map((option) => (
                  <MenuItem
                    key={`${option.grade}::${option.stream}`}
                    value={`${option.grade}::${option.stream}`}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Paper sx={{ px: 2, py: 1, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Class
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {visibleClassOptions[0]?.label ||
                  `Grade ${selectedClass}${selectedStream ? ` - ${selectedStream}` : ""}`}
              </Typography>
            </Paper>
          )}

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Semester</InputLabel>
            <Select
              label="Semester"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(String(e.target.value))}
            >
              <MenuItem value="1">Semester 1</MenuItem>
              <MenuItem value="2">Semester 2</MenuItem>
            </Select>
          </FormControl>

          <Paper sx={{ px: 2, py: 1, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Academic Year
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {activeAcademicYear || "Loading..."}
            </Typography>
          </Paper>
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "auto" }}>
        {!canManageTimetable && visibleClassOptions.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No assigned class timetable is available for your account.
            </Typography>
          </Box>
        ) : isLoadingTimetable ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress size={24} /></Box>
        ) : slots.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No timetable found for this class.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ minWidth: 820 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "120px repeat(5, minmax(120px, 1fr))",
                gap: 1,
                p: 2,
                background: alpha(theme.palette.primary.main, 0.05),
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" fontWeight={700}>Time</Typography>
              {weekDays.map((day) => (
                <Typography key={day} variant="body2" fontWeight={700} align="center">{day.slice(0, 3)}</Typography>
              ))}
            </Box>

            {defaultPeriods.map((period) => (
              <Box
                key={period.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "120px repeat(5, minmax(120px, 1fr))",
                  gap: 1,
                  p: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Box sx={{ p: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="body2" fontWeight={600}>P{period.periodNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {period.startTime} - {period.endTime}
                  </Typography>
                </Box>

                {weekDays.map((day) => {
                  const cellSlot = getSlotForCell(day, period);
                  const isCurrent = cellSlot?.id === currentClass?.id;

                  return (
                    <Paper
                      key={`${day}-${period.id}`}
                      sx={{
                        p: 1,
                        minHeight: 90,
                        borderRadius: 1.5,
                        border: `1px solid ${
                          cellSlot ? getSubjectColor(cellSlot.subject) : theme.palette.divider
                        }`,
                        background: cellSlot
                          ? alpha(getSubjectColor(cellSlot.subject), isCurrent ? 0.2 : 0.1)
                          : alpha(theme.palette.grey[200], 0.25),
                        boxShadow: isCurrent
                          ? `0 0 0 2px ${alpha(theme.palette.success.main, 0.55)}`
                          : "none",
                        transition: "all 0.2s ease",
                        cursor: isViewOnly ? "default" : "pointer",
                        "&:hover": {
                          background: cellSlot
                            ? alpha(getSubjectColor(cellSlot.subject), isCurrent ? 0.25 : 0.16)
                            : alpha(theme.palette.grey[300], 0.3),
                        },
                      }}
                      onClick={() => {
                        if (isViewOnly) return;
                        if (cellSlot) {
                          setSelectedSlot(cellSlot);
                          setFormModalOpen(true);
                        }
                      }}
                    >
                      {cellSlot ? (
                        <>
                          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {cellSlot.subject}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            {cellSlot.teacherName || "Teacher -"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {cellSlot.room ? `Room ${cellSlot.room}` : "Room -"}
                          </Typography>
                          {isCurrent && (
                            <Chip
                              label="Now"
                              size="small"
                              color="success"
                              sx={{ mt: 0.75, height: 20, fontSize: "0.68rem" }}
                            />
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog open={precheckOpen} onClose={() => setPrecheckOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generation Pre-check</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Class: Grade {selectedClass}{isStreamGrade ? ` - ${selectedStream}` : ""}
          </Typography>
          {precheckData?.impossibleLoad && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Impossible weekly load detected. Generator will downscale lower-priority subjects.
            </Alert>
          )}
          {!!precheckData?.missingTeachers?.length && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Missing teachers: {precheckData.missingTeachers.join(", ")}
            </Alert>
          )}
          {!!precheckData?.warnings?.length && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {precheckData.warnings.join(" ")}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            Required slots: {precheckData?.requiredSlots ?? "-"} | Available slots: {precheckData?.availableSlots ?? "-"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrecheckOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => runGenerate(Boolean(precheckData?.impossibleLoad))} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Run Generator"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={versionsOpen} onClose={() => setVersionsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Timetable Versions</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
            <Button size="small" variant="outlined" onClick={compareTopTwoVersions}>
              Compare Top 2
            </Button>
            {!isViewOnly &&
              versionsData.some(
                (version) => version?.status !== "Published" && !version?.isLocked,
              ) && (
              <Button size="small" color="error" variant="outlined" onClick={deleteAllVersions}>
                Delete Drafts
              </Button>
            )}
          </Box>
          {!!compareResult && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Compared v{compareResult.leftVersion} vs v{compareResult.rightVersion}: {compareResult.changeCount} change(s)
            </Alert>
          )}
          <Divider sx={{ mb: 1 }} />
          {versionsData.length === 0 ? (
            <Typography color="text.secondary">No versions found.</Typography>
          ) : (
            versionsData.map((version: any) => {
              const id = version?._id || version?.id;
              return (
                <Box key={id} sx={{ py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      v{version.version || 1} - {version.status || "Draft"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(version.createdAt || Date.now()).toLocaleString()}
                    </Typography>
                  </Box>
                  {!isViewOnly && (
                    <Button size="small" onClick={() => rollbackToVersion(id)}>
                      Rollback
                    </Button>
                  )}
                </Box>
              );
            })
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Delete all draft timetable versions for this class? Published or locked versions will be kept.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteAllVersions}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <FormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedSlot(null);
        }}
        title={selectedSlot ? "Edit Class Slot" : "Add Class Slot"}
        fields={formFields}
        initialValues={
          selectedSlot
            ? {
                day: selectedSlot.day,
                periodId: selectedSlot.periodId,
                subject: selectedSlot.subject,
                teacherId: selectedSlot.teacherId,
                room: selectedSlot.room || "",
              }
            : {
                day: "Monday",
                periodId: "1",
                subject: "",
                teacherId: "",
                room: "",
              }
        }
        onSubmit={handleFormSubmit}
        submitText={selectedSlot ? "Update" : "Add"}
      />
    </Box>
  );
}
