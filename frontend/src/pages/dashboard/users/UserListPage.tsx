import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Chip,
  alpha,
  useTheme,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  IconButton,
} from "@mui/material";
import {
  Add,
  People,
  Security,
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Block,
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
import type { User } from "@/services/userService";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useUpdateUserStatus,
} from "@/hooks/users/useUsers";

const ROLES = [
  { value: "SystemAdmin", label: "System Admin" },
  { value: "SchoolAdmin", label: "School Admin" },
  { value: "Teacher", label: "Teacher" },
  { value: "Student", label: "Student" },
  { value: "Parent", label: "Parent" },
];

export function UserListPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  // State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    role: "",
    status: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Use TanStack Query hooks
  const { data: usersData, isLoading: isLoadingUsers } = useUsers({
    page: page + 1,
    limit: rowsPerPage,
    search: search || undefined,
    role: filters.role || undefined,
    status: filters.status || undefined,
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const updateUserStatus = useUpdateUserStatus();

  const users = usersData?.users || [];
  const total = usersData?.total || 0;
  const statsFromApi = usersData?.stats;

  // Table columns
  const columns: Column<User>[] = useMemo(
    () => [
      {
        id: "firstName",
        label: "User",
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
                {row.email}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: "role",
        label: "Role",
        format: (value) => (
          <Chip
            label={value}
            size="small"
            sx={{
              backgroundColor: alpha(
                value === "SystemAdmin"
                  ? theme.palette.error.main
                  : value === "SchoolAdmin"
                    ? theme.palette.info.main
                    : value === "Teacher"
                      ? theme.palette.warning.main
                      : theme.palette.success.main,
                0.1,
              ),
              color:
                value === "SystemAdmin"
                  ? theme.palette.error.main
                  : value === "SchoolAdmin"
                    ? theme.palette.info.main
                    : value === "Teacher"
                      ? theme.palette.warning.main
                      : theme.palette.success.main,
              fontWeight: 500,
            }}
          />
        ),
      },
      {
        id: "status",
        label: "Status",
        format: (value) => (
          <Chip
            label={value}
            size="small"
            icon={value === "active" ? <CheckCircle /> : <Block />}
            sx={{
              backgroundColor: alpha(
                value === "active"
                  ? theme.palette.success.main
                  : theme.palette.grey[500],
                0.1,
              ),
              color:
                value === "active"
                  ? theme.palette.success.main
                  : theme.palette.grey[600],
              fontWeight: 500,
              textTransform: "capitalize",
            }}
          />
        ),
      },
      {
        id: "isVerified",
        label: "Verified",
        format: (value) => (
          <Chip
            label={value ? "Yes" : "No"}
            size="small"
            variant={value ? "filled" : "outlined"}
            color={value ? "success" : "default"}
          />
        ),
      },
      {
        id: "createdAt",
        label: "Created",
        format: (value) => new Date(value).toLocaleDateString(),
      },
    ],
    [theme],
  );

  // Form fields
  const formFields: FormField[] = [
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "lastName", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "text" },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
      ],
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: ROLES,
    },
  ];

  const initialValues = selectedUser
    ? {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        phone: selectedUser.phone || "",
        gender: selectedUser.gender || "",
        role: selectedUser.role,
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        role: "Teacher",
      };

  // Handlers
  const handleAdd = () => {
    setSelectedUser(null);
    setFormModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsViewMode(false);
    setFormModalOpen(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setIsViewMode(true);
    setFormModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUserStatus.mutateAsync({
        id: user.id,
        status: user.status === "active" ? "inactive" : "active",
      });
    } catch {
      // Error already handled by hook
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      if (selectedUser) {
        await updateUser.mutateAsync({
          id: selectedUser.id,
          data: values as any,
        });
      } else {
        await createUser.mutateAsync(values as any);
      }
      setFormModalOpen(false);
    } catch {
      // Error already handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
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
      total: statsFromApi?.total ?? total,
      active: statsFromApi?.active ?? users.filter((u) => u.status === "active").length,
      verified: statsFromApi?.verified ?? users.filter((u) => u.isVerified).length,
    }),
    [statsFromApi, total, users],
  );

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Users", path: "/dashboard/users" }]} />

      <PageHeader
        title="User Management"
        subtitle="Manage all system users and their roles"
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
            Add User
          </Button>
        }
      />

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Users", value: stats.total, icon: <People /> },
          { label: "Active", value: stats.active, icon: <CheckCircle /> },
          { label: "Verified", value: stats.verified, icon: <Security /> },
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
            name: "role",
            label: "Role",
            options: ROLES,
            value: filters.role,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, role: value })),
          },
          {
            name: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "pending", label: "Pending" },
            ],
            value: filters.status,
            onChange: (value) =>
              setFilters((prev) => ({ ...prev, status: value })),
          },
        ]}
        showExport={false}
      />

      {/* Data Table */}
      {isLoadingUsers ? (
        <TableLoading />
      ) : users.length === 0 ? (
        <TableEmptyState searchQuery={search} />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={total}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          menuItems={(row) => [
            <MenuItem key="view" onClick={() => handleView(row)}>
              <ListItemIcon>
                <Visibility fontSize="small" />
              </ListItemIcon>
              View Details
            </MenuItem>,
            <MenuItem
              key="toggle-status"
              onClick={() => handleToggleStatus(row)}
            >
              <ListItemIcon>
                {row.status === "active" ? (
                  <Block fontSize="small" />
                ) : (
                  <CheckCircle fontSize="small" color="success" />
                )}
              </ListItemIcon>
              {row.status === "active" ? "Deactivate" : "Activate"}
            </MenuItem>,
          ]}
        />
      )}

      {/* Form Modal */}
      <FormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={
          isViewMode
            ? "User Details"
            : selectedUser
              ? "Edit User"
              : "Add New User"
        }
        fields={formFields}
        initialValues={initialValues}
        onSubmit={handleFormSubmit}
        submitText={selectedUser ? "Update" : "Create"}
        loading={isSubmitting}
        maxWidth="md"
        readOnly={isViewMode}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.firstName} ${selectedUser?.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
      />
    </Box>
  );
}

export default UserListPage;
