import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Paper,
  alpha,
  useTheme,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
} from "@mui/material";
import {
  Add,
  Campaign,
  Schedule,
  Group,
  Edit,
  Delete,
  Publish,
  Unpublished,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormModal } from "@/components/ui/FormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { FormField } from "@/components/ui/FormModal";
import {
  useAnnouncements,
  useActiveAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from "@/hooks/announcements/useAnnouncements";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  audience: string;
  targetRoles: string[];
  createdAt: string;
  published: boolean;
}

const ROLE_OPTIONS = [
  { value: "SystemAdmin", label: "System Admin" },
  { value: "SchoolAdmin", label: "School Admin" },
  { value: "Teacher", label: "Teachers" },
  { value: "Student", label: "Students" },
  { value: "Parent", label: "Parents" },
];

export function AnnouncementsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const isViewOnly = !isSchoolAdmin;
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<AnnouncementItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] =
    useState<AnnouncementItem | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "", priority: "" });

  const adminAnnouncementsQuery = useAnnouncements({
    limit: 100,
    enabled: isSchoolAdmin,
  });
  const visibleAnnouncementsQuery = useActiveAnnouncements(!isSchoolAdmin);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const publishMutation = usePublishAnnouncement();

  const query = isSchoolAdmin ? adminAnnouncementsQuery : visibleAnnouncementsQuery;
  const { data, isLoading } = query;

  const rawAnnouncements = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const announcements: AnnouncementItem[] = rawAnnouncements.map((announcement: any) => ({
    id: announcement.id || announcement._id,
    title: announcement.title,
    content: announcement.content,
    category: announcement.type || announcement.category || "General",
    priority: String(announcement.priority || "Normal").toLowerCase(),
    audience: Array.isArray(announcement.targetRoles)
      ? announcement.targetRoles.join(", ")
      : "All",
    targetRoles: Array.isArray(announcement.targetRoles)
      ? announcement.targetRoles
      : [],
    createdAt: announcement.createdAt
      ? new Date(announcement.createdAt).toISOString().split("T")[0]
      : "",
    published: Boolean(announcement.published ?? announcement.isActive ?? true),
  }));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return announcements.filter((announcement) => {
      const category = announcement.category;
      const priority = announcement.priority;

      if (filters.category && category !== filters.category) return false;
      if (filters.priority && priority !== filters.priority.toLowerCase()) return false;

      if (!term) return true;

      return (
        announcement.title.toLowerCase().includes(term) ||
        announcement.content.toLowerCase().includes(term) ||
        announcement.audience.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term)
      );
    });
  }, [announcements, filters, search]);

  const stats = useMemo(
    () => ({
      total: announcements.length,
      active: announcements.filter((announcement) => announcement.published).length,
      urgent: announcements.filter((announcement) => announcement.priority === "urgent")
        .length,
    }),
    [announcements],
  );

  const formFields: FormField[] = [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "content",
      label: "Content",
      type: "textarea",
      required: true,
      rows: 5,
    },
    {
      name: "type",
      label: "Category",
      type: "select",
      required: true,
      options: [
        { value: "General", label: "General" },
        { value: "Academic", label: "Academic" },
        { value: "Event", label: "Event" },
        { value: "Holiday", label: "Holiday" },
        { value: "Emergency", label: "Emergency" },
        { value: "Fee", label: "Fee" },
      ],
    },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      required: true,
      options: [
        { value: "Low", label: "Low" },
        { value: "Normal", label: "Normal" },
        { value: "High", label: "High" },
        { value: "Urgent", label: "Urgent" },
      ],
    },
    {
      name: "targetRoles",
      label: "Audience",
      type: "multiselect",
      required: true,
      options: ROLE_OPTIONS,
      helperText: "Choose one or more roles who should see this announcement.",
    },
  ];

  const handleEdit = (announcement: AnnouncementItem) => {
    setEditingAnnouncement(announcement);
    setFormModalOpen(true);
  };

  const handleDelete = (announcement: AnnouncementItem) => {
    setAnnouncementToDelete(announcement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return;
    await deleteMutation.mutateAsync(announcementToDelete.id);
    setDeleteDialogOpen(false);
    setAnnouncementToDelete(null);
  };

  const handlePublishToggle = async (announcement: AnnouncementItem) => {
    await publishMutation.mutateAsync(announcement.id);
  };

  return (
    <Box>
      <Breadcrumbs items={[{ label: t('common.announcements') }]} />
      <PageHeader
        title={t('common.announcements')}
        subtitle={
          isViewOnly
            ? t('common.viewAnnouncements')
            : t('common.manageAnnouncements')
        }
        action={
          !isViewOnly ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditingAnnouncement(null);
                setFormModalOpen(true);
              }}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              }}
              aria-label="Create new announcement"
            >
              {t('common.createAnnouncement')}
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title={t('common.total')}
          value={stats.total}
          icon={<Campaign />}
          color="primary"
        />
        <StatsCard
          title={t('common.published')}
          value={stats.active}
          icon={<Schedule />}
          color="success"
        />
        <StatsCard
          title={t('common.urgent')}
          value={stats.urgent}
          icon={<Campaign />}
          color="error"
        />
      </Box>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('common.searchAnnouncements')}
        filters={[
          {
            name: "category",
            label: t('common.category'),
            options: [
              { value: "General", label: t('common.general') },
              { value: "Academic", label: t('common.academic') },
              { value: "Event", label: t('common.event') },
              { value: "Holiday", label: t('common.holiday') },
              { value: "Emergency", label: t('common.emergency') },
              { value: "Fee", label: t('common.fee') },
            ],
            value: filters.category,
            onChange: (value) => setFilters((previous) => ({ ...previous, category: value })),
          },
          {
            name: "priority",
            label: t('common.priority'),
            options: [
              { value: "low", label: t('common.low') },
              { value: "normal", label: t('common.normal') },
              { value: "high", label: t('common.high') },
              { value: "urgent", label: t('common.urgent') },
            ],
            value: filters.priority,
            onChange: (value) => setFilters((previous) => ({ ...previous, priority: value })),
          },
        ]}
        showAdd={false}
      />

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {filtered.map((announcement) => (
            <Paper
              key={announcement.id}
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                width: {
                  xs: "100%",
                  md: "calc(50% - 8px)",
                  lg: "calc(33.333% - 16px)",
                },
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                  {announcement.title}
                </Typography>
                <Chip
                  label={announcement.priority}
                  size="small"
                  color={announcement.priority === "urgent" ? "error" : "default"}
                  sx={{ textTransform: "capitalize" }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {announcement.content}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap" }}>
                <Chip label={announcement.category} size="small" variant="outlined" />
                <Chip label={announcement.audience} size="small" icon={<Group />} />
                <Chip
                  label={announcement.published ? t('common.published') : t('common.draft')}
                  size="small"
                  color={announcement.published ? "success" : "default"}
                />
              </Stack>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('common.posted')}: {announcement.createdAt}
                </Typography>

                {!isViewOnly && (
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <IconButton onClick={() => handleEdit(announcement)} size="small" aria-label="Edit announcement">
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => void handlePublishToggle(announcement)}
                      size="small"
                      aria-label={announcement.published ? "Unpublish announcement" : "Publish announcement"}
                    >
                      {announcement.published ? (
                        <Unpublished fontSize="small" />
                      ) : (
                        <Publish fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={() => void handleDelete(announcement)}
                      size="small"
                      aria-label="Delete announcement"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Paper>
          ))}

          {filtered.length === 0 && (
            <Paper sx={{ p: 4, borderRadius: 3, width: "100%", textAlign: "center" }}>
              <Typography color="text.secondary">
                {t('common.noAnnouncementsFound')}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      <FormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingAnnouncement(null);
        }}
        title={editingAnnouncement ? t('common.editAnnouncement') : t('common.createAnnouncement')}
        fields={formFields}
        initialValues={{
          title: editingAnnouncement?.title || "",
          content: editingAnnouncement?.content || "",
          type: editingAnnouncement?.category || "General",
          priority: editingAnnouncement
            ? editingAnnouncement.priority.charAt(0).toUpperCase() +
              editingAnnouncement.priority.slice(1)
            : "Normal",
          targetRoles: editingAnnouncement?.targetRoles || [
            "SchoolAdmin",
            "Teacher",
            "Student",
            "Parent",
          ],
        }}
        onSubmit={async (values) => {
          const payload = {
            title: values.title as string,
            content: values.content as string,
            type: values.type as string,
            priority: values.priority as string,
            targetRoles: (values.targetRoles as string[]) || [],
          };

          if (!payload.targetRoles.length) {
            toast.error("Select at least one audience role.");
            return;
          }

          if (editingAnnouncement) {
            await updateMutation.mutateAsync({
              id: editingAnnouncement.id,
              data: payload,
            });
          } else {
            await createMutation.mutateAsync(payload);
          }

          setFormModalOpen(false);
          setEditingAnnouncement(null);
        }}
        submitText={editingAnnouncement ? "Update" : "Create"}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('common.deleteAnnouncement')}
        message={t('common.deleteAnnouncementConfirm', { title: announcementToDelete?.title })}
        confirmText={t('common.delete')}
        severity="error"
      />
    </Box>
  );
}
