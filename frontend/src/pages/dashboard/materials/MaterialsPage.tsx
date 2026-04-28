import "@/i18n/config";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  TextField,
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
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === "Teacher";
  const isStudent = user?.role === "Student";
  const canManageMaterials = isTeacher;

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
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [submissionMaterial, setSubmissionMaterial] = useState<Material | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

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
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ["materials", "my-submissions"],
    queryFn: () => materialService.getMySubmissions(),
    enabled: isStudent,
    staleTime: 30 * 1000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => materialService.createMaterial(data),
    onMutate: () => {
      setUploadProgress(10);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(t("pages.materials.materialCreated"));
      setFormModalOpen(false);
      setUploadError(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || t("pages.materials.failedToCreate");
      setUploadError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => {
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
      toast.success(t("pages.materials.materialUpdated"));
      setFormModalOpen(false);
      setUploadError(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || t("pages.materials.failedToUpdate");
      setUploadError(errorMessage);
      toast.error(errorMessage);
    },
    onSettled: () => {
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
      toast.success(t("pages.materials.materialDeleted"));
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error(t("pages.materials.failedToDelete")),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => materialService.publishMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(t("pages.materials.materialPublished"));
    },
    onError: () => toast.error(t("pages.materials.failedToPublish")),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => materialService.archiveMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(t("pages.materials.materialArchived"));
    },
    onError: () => toast.error(t("pages.materials.failedToArchive")),
  });

  const submissionMutation = useMutation({
    mutationFn: (data: { materialId: string; submissionText?: string; file?: File }) =>
      materialService.submitAssignment(data.materialId, {
        submissionText: data.submissionText,
        file: data.file,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", "my-submissions"] });
      toast.success(t("pages.materials.assignmentSubmitted"));
      setSubmissionDialogOpen(false);
      setSubmissionMaterial(null);
      setSubmissionText("");
      setSubmissionFile(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || t("pages.materials.failedToSubmit");
      toast.error(errorMessage);
    },
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
    { name: "title", label: t("pages.materials.materialTitle"), type: "text", required: true },
    {
      name: "description",
      label: t("pages.materials.materialDescription"),
      type: "textarea",
      multiline: true,
      rows: 3,
    },
    {
      name: "type",
      label: t("pages.materials.type"),
      type: "select",
      required: true,
      options: [
        { value: "study_material", label: t("pages.materials.studyMaterial") },
        { value: "assignment", label: t("pages.materials.assignment") },
        { value: "resource", label: t("pages.materials.resource") },
      ],
    },
    {
      name: "subject",
      label: t("pages.materials.subject"),
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
        ? t("pages.materials.assignedSubjects")
        : undefined,
    },
    {
      name: "grade",
      label: isTeacher ? t("pages.materials.class") : t("pages.materials.grade"),
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
        ? t("pages.materials.assignedClasses")
        : undefined,
    },
    {
      name: "dueDate",
      label: t("pages.materials.dueDate"),
      type: "date",
    },
    {
      name: "file",
      label: t("pages.materials.uploadFile"),
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

  const handleOpenSubmissionDialog = (material: Material) => {
    setSubmissionMaterial(material);
    const existingSubmission = mySubmissions.find((item) => item.materialId === material.id);
    setSubmissionText(existingSubmission?.submissionText || "");
    setSubmissionFile(null);
    setSubmissionDialogOpen(true);
  };

  const handleSubmitAssignment = () => {
    if (!submissionMaterial) return;
    submissionMutation.mutate({
      materialId: submissionMaterial.id,
      submissionText,
      file: submissionFile || undefined,
    });
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
      submittedAssignments: mySubmissions.filter((item) => item.status).length,
    }),
    [materials, mySubmissions],
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
        items={[{ label: t("pages.materials.pageTitle"), path: "/dashboard/materials" }]}
      />

      <PageHeader
        title={t("pages.materials.pageTitle")}
        subtitle={
          canManageMaterials
            ? t("pages.materials.subtitleTeacher")
            : t("pages.materials.subtitleStudent")
        }
        action={canManageMaterials ? (
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
            {t("pages.materials.uploadMaterial")}
          </Button>
        ) : undefined}
      />

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          {
            label: t("pages.materials.totalMaterials"),
            value: stats.total,
            icon: <Description />,
          },
          { label: t("pages.materials.published"), value: stats.published, icon: <Publish /> },
          {
            label: t("pages.materials.assignments"),
            value: stats.assignments,
            icon: <Assignment />,
          },
          isStudent
            ? {
                label: t("pages.materials.submitted"),
                value: stats.submittedAssignments,
                icon: <Assignment />,
              }
            : {
                label: t("pages.materials.resources"),
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
      {canManageMaterials ? (
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label={t("pages.materials.published")} />
          <Tab label={t("pages.materials.drafts")} />
          <Tab label={t("pages.materials.archived")} />
        </Tabs>
      ) : (
        <Tabs value={0} sx={{ mb: 2 }}>
          <Tab label={t("pages.materials.published")} />
        </Tabs>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            name: "subject",
            label: t("pages.materials.subject"),
            options: subjects.map((s) => ({ value: s, label: s })),
            value: filters.subject,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, subject: value })),
          },
          {
            name: "grade",
            label: t("pages.materials.grade"),
            options: isTeacher
              ? teacherClasses.map((g) => ({ value: g.value, label: g.label }))
              : adminGrades.map((g) => ({ value: g, label: `Grade ${g}` })),
            value: filters.grade,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, grade: value })),
          },
          {
            name: "type",
            label: t("pages.materials.type"),
            options: [
              { value: "study_material", label: t("pages.materials.studyMaterial") },
              { value: "assignment", label: t("pages.materials.assignment") },
              { value: "resource", label: t("pages.materials.resource") },
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
          {t("pages.materials.failedToLoad")}
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
                    {t("pages.materials.due")}: {new Date(material.dueDate).toLocaleDateString()}
                  </Typography>
                )}
                {isStudent && material.type === "assignment" && (
                  <Box sx={{ mt: 1 }}>
                    {(() => {
                      const submission = mySubmissions.find(
                        (item) => item.materialId === material.id,
                      );
                      if (!submission) return null;
                      return (
                        <Chip
                          size="small"
                          color={
                            submission.status === "Reviewed"
                              ? "success"
                              : submission.status === "Returned"
                                ? "warning"
                                : "info"
                          }
                          label={
                            submission.score !== null && submission.score !== undefined
                              ? `${submission.status} (${submission.score}%)`
                              : submission.status
                          }
                        />
                      );
                    })()}
                  </Box>
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
                  {isStudent && material.type === "assignment" && (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                      onClick={() => handleOpenSubmissionDialog(material)}
                    >
                      {mySubmissions.some((item) => item.materialId === material.id)
                        ? t("pages.materials.resubmit")
                        : t("pages.materials.submit")}
                    </Button>
                  )}
                </Box>
                {canManageMaterials ? (
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
                ) : null}
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Actions Menu */}
      {canManageMaterials && materials.map((material) => (
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
            {t("common.edit")}
          </MenuItem>
          {material.status === "draft" && (
            <MenuItem onClick={() => handlePublish(material)}>
              <ListItemIcon>
                <Publish fontSize="small" />
              </ListItemIcon>
              {t("pages.materials.publish")}
            </MenuItem>
          )}
          {material.status === "published" && (
            <MenuItem onClick={() => handleArchive(material)}>
              <ListItemIcon>
                <Archive fontSize="small" />
              </ListItemIcon>
              {t("pages.materials.archive")}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => handleDelete(material)}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            {t("common.delete")}
          </MenuItem>
        </Menu>
      ))}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Box sx={{ position: "fixed", top: 20, right: 20, zIndex: 9999, width: 300 }}>
          <Alert severity="info">
            <Typography variant="body2">{t("pages.materials.uploading")}</Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />
          </Alert>
        </Box>
      )}

      {/* Form Modal */}
      <FormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={selectedMaterial ? t("pages.materials.editMaterial") : t("pages.materials.uploadNewMaterial")}
        fields={formFields}
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        submitText={selectedMaterial ? t("pages.materials.update") : t("pages.materials.create")}
        loading={createMutation.isPending || updateMutation.isPending}
        maxWidth="md"
      >
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }} action={
            <Button color="inherit" size="small" onClick={() => {
              setUploadError(null);
              // Retry logic can be added here
            }}>
              {t("pages.materials.retry")}
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
        title={t("pages.materials.deleteMaterial")}
        message={t("pages.materials.deleteConfirm", { title: selectedMaterial?.title })}
        confirmText={t("common.delete")}
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
                  {t("pages.materials.dueDate")}: {" "}
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
                  {t("pages.materials.downloadAttachment")}
                </Button>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewDialogOpen(false)}>{t("common.close")}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={submissionDialogOpen}
        onClose={() => setSubmissionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {submissionMaterial ? `Submit: ${submissionMaterial.title}` : "Submit Assignment"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={4}
            margin="normal"
            label="Submission Notes"
            value={submissionText}
            onChange={(event) => setSubmissionText(event.target.value)}
            placeholder="Write your answer or notes here..."
          />
          <Button
            component="label"
            variant="outlined"
            sx={{ mt: 1 }}
          >
            {submissionFile ? `Attachment: ${submissionFile.name}` : "Attach File (Optional)"}
            <input
              type="file"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setSubmissionFile(file);
              }}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitAssignment}
            disabled={submissionMutation.isPending}
          >
            {submissionMutation.isPending ? "Submitting..." : "Submit Assignment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MaterialsPage;
