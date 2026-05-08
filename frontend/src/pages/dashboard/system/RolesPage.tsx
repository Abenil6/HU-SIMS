import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Typography,
  alpha,
  useTheme,
  Avatar,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  AdminPanelSettings,
  School,
  Person,
  People,
  FamilyRestroom,
  Refresh,
  Save,
  Security,
  EventNote,
  Grading,
  Assessment,
  Schedule,
  Message,
  Settings,
  Description,
  CheckCircle,
  Cancel,
  Undo,
} from "@mui/icons-material";
import { useToast } from "@/components/ui/Toast";
import {
  rolePermissionService,
  type RolePermissionRecord,
} from "@/services/rolePermissionService";

/* ──────────────────────────────────────────────────────────────────────
   FEATURE PERMISSION MAPPING
   Maps human-readable feature names to backend resource + actions
   ────────────────────────────────────────────────────────────────────── */

interface FeaturePermission {
  id: string;
  label: string;
  description: string;
  resource: string;
  /** Actions that this feature grants when checked */
  actions: string[];
}

interface PermissionCategory {
  category: string;
  icon: React.ReactNode;
  permissions: FeaturePermission[];
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: "User Management",
    icon: <People fontSize="small" />,
    permissions: [
      {
        id: "view-users",
        label: "View Users",
        description: "View user accounts and profiles",
        resource: "users",
        actions: ["READ"],
      },
      {
        id: "manage-users",
        label: "Create & Edit Users",
        description: "Create new accounts and edit user details",
        resource: "users",
        actions: ["READ", "WRITE", "EDIT"],
      },
      {
        id: "delete-users",
        label: "Delete Users",
        description: "Permanently remove user accounts",
        resource: "users",
        actions: ["READ", "DELETE"],
      },
      {
        id: "admin-users",
        label: "Full User Admin",
        description: "Full administrative control over all users",
        resource: "users",
        actions: ["READ", "WRITE", "EDIT", "DELETE", "MANAGE", "ADMIN"],
      },
    ],
  },
  {
    category: "Student Management",
    icon: <School fontSize="small" />,
    permissions: [
      {
        id: "view-students",
        label: "View Students",
        description: "View student records and profiles",
        resource: "students",
        actions: ["READ"],
      },
      {
        id: "manage-students",
        label: "Create & Edit Students",
        description: "Enroll new students and update records",
        resource: "students",
        actions: ["READ", "WRITE", "EDIT"],
      },
      {
        id: "delete-students",
        label: "Delete Students",
        description: "Remove student records",
        resource: "students",
        actions: ["READ", "DELETE"],
      },
    ],
  },
  {
    category: "Teacher Management",
    icon: <Person fontSize="small" />,
    permissions: [
      {
        id: "view-teachers",
        label: "View Teachers",
        description: "View teacher profiles and assignments",
        resource: "teachers",
        actions: ["READ"],
      },
      {
        id: "manage-teachers",
        label: "Create & Edit Teachers",
        description: "Add new teachers and update profiles",
        resource: "teachers",
        actions: ["READ", "WRITE", "EDIT"],
      },
    ],
  },
  {
    category: "Parent Management",
    icon: <FamilyRestroom fontSize="small" />,
    permissions: [
      {
        id: "view-parents",
        label: "View Parents",
        description: "View parent profiles and linked children",
        resource: "parents",
        actions: ["READ"],
      },
      {
        id: "manage-parents",
        label: "Create & Edit Parents",
        description: "Add new parents and manage linking",
        resource: "parents",
        actions: ["READ", "WRITE", "EDIT"],
      },
      {
        id: "delete-parents",
        label: "Delete Parents",
        description: "Remove parent records",
        resource: "parents",
        actions: ["READ", "DELETE"],
      },
    ],
  },
  {
    category: "Attendance",
    icon: <EventNote fontSize="small" />,
    permissions: [
      {
        id: "view-attendance",
        label: "View Attendance",
        description: "View attendance records for classes",
        resource: "attendance",
        actions: ["READ"],
      },
      {
        id: "take-attendance",
        label: "Take Attendance",
        description: "Mark and edit daily attendance",
        resource: "attendance",
        actions: ["READ", "WRITE", "EDIT"],
      },
      {
        id: "delete-attendance",
        label: "Delete Attendance",
        description: "Remove attendance records",
        resource: "attendance",
        actions: ["READ", "DELETE"],
      },
    ],
  },
  {
    category: "Grades & Records",
    icon: <Grading fontSize="small" />,
    permissions: [
      {
        id: "view-grades",
        label: "View Grades",
        description: "View academic records and grades",
        resource: "academic-records",
        actions: ["READ"],
      },
      {
        id: "record-grades",
        label: "Record Grades",
        description: "Enter and edit student grades",
        resource: "academic-records",
        actions: ["READ", "WRITE", "EDIT"],
      },
      {
        id: "approve-grades",
        label: "Approve Grades",
        description: "Approve submitted grades for publishing",
        resource: "academic-records",
        actions: ["READ", "APPROVE"],
      },
      {
        id: "delete-grades",
        label: "Delete Grades",
        description: "Remove grade records",
        resource: "academic-records",
        actions: ["READ", "DELETE"],
      },
    ],
  },
  {
    category: "Timetable",
    icon: <Schedule fontSize="small" />,
    permissions: [
      {
        id: "view-timetable",
        label: "View Timetable",
        description: "View class and teacher schedules",
        resource: "timetables",
        actions: ["READ"],
      },
      {
        id: "manage-timetable",
        label: "Manage Timetable",
        description: "Create, edit, and publish timetables",
        resource: "timetables",
        actions: ["READ", "WRITE", "EDIT", "DELETE"],
      },
    ],
  },
  {
    category: "Reports",
    icon: <Assessment fontSize="small" />,
    permissions: [
      {
        id: "view-reports",
        label: "View Reports",
        description: "View generated reports and analytics",
        resource: "reports",
        actions: ["READ"],
      },
      {
        id: "manage-reports",
        label: "Generate Reports",
        description: "Create and export reports",
        resource: "reports",
        actions: ["READ", "WRITE", "EDIT"],
      },
      {
        id: "delete-reports",
        label: "Delete Reports",
        description: "Remove generated reports",
        resource: "reports",
        actions: ["READ", "DELETE"],
      },
    ],
  },
  {
    category: "Messaging",
    icon: <Message fontSize="small" />,
    permissions: [
      {
        id: "view-messages",
        label: "View Messages",
        description: "View received messages",
        resource: "messages",
        actions: ["READ"],
      },
      {
        id: "send-messages",
        label: "Send Messages",
        description: "Compose and send messages",
        resource: "messages",
        actions: ["READ", "WRITE"],
      },
    ],
  },
  {
    category: "Certificates",
    icon: <Description fontSize="small" />,
    permissions: [
      {
        id: "view-certificates",
        label: "View Certificates",
        description: "View issued certificates",
        resource: "certificates",
        actions: ["READ"],
      },
      {
        id: "issue-certificates",
        label: "Issue Certificates",
        description: "Generate and issue certificates",
        resource: "certificates",
        actions: ["READ", "WRITE"],
      },
      {
        id: "approve-certificates",
        label: "Approve Certificates",
        description: "Approve certificate requests",
        resource: "certificates",
        actions: ["READ", "APPROVE"],
      },
    ],
  },
  {
    category: "System Settings",
    icon: <Settings fontSize="small" />,
    permissions: [
      {
        id: "view-settings",
        label: "View Settings",
        description: "View system configuration",
        resource: "settings",
        actions: ["READ"],
      },
      {
        id: "edit-settings",
        label: "Edit Settings",
        description: "Modify system configuration",
        resource: "settings",
        actions: ["READ", "EDIT", "MANAGE", "ADMIN"],
      },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────
   ROLE ICONS & COLORS
   ────────────────────────────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  SystemAdmin: { icon: <AdminPanelSettings />, color: "#E53935" },
  SchoolAdmin: { icon: <Security />, color: "#FB8C00" },
  Teacher: { icon: <Person />, color: "#43A047" },
  Student: { icon: <School />, color: "#1E88E5" },
  Parent: { icon: <FamilyRestroom />, color: "#8E24AA" },
};

/* ──────────────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────────────── */

/** Check whether a feature permission is currently enabled for a role */
const isFeatureEnabled = (
  rolePermissions: Record<string, string[]>,
  feature: FeaturePermission,
): boolean => {
  const resourceActions = rolePermissions[feature.resource] || [];
  return feature.actions.every((action) => resourceActions.includes(action));
};

/** Toggle a feature on/off and return the updated permissions object */
const toggleFeature = (
  rolePermissions: Record<string, string[]>,
  feature: FeaturePermission,
  enable: boolean,
): Record<string, string[]> => {
  const currentActions = [...(rolePermissions[feature.resource] || [])];

  if (enable) {
    // Add all actions for this feature
    const nextActions = Array.from(new Set([...currentActions, ...feature.actions]));
    return {
      ...rolePermissions,
      [feature.resource]: nextActions,
    };
  } else {
    // When disabling, we must be careful not to remove actions required by OTHER ENABLED features
    // 1. Identify all features for this resource
    const resourceFeatures = PERMISSION_CATEGORIES.flatMap((cat) =>
      cat.permissions.filter((p) => p.resource === feature.resource && p.id !== feature.id),
    );

    // 2. See which of those are CURRENTLY ENABLED
    const otherEnabledFeatures = resourceFeatures.filter((p) =>
      isFeatureEnabled(rolePermissions, p),
    );

    // 3. Collect all actions that MUST stay because they are used by other enabled features
    const requiredActions = new Set(otherEnabledFeatures.flatMap((p) => p.actions));

    // 4. New actions = (current - feature.actions) + requiredActions
    const nextActions = currentActions.filter(
      (a) => !feature.actions.includes(a) || requiredActions.has(a),
    );

    return {
      ...rolePermissions,
      [feature.resource]: nextActions,
    };
  }
};

/** Count enabled features for a role */
const countEnabled = (
  rolePermissions: Record<string, string[]>,
): number => {
  let count = 0;
  for (const cat of PERMISSION_CATEGORIES) {
    for (const perm of cat.permissions) {
      if (isFeatureEnabled(rolePermissions, perm)) count++;
    }
  }
  return count;
};

const totalFeatures = PERMISSION_CATEGORIES.reduce(
  (sum, cat) => sum + cat.permissions.length,
  0,
);

/* ──────────────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────────────── */

export function RolesPage() {
  const theme = useTheme();
  const toast = useToast();

  const [roles, setRoles] = useState<RolePermissionRecord[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Draft permissions (editable) vs saved permissions (last persisted)
  const [draftPermissions, setDraftPermissions] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [savedPermissions, setSavedPermissions] = useState<
    Record<string, Record<string, string[]>>
  >({});

  /* ── Data loading ── */

  const loadRoles = async () => {
    try {
      setLoading(true);
      const payload = await rolePermissionService.getRolesPermissions();
      const nextRoles = payload.roles || [];

      const matrix: Record<string, Record<string, string[]>> = {};
      for (const role of nextRoles) {
        matrix[role.role] = role.permissions || {};
      }

      setRoles(nextRoles);
      setDraftPermissions(matrix);
      setSavedPermissions(matrix);
      setSelectedRole((cur) => cur || nextRoles[0]?.role || "");
    } catch {
      toast.error("Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  /* ── Derived state ── */

  const selectedRoleData = useMemo(
    () => roles.find((r) => r.role === selectedRole),
    [roles, selectedRole],
  );

  const currentPermissions = draftPermissions[selectedRole] || {};

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole) return false;
    return (
      JSON.stringify(draftPermissions[selectedRole] || {}) !==
      JSON.stringify(savedPermissions[selectedRole] || {})
    );
  }, [draftPermissions, savedPermissions, selectedRole]);

  /* ── Handlers ── */

  const handleToggle = (feature: FeaturePermission) => {
    if (!selectedRole) return;
    const enabled = isFeatureEnabled(currentPermissions, feature);
    const updated = toggleFeature(currentPermissions, feature, !enabled);
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRole]: updated,
    }));
  };

  const handleCancel = () => {
    if (!selectedRole) return;
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRole]: savedPermissions[selectedRole] || {},
    }));
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      const updated = await rolePermissionService.updateRolePermissions(
        selectedRole,
        draftPermissions[selectedRole] || {},
      );

      setSavedPermissions((prev) => ({
        ...prev,
        [selectedRole]: updated.permissions,
      }));
      setDraftPermissions((prev) => ({
        ...prev,
        [selectedRole]: updated.permissions,
      }));
      setRoles((prev) =>
        prev.map((r) =>
          r.role === selectedRole
            ? { ...r, permissions: updated.permissions }
            : r,
        ),
      );
      toast.success(
        `${selectedRoleData?.name || selectedRole} permissions saved successfully`,
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            Roles & Permissions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage what each role can do across the system. Select a role, then
            check or uncheck permissions.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadRoles}
          disabled={loading || saving}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* ── LEFT: Role Selector ── */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography
            variant="overline"
            sx={{ px: 1, mb: 1, display: "block", color: "text.secondary" }}
          >
            System Roles
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {roles.map((role) => {
              const config = ROLE_CONFIG[role.role] || {
                icon: <Person />,
                color: theme.palette.primary.main,
              };
              const isSelected = selectedRole === role.role;
              const enabled = countEnabled(
                draftPermissions[role.role] || {},
              );

              return (
                <Paper
                  key={role.role}
                  elevation={isSelected ? 4 : 0}
                  onClick={() => setSelectedRole(role.role)}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    cursor: "pointer",
                    border: `2px solid ${
                      isSelected
                        ? config.color
                        : alpha(theme.palette.divider, 0.4)
                    }`,
                    background: isSelected
                      ? alpha(config.color, 0.06)
                      : theme.palette.background.paper,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: config.color,
                      background: alpha(config.color, 0.04),
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: alpha(config.color, 0.12),
                        color: config.color,
                      }}
                    >
                      {config.icon}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {role.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3 }}
                      >
                        {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                        {" · "}
                        {enabled}/{totalFeatures} permissions
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Grid>

        {/* ── RIGHT: Permission Checkboxes ── */}
        <Grid size={{ xs: 12, md: 9 }}>
          {!selectedRoleData ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              <Security
                sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                Select a role to manage permissions
              </Typography>
            </Paper>
          ) : (
            <Paper
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                overflow: "hidden",
              }}
            >
              {/* Permission Header */}
              <Box
                sx={{
                  px: 3,
                  py: 2.5,
                  background: alpha(
                    ROLE_CONFIG[selectedRole]?.color ||
                      theme.palette.primary.main,
                    0.06,
                  ),
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedRoleData.name} Permissions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRoleData.description}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  {hasUnsavedChanges && (
                    <Button
                      variant="outlined"
                      startIcon={<Undo />}
                      onClick={handleCancel}
                      disabled={saving}
                      size="small"
                    >
                      Undo Changes
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    size="small"
                    sx={{
                      bgcolor:
                        ROLE_CONFIG[selectedRole]?.color ||
                        theme.palette.primary.main,
                      "&:hover": {
                        bgcolor: alpha(
                          ROLE_CONFIG[selectedRole]?.color ||
                            theme.palette.primary.main,
                          0.85,
                        ),
                      },
                    }}
                  >
                    {saving ? "Saving..." : "Save Permissions"}
                  </Button>
                </Box>
              </Box>

              {/* Permission Categories Grid */}
              <Box sx={{ p: 3 }}>
                {hasUnsavedChanges && (
                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{ mb: 3, borderRadius: 2 }}
                  >
                    You have unsaved changes. Click <strong>Save Permissions</strong> to apply.
                  </Alert>
                )}

                <Grid container spacing={2.5}>
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const allEnabled = cat.permissions.every((p) =>
                      isFeatureEnabled(currentPermissions, p),
                    );
                    const someEnabled =
                      !allEnabled &&
                      cat.permissions.some((p) =>
                        isFeatureEnabled(currentPermissions, p),
                      );

                    return (
                      <Grid
                        size={{ xs: 12, sm: 6, lg: 4 }}
                        key={cat.category}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            borderRadius: 2.5,
                            overflow: "hidden",
                            borderColor: allEnabled
                              ? alpha(theme.palette.success.main, 0.4)
                              : someEnabled
                                ? alpha(theme.palette.warning.main, 0.3)
                                : alpha(theme.palette.divider, 0.4),
                            transition: "border-color 0.2s ease",
                            height: "100%",
                          }}
                        >
                          {/* Category Header */}
                          <Box
                            sx={{
                              px: 2,
                              py: 1.5,
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              background: alpha(
                                allEnabled
                                  ? theme.palette.success.main
                                  : someEnabled
                                    ? theme.palette.warning.main
                                    : theme.palette.text.secondary,
                                0.06,
                              ),
                              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                            }}
                          >
                            <Box
                              sx={{
                                color: allEnabled
                                  ? theme.palette.success.main
                                  : someEnabled
                                    ? theme.palette.warning.main
                                    : theme.palette.text.secondary,
                                display: "flex",
                              }}
                            >
                              {cat.icon}
                            </Box>
                            <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{ flex: 1 }}
                            >
                              {cat.category}
                            </Typography>
                            {allEnabled && (
                              <CheckCircle
                                sx={{
                                  fontSize: 18,
                                  color: theme.palette.success.main,
                                }}
                              />
                            )}
                          </Box>

                          {/* Permission Checkboxes */}
                          <Box sx={{ px: 1, py: 1 }}>
                            {cat.permissions.map((perm) => {
                              const enabled = isFeatureEnabled(
                                currentPermissions,
                                perm,
                              );
                              return (
                                <Tooltip
                                  key={`${perm.resource}-${perm.actions.join(",")}`}
                                  title={perm.description}
                                  placement="right"
                                  arrow
                                >
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={enabled}
                                        onChange={() => handleToggle(perm)}
                                        disabled={saving}
                                        size="small"
                                        sx={{
                                          color: alpha(
                                            theme.palette.text.secondary,
                                            0.4,
                                          ),
                                          "&.Mui-checked": {
                                            color:
                                              ROLE_CONFIG[selectedRole]
                                                ?.color ||
                                              theme.palette.primary.main,
                                          },
                                        }}
                                      />
                                    }
                                    label={
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: enabled ? 600 : 400,
                                          color: enabled
                                            ? theme.palette.text.primary
                                            : theme.palette.text.secondary,
                                        }}
                                      >
                                        {perm.label}
                                      </Typography>
                                    }
                                    sx={{
                                      mx: 0,
                                      width: "100%",
                                      borderRadius: 1.5,
                                      px: 1,
                                      py: 0.25,
                                      "&:hover": {
                                        bgcolor: alpha(
                                          theme.palette.primary.main,
                                          0.04,
                                        ),
                                      },
                                    }}
                                  />
                                </Tooltip>
                              );
                            })}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default RolesPage;
