import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  Add,
  Download,
  Edit,
  Delete,
  Publish,
  Archive,
  Visibility,
  MoreVert,
  Description,
  Assignment,
  LibraryBooks,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { FilterBar } from "@/components/ui/FilterBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormModal } from "@/components/ui/FormModal";
import type { FormField } from "@/components/ui/FormModal";
import { TableEmptyState } from "@/components/ui/EmptyState";
import { TableLoading } from "@/components/ui/LoadingSpinner";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { materialService, type Material } from "@/services/materialService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

const normalizeGradeValue = (value: unknown) =>
  String(value || "")
    .replace(/^Grade\s+/i, "")
    .trim();

const buildClassOptionValue = (grade: string, section?: string) =>
  section ? `${grade}::${section}` : grade;

const parseClassOptionValue = (value: unknown) => {
  const [grade = "", section = ""] = String(value || "").split("::");
  return {
    grade: normalizeGradeValue(grade),
    section: section.trim(),
  };
};

const getClassLabel = (grade: string, section?: string) =>
  section ? `Grade ${grade} - ${section}` : `Grade ${grade}`;

export function MaterialsPage() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === "Teacher";

  // State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    type: "",
    status: "",
  });
  const [page, setPage] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  );
  const [menuAnchor, setMenuAnchor] = useState<
    Record<string, HTMLElement | null>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Determine status from tab
  const tabStatus = tabValue === 0 ? "published" : tabValue === 1 ? "draft" : "archived";
  const teacherSubjects = useMemo(() => {
    const subjects = Array.isArray((user as any)?.teacherProfile?.subjects)
      ? (user as any).teacherProfile.subjects
      : [];
    const singular = (user as any)?.teacherProfile?.subject ? [(user as any).teacherProfile.subject] : [];
    return [...new Set([...subjects, ...singular].map((subject) => String(subject || "").trim()).filter(Boolean))];
  }, [user]);
  const teacherClasses = useMemo(() => {
    const classes = Array.isArray((user as any)?.teacherProfile?.classes)
      ? (user as any).teacherProfile.classes
      : [];

    const unique = new Map<string, { value: string; label: string; grade: string; section: string }>();
    classes.forEach((entry: any) => {
      const grade = normalizeGradeValue(entry?.grade);
      const section = String(entry?.stream || entry?.section || "").trim();
      if (!grade) return;
      const value = buildClassOptionValue(grade, section);
      unique.set(value, {
        value,
        label: getClassLabel(grade, section),
        grade,
        section,
      });
    });
    return Array.from(unique.values());
  }, [user]);

  // Fetch materials with useQuery
  const { data: materialsResponse, isLoading: loading, isError, error } = useQuery({
    queryKey: ["materials", { page, search, ...filters, status: tabStatus }],
    queryFn: () =>
      materialService.getMaterials({
        page: page + 1,
        limit: 10,
        search: search || undefined,
        subject: filters.subject || undefined,
        grade: filters.grade || undefined,
        type: filters.type || undefined,
        status: tabStatus,
      }),
    staleTime: 1 * 60 * 1000,
  });

  const materials: Material[] = materialsResponse?.materials ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => materialService.createMaterial(data),
    onMutate: () => {
      setUploadProgress(10);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material created successfully");
      setFormModalOpen(false);
      setUploadError(null);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create material";
      setUploadError(errorMessage);
      toast.error(errorMessage);
      setUploadProgress(0);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      materialService.updateMaterial(id, data),
    onMutate: () => {
      setUploadProgress(10);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material updated successfully");
      setFormModalOpen(false);
      setUploadError(null);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update material";
      setUploadError(errorMessage);
      toast.error(errorMessage);
      setUploadProgress(0);
    },
  });

  // Simulate upload progress
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (createMutation.isPending || updateMutation.isPending) {
      interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);
    } else {
      setUploadProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [createMutation.isPending, updateMutation.isPending]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => materialService.deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error("Failed to delete material"),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => materialService.publishMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material published successfully");
    },
    onError: () => toast.error("Failed to publish material"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => materialService.archiveMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material archived successfully");
    },
    onError: () => toast.error("Failed to archive material"),
  });

  // Get material type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <Assignment />;
      case "resource":
        return <LibraryBooks />;
      default:
        return <Description />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "warning";
      case "archived":
        return "default";
      default:
        return "default";
    }
  };

  // Form fields
  const formFields: FormField[] = [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      multiline: true,
      rows: 3,
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "study_material", label: "Study Material" },
        { value: "assignment", label: "Assignment" },
        { value: "resource", label: "Resource" },
      ],
    },
    {
      name: "subject",
      label: "Subject",
      type: "select",
      required: true,
      options: (isTeacher ? teacherSubjects : [
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "English",
        "History",
        "Geography",
        "Civics",
      ]).map((subject) => ({ value: subject, label: subject })),
      helperText: isTeacher
        ? "Only your assigned subjects are available."
        : undefined,
    },
    {
      name: "grade",
      label: isTeacher ? "Class" : "Grade",
      type: "select",
      required: true,
      options: isTeacher
        ? teacherClasses.map((classOption) => ({
            value: classOption.value,
            label: classOption.label,
          }))
        : [
            { value: "9", label: "Grade 9" },
            { value: "10", label: "Grade 10" },
            { value: "11", label: "Grade 11" },
            { value: "12", label: "Grade 12" },
          ],
      helperText: isTeacher
        ? "Only your assigned classes are available. Section selection has been removed."
        : undefined,
    },
    {
      name: "dueDate",
      label: "Due Date (for assignments)",
      type: "date",
    },
    {
      name: "file",
      label: "Upload File",
      type: "file",
      accept: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png",
    },
  ];

  const initialValues = selectedMaterial
    ? {
        title: selectedMaterial.title,
        description: selectedMaterial.description,
        type: selectedMaterial.type,
        subject: selectedMaterial.subject,
        grade: isTeacher
          ? buildClassOptionValue(selectedMaterial.grade, selectedMaterial.section)
          : selectedMaterial.grade,
        dueDate: selectedMaterial.dueDate
          ? selectedMaterial.dueDate.split("T")[0]
          : "",
      }
    : {
        title: "",
        description: "",
        type: "",
        subject: "",
        grade: "",
        dueDate: "",
      };

  // Handlers
  const handleAdd = () => {
    setSelectedMaterial(null);
    setFormModalOpen(true);
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setFormModalOpen(true);
  };

  const handleDelete = (material: Material) => {
    setSelectedMaterial(material);
    setDeleteDialogOpen(true);
  };

  const handlePreview = (material: Material) => {
    setSelectedMaterial(material);
    setPreviewDialogOpen(true);
  };

  const handlePublish = async (material: Material) => {
    publishMutation.mutate(material.id);
    setMenuAnchor((prev) => ({ ...prev, [material.id]: null }));
  };

  const handleArchive = async (material: Material) => {
    archiveMutation.mutate(material.id);
    setMenuAnchor((prev) => ({ ...prev, [material.id]: null }));
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    const classSelection = parseClassOptionValue(values.grade);
    const payload = {
      ...values,
      grade: classSelection.grade,
      section: classSelection.section,
    };

    if (selectedMaterial) {
      updateMutation.mutate({ id: selectedMaterial.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMaterial) return;
    deleteMutation.mutate(selectedMaterial.id);
  };

  // Stats
  const stats = useMemo(
    () => ({
      total: materials.length,
      published: materials.filter((m) => m.status === "published").length,
      assignments: materials.filter((m) => m.type === "assignment").length,
      materials: materials.filter((m) => m.type === "study_material").length,
    }),
    [materials],
  );

  // Subject and grade options
  const subjects = isTeacher
    ? teacherSubjects
    : [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "History",
    "Geography",
    "Civics",
  ];
  const adminGrades = ["9", "10", "11", "12"];

  return (
    <Box>
      <Breadcrumbs
        items={[{ label: "Materials", path: "/dashboard/materials" }]}
      />

      <PageHeader
        title="Study Materials & Assignments"
        subtitle={
          isTeacher
            ? "Upload materials only for your assigned subjects and classes"
            : "Manage study materials, assignments, and resources"
        }
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
            aria-label="Upload new material"
          >
            Upload Material
          </Button>
        }
      />

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          {
            label: "Total Materials",
            value: stats.total,
            icon: <Description />,
          },
          { label: "Published", value: stats.published, icon: <Publish /> },
          {
            label: "Assignments",
            value: stats.assignments,
            icon: <Assignment />,
          },
          {
            label: "Resources",
            value: stats.materials,
            icon: <LibraryBooks />,
          },
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

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="Published" />
        <Tab label="Drafts" />
        <Tab label="Archived" />
      </Tabs>

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
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
            name: "grade",
            label: "Grade",
            options: isTeacher
              ? teacherClasses.map((g) => ({ value: g.value, label: g.label }))
              : adminGrades.map((g) => ({ value: g, label: `Grade ${g}` })),
            value: filters.grade,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, grade: value })),
          },
          {
            name: "type",
            label: "Type",
            options: [
              { value: "study_material", label: "Study Material" },
              { value: "assignment", label: "Assignment" },
              { value: "resource", label: "Resource" },
            ],
            value: filters.type,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, type: value })),
          },
        ]}
        showExport={false}
      />

      {/* Materials Grid */}
      {isError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load materials. Please try again later.
        </Alert>
      ) : loading ? (
        <TableLoading />
      ) : materials.length === 0 ? (
        <TableEmptyState searchQuery={search} />
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {materials.map((material) => (
            <Card
              key={material.id}
              sx={{
                width: 300,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                "&:hover": {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    {getTypeIcon(material.type)}
                  </Box>
                  <Chip
                    label={material.status}
                    size="small"
                    color={getStatusColor(material.status) as any}
                    sx={{ textTransform: "capitalize" }}
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {material.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {material.description}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}
                >
                  <Chip
                    label={getClassLabel(material.grade, material.section)}
                    size="small"
                    sx={{ fontSize: "0.7rem" }}
                  />
                  <Chip
                    label={material.subject}
                    size="small"
                    sx={{ fontSize: "0.7rem" }}
                  />
                </Box>
                {material.dueDate && (
                  <Typography variant="caption" color="warning.main">
                    Due: {new Date(material.dueDate).toLocaleDateString()}
                  </Typography>
                )}
              </CardContent>
              <CardActions
                sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
              >
                <Box>
                  <IconButton
                    size="small"
                    aria-label="Preview material"
                    onClick={() => handlePreview(material)}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                  {material.fileUrl && (
                    <IconButton
                      size="small"
                      aria-label="Download material"
                      onClick={() =>
                        materialService.downloadMaterial(material.id)
                      }
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) =>
                    setMenuAnchor((prev) => ({
                      ...prev,
                      [material.id]: e.currentTarget,
                    }))
                  }
                >
                  <MoreVert />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Actions Menu */}
      {materials.map((material) => (
        <Menu
          key={material.id}
          anchorEl={menuAnchor[material.id]}
          open={Boolean(menuAnchor[material.id])}
          onClose={() =>
            setMenuAnchor((prev) => ({ ...prev, [material.id]: null }))
          }
        >
          <MenuItem onClick={() => handleEdit(material)}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            Edit
          </MenuItem>
          {material.status === "draft" && (
            <MenuItem onClick={() => handlePublish(material)}>
              <ListItemIcon>
                <Publish fontSize="small" />
              </ListItemIcon>
              Publish
            </MenuItem>
          )}
          {material.status === "published" && (
            <MenuItem onClick={() => handleArchive(material)}>
              <ListItemIcon>
                <Archive fontSize="small" />
              </ListItemIcon>
              Archive
            </MenuItem>
          )}
          <MenuItem
            onClick={() => handleDelete(material)}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            Delete
          </MenuItem>
        </Menu>
      ))}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Box sx={{ position: "fixed", top: 20, right: 20, zIndex: 9999, width: 300 }}>
          <Alert severity="info">
            <Typography variant="body2">Uploading material...</Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />
          </Alert>
        </Box>
      )}

      {/* Form Modal */}
      <FormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={selectedMaterial ? "Edit Material" : "Upload New Material"}
        fields={formFields}
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        submitText={selectedMaterial ? "Update" : "Create"}
        loading={createMutation.isPending || updateMutation.isPending}
        maxWidth="md"
      >
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }} action={
            <Button color="inherit" size="small" onClick={() => {
              setUploadError(null);
              // Retry logic can be added here
            }}>
              Retry
            </Button>
          }>
            <Typography variant="body2">{uploadError}</Typography>
          </Alert>
        )}
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Material"
        message={`Are you sure you want to delete "${selectedMaterial?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
      />

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMaterial && (
          <>
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  {getTypeIcon(selectedMaterial.type)}
                </Box>
                <Box>
                  <Typography variant="h6">{selectedMaterial.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMaterial.subject} - {getClassLabel(selectedMaterial.grade, selectedMaterial.section)}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedMaterial.description}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                <Chip
                  label={getClassLabel(selectedMaterial.grade, selectedMaterial.section)}
                  size="small"
                />
                <Chip
                  label={selectedMaterial.type.replace("_", " ")}
                  size="small"
                  sx={{ textTransform: "capitalize" }}
                />
                <Chip
                  label={selectedMaterial.status}
                  size="small"
                  color={getStatusColor(selectedMaterial.status) as any}
                  sx={{ textTransform: "capitalize" }}
                />
              </Box>
              {selectedMaterial.dueDate && (
                <Typography variant="body2" color="warning.main">
                  Due Date:{" "}
                  {new Date(selectedMaterial.dueDate).toLocaleDateString()}
                </Typography>
              )}
              {selectedMaterial.fileUrl && (
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() =>
                    materialService.downloadMaterial(selectedMaterial.id)
                  }
                  sx={{ mt: 2 }}
                >
                  Download Attachment
                </Button>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default MaterialsPage;
