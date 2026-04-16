import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  alpha,
  useTheme,
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Divider,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import {
  People,
  PersonAdd,
  Edit,
  Delete,
  Security,
  Settings,
  Storage,
  Backup,
  Search,
  Refresh,
  CheckCircle,
  Lock,
  MoreVert,
} from "@mui/icons-material";
import { userService, type User } from "@/services/userService";
import { apiDownload, apiGet, apiPost } from "@/services/api";
import { useToast } from "@/components/ui/Toast";
import { FormModal } from "@/components/ui/FormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * System Admin Dashboard
 *
 * Comprehensive system administration:
 * - User Management (create/edit/delete users)
 * - Role & Permissions Management
 * - System Settings Configuration
 * - Security & Backup Controls
 * - Performance Monitoring & Logs
 */

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// System Settings Type
interface SystemSettings {
  siteName: string;
  siteDescription: string;
  timezone: string;
  dateFormat: string;
  requireEmailVerification: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  enableNotifications: boolean;
  enableEmailAlerts: boolean;
}

// Security Settings Type
interface SecuritySettings {
  twoFactorAuth: boolean;
  passwordExpiry: number;
  minPasswordLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  ipWhitelist: string[];
  loginNotifications: boolean;
}

// Backup Settings Type
interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: string;
  retainBackups: number;
  lastBackup: string;
  nextBackup: string;
}

export function SystemAdminDashboard() {
  const theme = useTheme();
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    grade: "",
    stream: "",
    status: "active" as "active" | "inactive",
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    siteName: "Haramaya University Non-Boarding Secondary School",
    siteDescription: "Student Information Management System",
    timezone: "Africa/Addis_Ababa",
    dateFormat: "YYYY-MM-DD",
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    enableNotifications: true,
    enableEmailAlerts: true,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    passwordExpiry: 90,
    minPasswordLength: 8,
    requireSpecialChar: true,
    requireNumber: true,
    ipWhitelist: [],
    loginNotifications: true,
  });

  // Backup Settings State
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackup: false,
    backupFrequency: "daily",
    retainBackups: 7,
    lastBackup: "Never",
    nextBackup: "Not scheduled",
  });
  const [latestBackupFilename, setLatestBackupFilename] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // System Health State
  const [systemHealth, setSystemHealth] = useState({
    apiServer: { status: "Online", percent: 100 },
    database: { status: "Healthy", percent: 98 },
    storage: { status: "45% Used", percent: 45 },
    memory: { status: "62% Used", percent: 62 },
    cpu: { status: "35% Used", percent: 35 },
    backup: { status: "Completed", percent: 100 },
  });

  // System Logs State
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  // Load users and system data on mount and when filters change
  useEffect(() => {
    loadUsers();
    loadSystemData();
    loadBackupData();
  }, [page, rowsPerPage, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    loadSettings();
  }, []);

  const fmtDate = (value?: string | null) => {
    if (!value) return "Never";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const loadActiveUsersFallback = async () => {
    try {
      const res: any = await apiGet("/admin/users", {
        status: "Active",
        page: 1,
        limit: 1,
      });
      const activeTotal = Number(res?.pagination?.total ?? 0);
      setActiveUsersCount(activeTotal);
    } catch {
      // Keep current value if fallback also fails
    }
  };

  const loadSystemData = async () => {
    try {
      const data: any = await apiGet("/system/stats");
      // Backend returns {success, data: {...}} structure
      const payload = data?.data ?? data;
      const apiActive = Number(payload?.systemStats?.activeUsers);
      if (Number.isFinite(apiActive) && apiActive >= 0) {
        setActiveUsersCount(apiActive);
      } else {
        await loadActiveUsersFallback();
      }
      if (payload?.systemStats?.totalUsers !== undefined) {
        setTotalUsers(Number(payload.systemStats.totalUsers) || 0);
      }
      if (payload?.systemHealth) {
        setSystemHealth(payload.systemHealth);
      }
    } catch (error) {
      console.error("Failed to load system data:", error);
      await loadActiveUsersFallback();
      toast.error("Failed to load system stats endpoint. Showing fallback user counts.");
    }
  };

  const loadSettings = async () => {
    try {
      const res: any = await apiGet("/system/settings");
      const payload = res?.data ?? res;
      if (payload?.systemSettings) {
        setSystemSettings(payload.systemSettings);
      }
      if (payload?.securitySettings) {
        setSecuritySettings(payload.securitySettings);
      }
    } catch (error) {
      console.error("Failed to load system settings:", error);
      toast.error("Failed to load system settings");
    }
  };

  const saveSettings = async () => {
    setSettingsBusy(true);
    try {
      const res: any = await apiPost("/system/settings", {
        systemSettings,
        securitySettings,
      });
      const payload = res?.data ?? res;
      if (payload?.systemSettings) {
        setSystemSettings(payload.systemSettings);
      }
      if (payload?.securitySettings) {
        setSecuritySettings(payload.securitySettings);
      }
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save settings");
    } finally {
      setSettingsBusy(false);
    }
  };

  const loadBackupData = async () => {
    try {
      const res: any = await apiGet("/system/backups");
      const payload = res?.data ?? res;
      if (!payload) return;

      setBackupSettings((prev) => ({
        ...prev,
        autoBackup: Boolean(payload.autoBackup),
        backupFrequency: payload.backupFrequency || prev.backupFrequency,
        retainBackups: Number(payload.retainBackups || prev.retainBackups),
        lastBackup: fmtDate(payload.lastBackup),
        nextBackup: fmtDate(payload.nextBackup),
      }));
      setLatestBackupFilename(payload.latestBackupFile?.filename || "");
    } catch (error) {
      console.error("Failed to load backup info:", error);
    }
  };

  const handleSaveBackupConfig = async () => {
    try {
      await apiPost("/system/backups/config", {
        autoBackup: backupSettings.autoBackup,
        backupFrequency: backupSettings.backupFrequency,
        retainBackups: backupSettings.retainBackups,
      });
      toast.success("Backup settings saved");
      await loadBackupData();
    } catch (error) {
      console.error("Failed to save backup config:", error);
      toast.error("Failed to save backup settings");
    }
  };

  const handleRunBackupNow = async () => {
    setBackupDialogOpen(true);
    setBackupBusy(true);
    try {
      const res: any = await apiPost("/system/backups/run", {});
      toast.success(res?.message || "Backup created successfully");
      await loadBackupData();
      await loadSystemData();
    } catch (error) {
      console.error("Backup failed:", error);
      const message = error instanceof Error ? error.message : "Backup failed";
      toast.error(message);
    } finally {
      setBackupDialogOpen(false);
      setBackupBusy(false);
    }
  };

  const handleDownloadLatestBackup = async () => {
    if (!latestBackupFilename) {
      toast.error("No backup file available");
      return;
    }
    try {
      await apiDownload(
        `/system/backups/download/${encodeURIComponent(latestBackupFilename)}`,
        latestBackupFilename
      );
      toast.success("Backup downloaded");
    } catch (error) {
      console.error("Backup download failed:", error);
      const message = error instanceof Error ? error.message : "Failed to download backup";
      toast.error(message);
    }
  };

  const handleRestoreLatestBackup = () => {
    if (!latestBackupFilename) {
      toast.error("No backup file available");
      return;
    }
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    setRestoreDialogOpen(false);
    setBackupBusy(true);
    const loadingId = toast.loading("Restoring backup...");
    try {
      const res: any = await apiPost("/system/backups/restore", {
        filename: latestBackupFilename,
        confirm: "RESTORE",
      });
      toast.dismiss(loadingId);
      toast.success(res?.message || "Backup restored successfully");
      await loadBackupData();
      await loadSystemData();
      await loadUsers();
    } catch (error) {
      toast.dismiss(loadingId);
      console.error("Backup restore failed:", error);
      const message = error instanceof Error ? error.message : "Failed to restore backup";
      toast.error(message);
    } finally {
      setBackupBusy(false);
    }
  };

  const loadSystemLogs = async () => {
    setLogsLoading(true);
    try {
      const data: any = await apiGet("/system/audit-logs", { limit: 10 });
      const payload = data?.data ?? data;
      setSystemLogs(payload || []);
    } catch (error) {
      console.error("Failed to load system logs:", error);
      toast.error("Failed to load system logs. Please check your connection.");
      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load system logs when System Health tab is active
  useEffect(() => {
    if (activeTab === 4) {
      loadSystemLogs();
    }
    if (activeTab === 3) {
      loadBackupData();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      await userService.createUser(formData);
      toast.success("User created successfully");
      setCreateDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      toast.error(errorMessage);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.updateUser(selectedUser.id, formData);
      toast.success("User updated successfully");
      setEditDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleStatusToggle = async (user: User) => {
    try {
      const newStatus = user.status === "active" ? "Inactive" : "Active";
      await userService.updateUserStatus(user.id, newStatus as any);
      toast.success(`User ${newStatus.toLowerCase()}d successfully`);
      loadUsers();
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      grade: "",
      stream: "",
      status: "active",
    });
    setSelectedUser(null);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      grade: (user as any).grade || "",
      stream: (user as any).stream || "",
      status: user.status as "active" | "inactive",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Stats for dashboard overview
  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: <People />,
      color: "primary" as const,
    },
    {
      label: "Active Users",
      value: activeUsersCount,
      icon: <CheckCircle />,
      color: "success" as const,
    },
    {
      label: "System Health",
      value: "98%",
      icon: <Storage />,
      color: "info" as const,
    },
    {
      label: "Security Alerts",
      value: 0,
      icon: <Security />,
      color: "warning" as const,
    },
  ];

  const getColor = (color: string) => {
    const colors: Record<string, { main: string; bg: string }> = {
      primary: {
        main: theme.palette.primary.main,
        bg: alpha(theme.palette.primary.main, 0.1),
      },
      success: {
        main: theme.palette.success.main,
        bg: alpha(theme.palette.success.main, 0.1),
      },
      info: {
        main: theme.palette.info.main,
        bg: alpha(theme.palette.info.main, 0.1),
      },
      warning: {
        main: theme.palette.warning.main,
        bg: alpha(theme.palette.warning.main, 0.1),
      },
      error: {
        main: theme.palette.error.main,
        bg: alpha(theme.palette.error.main, 0.1),
      },
    };
    return colors[color] || colors.primary;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<
      string,
      "primary" | "secondary" | "success" | "warning" | "error" | "info"
    > = {
      SystemAdmin: "error",
      SchoolAdmin: "warning",
      Teacher: "success",
      Student: "info",
      Parent: "secondary",
    };
    return colors[role] || "primary";
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "success"
      : status === "inactive"
        ? "error"
        : "warning";
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        System Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        System-wide administration, user management, security, and monitoring
      </Typography>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => {
          const color = getColor(stat.color);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${color.bg} 0%, ${alpha(theme.palette.background.paper as string, 1)} 100%)`,
                  border: `1px solid ${alpha(color.main, 0.1)}`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: color.bg,
                      color: color.main,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Tabs for different sections */}
      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label="User Management" icon={<People />} iconPosition="start" />
          <Tab
            label="System Settings"
            icon={<Settings />}
            iconPosition="start"
          />
          <Tab label="Security" icon={<Security />} iconPosition="start" />
          <Tab
            label="Backup & Recovery"
            icon={<Backup />}
            iconPosition="start"
          />
          <Tab label="System Health" icon={<Storage />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* User Management Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                User Management
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create User
              </Button>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Search sx={{ mr: 1, color: "text.secondary" }} />
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="SystemAdmin">System Admin</MenuItem>
                    <MenuItem value="SchoolAdmin">School Admin</MenuItem>
                    <MenuItem value="Teacher">Teacher</MenuItem>
                    <MenuItem value="Student">Student</MenuItem>
                    <MenuItem value="Parent">Parent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadUsers}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>

            {/* Users Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Verified</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <LinearProgress />
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          py={4}
                        >
                          No users found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {user.firstName} {user.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.status}
                            color={getStatusColor(user.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {user.isVerified ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : (
                            <Chip
                              label="Pending"
                              color="warning"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleStatusToggle(user)}
                          >
                            <Lock fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(user)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalUsers}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </TabPanel>

          {/* System Settings Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              System Settings Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Site Name"
                  value={systemSettings.siteName}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      siteName: e.target.value,
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Timezone"
                  value={systemSettings.timezone}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      timezone: e.target.value,
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Site Description"
                  value={systemSettings.siteDescription}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      siteDescription: e.target.value,
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.requireEmailVerification}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          requireEmailVerification: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Require Email Verification"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.enableNotifications}
                      onChange={(e) =>
                        setSystemSettings({
                          ...systemSettings,
                          enableNotifications: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Login Attempts"
                  value={systemSettings.maxLoginAttempts}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      maxLoginAttempts: parseInt(e.target.value),
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Session Timeout (minutes)"
                  value={systemSettings.sessionTimeout}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      sessionTimeout: parseInt(e.target.value),
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  onClick={saveSettings}
                  disabled={settingsBusy}
                >
                  {settingsBusy ? "Saving..." : "Save System Settings"}
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Security Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Authentication
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            twoFactorAuth: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Enable Two-Factor Authentication"
                  />
                  <Divider sx={{ my: 2 }} />
                  <TextField
                    fullWidth
                    type="number"
                    label="Password Expiry (days)"
                    value={securitySettings.passwordExpiry}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        passwordExpiry: parseInt(e.target.value),
                      })
                    }
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Password Length"
                    value={securitySettings.minPasswordLength}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        minPasswordLength: parseInt(e.target.value),
                      })
                    }
                  />
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Password Requirements
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securitySettings.requireSpecialChar}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            requireSpecialChar: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Require Special Characters"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securitySettings.requireNumber}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            requireNumber: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Require Numbers"
                  />
                  <Divider sx={{ my: 2 }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securitySettings.loginNotifications}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            loginNotifications: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Login Notifications"
                  />
                </Paper>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  onClick={saveSettings}
                  disabled={settingsBusy}
                >
                  {settingsBusy ? "Saving..." : "Save Security Settings"}
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Backup Tab */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              Backup & Recovery
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Backup Configuration
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backupSettings.autoBackup}
                        onChange={(e) =>
                          setBackupSettings({
                            ...backupSettings,
                            autoBackup: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Enable Automatic Backup"
                  />
                  <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select
                      value={backupSettings.backupFrequency}
                      label="Backup Frequency"
                      onChange={(e) =>
                        setBackupSettings({
                          ...backupSettings,
                          backupFrequency: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    type="number"
                    label="Retain Backups (count)"
                    value={backupSettings.retainBackups}
                    onChange={(e) =>
                      setBackupSettings({
                        ...backupSettings,
                        retainBackups: Math.max(1, parseInt(e.target.value || "1", 10)),
                      })
                    }
                  />
                  <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={handleSaveBackupConfig}
                    disabled={backupBusy}
                  >
                    Save Backup Settings
                  </Button>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Backup Status
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Backup
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {backupSettings.lastBackup}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Next Scheduled Backup
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {backupSettings.nextBackup}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Button
                      variant="contained"
                      startIcon={<Backup />}
                      onClick={handleRunBackupNow}
                      disabled={backupBusy}
                    >
                      Backup Now
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Storage />}
                      onClick={handleDownloadLatestBackup}
                      disabled={backupBusy || !latestBackupFilename}
                    >
                      Download Latest
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleRestoreLatestBackup}
                      disabled={backupBusy || !latestBackupFilename}
                    >
                      Restore Latest
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* System Health Tab */}
          <TabPanel value={activeTab} index={4}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                System Health & Performance
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => toast.info("Refreshing...")}
              >
                Refresh
              </Button>
            </Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={3}>
                    System Status
                  </Typography>
                  {[
                    { label: "API Server", percent: systemHealth.apiServer.percent, status: systemHealth.apiServer.status },
                    { label: "Database", percent: systemHealth.database.percent, status: systemHealth.database.status },
                    { label: "Storage", percent: systemHealth.storage.percent, status: systemHealth.storage.status },
                    { label: "Memory", percent: systemHealth.memory.percent, status: systemHealth.memory.status },
                    { label: "CPU", percent: systemHealth.cpu.percent, status: systemHealth.cpu.status },
                    { label: "Backup Service", percent: systemHealth.backup.percent, status: systemHealth.backup.status },
                  ].map((item, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2">{item.label}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {item.status}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          background: alpha(theme.palette.grey[500], 0.2),
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${item.percent}%`,
                            background:
                              item.percent >= 90
                                ? theme.palette.success.main
                                : item.percent >= 70
                                  ? theme.palette.warning.main
                                  : theme.palette.error.main,
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Recent System Logs
                  </Typography>
                  {logsLoading ? (
                    <Box sx={{ py: 2 }}>
                      <LinearProgress />
                    </Box>
                  ) : systemLogs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" py={2}>
                      No recent logs available
                    </Typography>
                  ) : (
                    systemLogs.map((log, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 1,
                          borderRadius: 1,
                          "&:hover": {
                            background: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", minWidth: 70 }}
                        >
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                        <Chip
                          label={log.level || "INFO"}
                          size="small"
                          color={
                            log.level === "ERROR"
                              ? "error"
                              : log.level === "WARN"
                                ? "warning"
                                : "success"
                          }
                        />
                        <Typography variant="body2">
                          {log.description || log.message || "System event"}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </Paper>

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value, grade: "", stream: "" })
                  }
                >
                  <MenuItem value="SystemAdmin">System Admin</MenuItem>
                  <MenuItem value="SchoolAdmin">School Admin</MenuItem>
                  <MenuItem value="Teacher">Teacher</MenuItem>
                  <MenuItem value="Student">Student</MenuItem>
                  <MenuItem value="Parent">Parent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.role === "Student" && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Grade</InputLabel>
                    <Select
                      value={formData.grade}
                      label="Grade"
                      onChange={(e) =>
                        setFormData({ ...formData, grade: e.target.value, stream: "" })
                      }
                    >
                      <MenuItem value="9">Grade 9</MenuItem>
                      <MenuItem value="10">Grade 10</MenuItem>
                      <MenuItem value="11">Grade 11</MenuItem>
                      <MenuItem value="12">Grade 12</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {(formData.grade === "11" || formData.grade === "12") && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Stream</InputLabel>
                      <Select
                        value={formData.stream}
                        label="Stream"
                        onChange={(e) =>
                          setFormData({ ...formData, stream: e.target.value })
                        }
                      >
                        <MenuItem value="Natural Science">Natural Science</MenuItem>
                        <MenuItem value="Social Science">Social Science</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={loading}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <MenuItem value="SystemAdmin">System Admin</MenuItem>
                  <MenuItem value="SchoolAdmin">School Admin</MenuItem>
                  <MenuItem value="Teacher">Teacher</MenuItem>
                  <MenuItem value="Student">Student</MenuItem>
                  <MenuItem value="Parent">Parent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateUser}
            disabled={loading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.firstName} ${selectedUser?.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
      />

      {/* Restore Backup Dialog */}
      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={handleRestoreConfirm}
        title="Restore Backup"
        message={`Restore from ${latestBackupFilename}? This will overwrite current database data. This action cannot be undone.`}
        confirmText="Restore"
        severity="warning"
      />
          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h6" fontWeight={600}>
            Creating Backup...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait while we backup your data
          </Typography>
        </DialogContent>
      </Dialog>

    </Box>
  );
}

export default SystemAdminDashboard;
