import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { apiGet } from "@/services/api";

interface ClassData {
  id: string;
  name: string;
  grade: string;
  stream: string;
  capacity: number;
  students: number;
  classTeacher: string;
  subjects: string[];
  status: "Active" | "Inactive";
}

const grades = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const streams = ["Natural Science", "Social Science"];
const allSubjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
  "Geography",
  "Civics",
  "ICT",
  "Physical Education",
];

export function ClassesPage() {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [gradeFilter, setGradeFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users-students-classes"],
    queryFn: () => apiGet<any>("/admin/users?role=Student&limit=500&page=1"),
  });

  const classes = useMemo((): ClassData[] => {
    const users = (usersData as any)?.data ?? (usersData as any)?.users ?? [];
    if (!Array.isArray(users)) return [];
    const byClass: Record<string, { count: number }> = {};
    for (const u of users) {
      const g = u.studentProfile?.grade || u.grade || "9";
      // For grades 11-12, use stream. For grades 9-10, no stream needed.
      const studentStream =
        g === "11" || g === "12"
          ? u.studentProfile?.stream || u.stream || ""
          : "";
      const grade = String(g).replace("Grade ", "");
      const key = studentStream ? `${grade}-${studentStream}` : grade;
      byClass[key] = byClass[key] || { count: 0 };
      byClass[key].count += 1;
    }
    return Object.entries(byClass)
      .map(([key, { count }]) => {
        const isGrade11or12 = key.includes("-");
        const grade = isGrade11or12 ? key.split("-")[0] : key;
        const stream = isGrade11or12 ? key.split("-")[1] : "";
        return {
          id: key,
          name: isGrade11or12 ? `Grade ${grade} - ${stream}` : `Grade ${grade}`,
          grade: `Grade ${grade}`,
          stream,
          capacity: 45,
          students: count,
          classTeacher: "-",
          subjects: [],
          status: "Active" as const,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usersData]);

  const filteredClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return classes.filter((c: ClassData) => {
      if (gradeFilter && c.grade !== gradeFilter) return false;

      if (!normalizedSearch) return true;

      return [
        c.name,
        c.grade,
        c.stream,
        c.classTeacher,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [classes, gradeFilter, search]);

  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    stream: "",
    capacity: 40,
    classTeacher: "",
    subjects: [] as string[],
    status: "Active" as "Active" | "Inactive",
  });

  const handleOpenDialog = (classData?: ClassData) => {
    if (classData) {
      setSelectedClass(classData);
      setFormData({
        name: classData.name,
        grade: classData.grade,
        stream: classData.stream,
        capacity: classData.capacity,
        classTeacher: classData.classTeacher,
        subjects: classData.subjects,
        status: classData.status,
      });
    } else {
      setSelectedClass(null);
      setFormData({
        name: "",
        grade: "",
        stream: "",
        capacity: 40,
        classTeacher: "",
        subjects: [],
        status: "Active",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedClass(null);
  };

  const columns: Column<ClassData>[] = [
    { id: "name", label: t('common.className'), minWidth: 120 },
    { id: "grade", label: t('common.grade'), minWidth: 100 },
    { id: "stream", label: t('common.stream'), minWidth: 100 },
    {
      id: "capacity",
      label: t('common.students'),
      minWidth: 100,
      format: (_, row) => `${row.students}/${row.capacity}`,
    },
    { id: "classTeacher", label: t('common.classTeacher'), minWidth: 150 },
    {
      id: "status",
      label: t('common.status'),
      minWidth: 100,
      format: (_, row) => (
        <Chip
          label={row.status}
          color={row.status === "Active" ? "success" : "default"}
          size="small"
        />
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        {t('common.classesStreams')}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {t('common.viewClasses')}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                placeholder={t('common.searchClasses')}
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('common.grade')}</InputLabel>
                <Select 
                  label={t('common.grade')} 
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                >
                  <MenuItem value="">{t('common.allGrades')}</MenuItem>
                  {grades.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <DataTable
            rows={filteredClasses}
            columns={columns}
            onRowClick={handleOpenDialog}
            rowsPerPage={5}
          />

          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "primary.light",
                    color: "white",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h4" fontWeight={700}>
                    {filteredClasses.length}
                  </Typography>
                  <Typography variant="body2">{t('common.totalClasses')}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {filteredClasses.reduce((sum, c) => sum + c.students, 0)}
                  </Typography>
                  <Typography variant="body2">{t('common.totalStudents')}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {grades.length}
                  </Typography>
                  <Typography variant="body2">{t('common.grades')}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {filteredClasses.filter((c) => c.status === "Active").length}
                  </Typography>
                  <Typography variant="body2">{t('common.activeClasses')}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('common.classDetails')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Grade</InputLabel>
                <Select
                  label="Grade"
                  value={formData.grade}
                  disabled
                  onChange={() => {}}
                >
                  {grades.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Stream</InputLabel>
                <Select
                  label="Stream"
                  value={formData.stream}
                  disabled
                  onChange={() => {}}
                >
                  {streams.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Class Name"
                value={formData.name}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Students / Capacity"
                value={
                  selectedClass
                    ? `${selectedClass.students} / ${formData.capacity}`
                    : "0 / 45"
                }
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Class Teacher"
                value={formData.classTeacher}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
