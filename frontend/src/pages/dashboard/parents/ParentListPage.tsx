import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
  useTheme,
  Chip as MUIChip,
} from "@mui/material";
import {
  Add,
  People,
  FamilyRestroom,
  Link as LinkIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormModal } from "@/components/ui/FormModal";
import type { FormField } from "@/components/ui/FormModal";
import { TableEmptyState } from "@/components/ui/EmptyState";
import { TableLoading } from "@/components/ui/LoadingSpinner";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Parent } from "@/services/parentService";
import {
  useParents as useParentList,
  useCreateParent,
  useUpdateParent,
  useDeleteParent,
} from "@/hooks/parents/useParents";

export function ParentListPage() {
  const theme = useTheme();

  // State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use TanStack Query hooks
  const { data: parentsData, isLoading: isLoadingParents } = useParentList({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    status: filters.status || undefined,
  });

  const createParent = useCreateParent();
  const updateParent = useUpdateParent();
  const deleteParent = useDeleteParent();

  const parents = parentsData?.data ?? [];
  const total = parentsData?.pagination?.total ?? 0;

  const columns: Column<Parent>[] = useMemo(
    () => [
      {
        id: "firstName",
        label: "Parent",
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
                {row.relationship || (row as any).parentProfile?.relationship || "-"}
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
        id: "phone",
        label: "Phone",
        format: (value) => (
          <Typography variant="body2">{value || "-"}</Typography>
        ),
      },
      {
        id: "students",
        label: "Children",
        format: (_, row) => {
          const children =
            row.students ||
            (row as any).parentProfile?.linkedChildren?.map((c: any) => ({
              id: c._id || c.id,
              studentId: c.studentProfile?.studentId,
              name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
            })) ||
            [];
          return (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {children.map((s: any, i: number) => (
              <MUIChip
                key={i}
                label={s.name}
                size="small"
                sx={{ fontSize: "0.7rem" }}
              />
            ))}
          </Box>
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
                String(value).toLowerCase() === "active"
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                0.1,
              ),
              color:
                String(value).toLowerCase() === "active"
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

  const formFields: FormField[] = [
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "lastName", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "text", required: true },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
      ],
    },
    { name: "occupation", label: "Occupation", type: "text" },
    {
      name: "relationship",
      label: "Relationship",
      type: "select",
      required: true,
      options: [
        { value: "Father", label: "Father" },
        { value: "Mother", label: "Mother" },
        { value: "Guardian", label: "Guardian" },
      ],
    },
  ];

  const initialValues = selectedParent
    ? {
        firstName: selectedParent.firstName,
        lastName: selectedParent.lastName,
        email: selectedParent.email,
        phone: selectedParent.phone,
        gender: selectedParent.gender || (selectedParent as any).parentProfile?.gender || "",
        occupation: selectedParent.occupation || (selectedParent as any).parentProfile?.occupation || "",
        relationship: selectedParent.relationship || (selectedParent as any).parentProfile?.relationship || "Father",
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        occupation: "",
        relationship: "Father",
      };

  const handleAdd = () => {
    setIsViewMode(false);
    setSelectedParent(null);
    setFormModalOpen(true);
  };

  const handleEdit = (parent: Parent) => {
    setIsViewMode(false);
    const freshParent = parents.find(
      (p: any) => (p._id || p.id) === ((parent as any)._id || parent.id),
    );
    setSelectedParent((freshParent as Parent) || parent);
    setFormModalOpen(true);
  };

  const handleView = (parent: Parent) => {
    setIsViewMode(true);
    const freshParent = parents.find(
      (p: any) => (p._id || p.id) === ((parent as any)._id || parent.id),
    );
    setSelectedParent((freshParent as Parent) || parent);
    setFormModalOpen(true);
  };

  const handleDelete = (parent: Parent) => {
    setSelectedParent(parent);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    if (isViewMode) return;
    setIsSubmitting(true);
    try {
      if (selectedParent) {
        await updateParent.mutateAsync({
          id: (selectedParent as any)._id || selectedParent.id,
          data: values as any,
        });
      } else {
        await createParent.mutateAsync(values as any);
      }
      setFormModalOpen(false);
    } catch {
      // Error already handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedParent) return;
    try {
      await deleteParent.mutateAsync((selectedParent as any)._id || selectedParent.id);
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

  const stats = useMemo(
    () => ({
      total,
      active: parents.filter((p: Parent) => String(p.status).toLowerCase() === "active").length,
      linked: parents.filter((p: Parent) => {
        const children =
          p.students || (p as any).parentProfile?.linkedChildren || [];
        return Array.isArray(children) && children.length > 0;
      }).length,
    }),
    [parents, total],
  );

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Parents", path: "/dashboard/parents" }]} />

      <PageHeader
        title="Parent Management"
        subtitle="Manage parent/guardian accounts and link to students"
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
            Add Parent
          </Button>
        }
      />

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Parents", value: stats.total, icon: <People /> },
          { label: "Active", value: stats.active, icon: <FamilyRestroom /> },
          { label: "Linked Children", value: stats.linked, icon: <LinkIcon /> },
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
      {isLoadingParents ? (
        <TableLoading />
      ) : parents.length === 0 ? (
        <TableEmptyState searchQuery={search} />
      ) : (
        <DataTable
          columns={columns}
          rows={parents}
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

      {/* Form Modal */}
      <FormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setIsViewMode(false);
        }}
        title={
          isViewMode ? "Parent Details" : selectedParent ? "Edit Parent" : "Add New Parent"
        }
        fields={formFields}
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        submitText={selectedParent ? "Update" : "Create"}
        loading={isSubmitting}
        maxWidth="md"
        readOnly={isViewMode}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Parent"
        message={`Are you sure you want to delete ${selectedParent?.firstName} ${selectedParent?.lastName}?`}
        confirmText="Delete"
        severity="error"
      />
    </Box>
  );
}
