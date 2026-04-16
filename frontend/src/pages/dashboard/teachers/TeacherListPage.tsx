import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
  useTheme,
  Chip as MUIChip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
} from "@mui/material";
import { Add, People, School, Subject, Delete, AddCircle } from "@mui/icons-material";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableEmptyState } from "@/components/ui/EmptyState";
import { TableLoading } from "@/components/ui/LoadingSpinner";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { teacherService } from "@/services/teacherService";
import type { Teacher } from "@/services/teacherService";
import { GRADES } from "@/constants/academic";
import {
  useTeachers as useTeacherList,
  useCreateTeacher,
  useUpdateTeacher,
  useDeleteTeacher,
} from "@/hooks/teachers/useTeachers";

const mapTeacherToFormValues = (teacher: Teacher | null) => {
  if (!teacher) {
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "",
      qualification: "",
      specialization: "",
      subjects: [] as string[],
      classes: [] as Array<{ grade: string; section?: string; stream?: string }>,
      address: { street: "", city: "", region: "" },
    };
  }

  const profile = (teacher as any).teacherProfile || {};
  const rootAddress = (teacher as any).address || {};
  const profileAddress = profile.homeAddress || {};
  const qualifications = profile.qualifications || [];
  const subjects = profile.subjects || teacher.subjects || [];
  const classes = profile.classes || teacher.classes || [];

  return {
    firstName: teacher.firstName || "",
    lastName: teacher.lastName || "",
    email: teacher.email || "",
    phone: teacher.phone || "",
    gender: (teacher as any).gender || profile.gender || "",
    qualification:
      (teacher as any).qualification ||
      (Array.isArray(qualifications) && qualifications.length > 0
        ? qualifications[0]
        : ""),
    specialization: (teacher as any).specialization || profile.specialization || "",
    subjects: Array.isArray(subjects) ? subjects : [],
    classes: Array.isArray(classes) ? classes : [],
    address: {
      street: rootAddress.street || profileAddress.street || "",
      city: rootAddress.city || profileAddress.city || "",
      region: rootAddress.region || profileAddress.state || "",
    },
  };
};

export function TeacherListPage() {
  const theme = useTheme();

  // State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    subject: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal and selection state
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formValues, setFormValues] = useState(mapTeacherToFormValues(null));

  // Reset form when modal opens/closes or teacher changes
  useEffect(() => {
    setFormValues(mapTeacherToFormValues(selectedTeacher));
  }, [selectedTeacher, formModalOpen]);

  const addClass = () => {
    setFormValues((prev) => ({
      ...prev,
      classes: [...prev.classes, { grade: "9", section: "A" }],
    }));
  };

  const removeClass = (index: number) => {
    setFormValues((prev) => ({
      ...prev,
      classes: prev.classes.filter((_, i) => i !== index),
    }));
  };

  const updateClass = (index: number, field: string, value: string) => {
    setFormValues((prev) => {
      const newClasses = [...prev.classes];
      const cls = { ...newClasses[index] };

      if (field === "grade") {
        cls.grade = value;
        // Reset section/stream when grade changes
        if (value === "11" || value === "12") {
          cls.stream = "Natural";
          delete cls.section;
        } else {
          cls.section = "A";
          delete cls.stream;
        }
      } else if (field === "section") {
        cls.section = value;
      } else if (field === "stream") {
        cls.stream = value;
      }

      newClasses[index] = cls;
      return { ...prev, classes: newClasses };
    });
  };

  const handleSubmit = async () => {
    if (isViewMode) return;
    setIsSubmitting(true);
    try {
      const subjectsArray = formValues.subjects.filter(Boolean);
      const data = {
        ...formValues,
        subjects: subjectsArray,
        // Set singular 'subject' to the first selected subject so the
        // teacher dashboard can auto-detect it via teacherProfile.subject
        subject: subjectsArray[0] || "",
      };

      if (selectedTeacher) {
        await updateTeacher.mutateAsync({
          id: selectedTeacher._id || selectedTeacher.id,
          data: data as any,
        });
      } else {
        await createTeacher.mutateAsync(data as any);
      }
      setFormModalOpen(false);
      setSelectedTeacher(null);
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use TanStack Query hooks
  const { data: teachersData, isLoading: isLoadingTeachers } = useTeacherList({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    status: filters.status || undefined,
  });

  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const deleteTeacher = useDeleteTeacher();

  const teachers = teachersData?.data ?? [];
  const total = teachersData?.pagination?.total ?? 0;

  // Table columns
  const columns: Column<Teacher>[] = useMemo(
    () => [
      {
        id: "firstName",
        label: "Teacher",
        format: (_, row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              {row.firstName.charAt(0)}
              {row.lastName.charAt(0)}
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {row.firstName} {row.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {row.employeeId}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: "email",
        label: "Email",
        format: (value) => <Typography variant="body2">{value}</Typography>,
      },
      {
        id: "qualification",
        label: "Qualification",
        format: (_, row) => {
          const qualifications = (row as any).teacherProfile?.qualifications;
          return (
            <Typography variant="body2">
              {Array.isArray(qualifications) && qualifications.length > 0
                ? qualifications[0]
                : "-"}
            </Typography>
          );
        },
      },
      {
        id: "subjects",
        label: "Subjects",
        format: (_, row) => {
          const subjects = (row as any).teacherProfile?.subjects || [];
          return (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {subjects.slice(0, 2).map((subject: string, i: number) => (
                <MUIChip
                  key={i}
                  label={subject}
                  size="small"
                  sx={{ fontSize: "0.7rem" }}
                />
              ))}
              {subjects.length > 2 && (
                <MUIChip
                  label={`+${subjects.length - 2}`}
                  size="small"
                  sx={{ fontSize: "0.7rem" }}
                />
              )}
            </Box>
          );
        },
      },
      {
        id: "classes",
        label: "Classes",
        format: (_, row) => {
          const classes = (row as any).teacherProfile?.classes || [];
          if (!Array.isArray(classes) || classes.length === 0) return "-";
          return (
            <Typography variant="body2">
              {classes
                .map(
                  (c: { grade: string; section?: string; stream?: string }) =>
                    c.stream
                      ? `${c.grade} ${c.stream}`
                      : `${c.grade}`,
                )
                .join(", ")}
            </Typography>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        format: (value) => (
          <Chip
            label={value}
            size="small"
            sx={{
              backgroundColor: alpha(
                value === "active"
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                0.1,
              ),
              color:
                value === "active"
                  ? theme.palette.success.main
                  : theme.palette.error.main,
              fontWeight: 500,
              textTransform: "capitalize",
            }}
          />
        ),
      },
    ],
    [theme],
  );

  // Subject options
  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "History",
    "Geography",
    "Civics",
    "Physical Education",
    "Economics",
    "ICT",
  ];

  const initialValues = selectedTeacher
    ? {
        firstName: selectedTeacher.firstName,
        lastName: selectedTeacher.lastName,
        email: selectedTeacher.email,
        phone: selectedTeacher.phone || "",
        qualification: (selectedTeacher as any).teacherProfile?.qualifications?.[0] || "",
        subjects: (selectedTeacher as any).teacherProfile?.subjects || [],
        classes: (selectedTeacher as any).teacherProfile?.classes || [],
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        qualification: "",
        subjects: [] as string[],
        classes: [],
      };

  const handleAdd = () => {
    setIsViewMode(false);
    setSelectedTeacher(null);
    setFormModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setIsViewMode(false);
    // Find fresh teacher data from the current cache to avoid stale data
    const freshTeacher = teachers.find((t) => (t._id || t.id) === (teacher._id || teacher.id));
    setSelectedTeacher(freshTeacher || teacher);
    setFormModalOpen(true);
  };

  const handleView = (teacher: Teacher) => {
    setIsViewMode(true);
    const freshTeacher = teachers.find((t) => (t._id || t.id) === (teacher._id || teacher.id));
    setSelectedTeacher(freshTeacher || teacher);
    setFormModalOpen(true);
  };

  const handleDelete = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTeacher) return;
    try {
      await deleteTeacher.mutateAsync(selectedTeacher._id || selectedTeacher.id);
      setDeleteDialogOpen(false);
    } catch {
      // Error already handled by hook
    }
  };

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (page !== 0) setPage(0);
  };

  // Stats
  const stats = useMemo(
    () => ({
      total,
      active: teachers.filter((t: any) => t.status?.toLowerCase() === "active").length,
      subjects: [...new Set(teachers.flatMap((t: any) => t.teacherProfile?.subjects || []))]
        .length,
    }),
    [teachers, total],
  );

  return (
    <Box>
      <Breadcrumbs
        items={[{ label: "Teachers", path: "/dashboard/teachers" }]}
      />

      <PageHeader
        title="Teacher Management"
        subtitle="Manage teaching staff and their assignments"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              "&:hover": {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              },
            }}
          >
            Add Teacher
          </Button>
        }
      />

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Teachers", value: stats.total, icon: <People /> },
          { label: "Active", value: stats.active, icon: <School /> },
          { label: "Subjects", value: stats.subjects, icon: <Subject /> },
        ].map((stat, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              minWidth: 150,
              p: 2,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ color: theme.palette.primary.main }}>{stat.icon}</Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearchChange}
        filters={[
          {
            name: "subject",
            label: "Subject",
            options: subjects.map((s) => ({ value: s, label: s })),
            value: filters.subject,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, subject: value })),
          },
          {
            name: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            value: filters.status,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, status: value })),
          },
        ]}
        showExport={false}
      />

      {/* Data Table */}
      {isLoadingTeachers ? (
        <TableLoading />
      ) : teachers.length === 0 ? (
        <TableEmptyState searchQuery={search} />
      ) : (
        <DataTable
          columns={columns}
          rows={teachers}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={total}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRowClick={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Teacher Form Dialog */}
      <Dialog
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setIsViewMode(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isViewMode
            ? "Teacher Details"
            : selectedTeacher
              ? "Edit Teacher"
              : "Add New Teacher"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formValues.firstName}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, firstName: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Last Name"
                value={formValues.lastName}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, lastName: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formValues.email}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, email: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                value={formValues.phone}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formValues.gender}
                  label="Gender"
                  disabled={isViewMode}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, gender: e.target.value }))
                  }
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Qualification"
                value={formValues.qualification}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    qualification: e.target.value,
                  }))
                }
                helperText="e.g., BSc, MSc, PhD"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Specialization"
                value={formValues.specialization}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    specialization: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Subjects</InputLabel>
                <Select
                  multiple
                  value={formValues.subjects}
                  label="Subjects"
                  disabled={isViewMode}
                  MenuProps={{ disablePortal: true }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormValues((prev) => ({
                      ...prev,
                      subjects: typeof value === "string" ? value.split(",") : (value as string[]),
                    }));
                  }}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {(selected as string[]).map((val) => (
                        <Chip key={val} label={val} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {subjects.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>


            {/* Classes Section */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1" fontWeight={500}>
                  Classes
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddCircle />}
                  onClick={addClass}
                  disabled={isViewMode}
                >
                  Add Class
                </Button>
              </Box>

              {formValues.classes.map((cls, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    mb: 2,
                    p: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    borderRadius: 1,
                  }}
                >
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Grade</InputLabel>
                    <Select
                      value={cls.grade}
                      label="Grade"
                      disabled={isViewMode}
                      onChange={(e) => updateClass(index, "grade", e.target.value)}
                    >
                      {GRADES.map((g) => (
                        <MenuItem key={g} value={g}>
                          Grade {g}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {cls.grade === "11" || cls.grade === "12" ? (
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Stream</InputLabel>
                      <Select
                        value={cls.stream || "Natural"}
                        label="Stream"
                        disabled={isViewMode}
                        onChange={(e) =>
                          updateClass(index, "stream", e.target.value)
                        }
                      >
                        <MenuItem value="Natural">Natural</MenuItem>
                        <MenuItem value="Social">Social</MenuItem>
                      </Select>
                    </FormControl>
                  ) : null}

                  <IconButton
                    onClick={() => removeClass(index)}
                    color="error"
                    size="small"
                    disabled={isViewMode}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              ))}

              {formValues.classes.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No classes assigned. Click "Add Class" to add classes.
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="City"
                value={formValues.address.city}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: e.target.value },
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Region"
                value={formValues.address.region}
                disabled={isViewMode}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    address: { ...prev.address, region: e.target.value },
                  }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setFormModalOpen(false);
              setIsViewMode(false);
            }}
          >
            {isViewMode ? "Close" : "Cancel"}
          </Button>
          {!isViewMode && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {selectedTeacher ? "Update" : "Create"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${selectedTeacher?.firstName} ${selectedTeacher?.lastName}?`}
        confirmText="Delete"
        severity="error"
      />
    </Box>
  );
}

export default TeacherListPage;
