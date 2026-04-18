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
} from "@mui/material";
import {
  Assignment,
  Refresh,
  Save,
  Security,
} from "@mui/icons-material";
import { useToast } from "@/components/ui/Toast";
import {
  rolePermissionService,
  type RolePermissionRecord,
} from "@/services/rolePermissionService";

type PermissionMatrix = Record<string, Record<string, string[]>>;

const CRITICAL_ACTIONS = new Set(["DELETE", "MANAGE", "ADMIN"]);

const ENFORCED_RESOURCES = new Set([
  "academic-records",
  "attendance",
  "timetables",
  "certificates",
  "reports",
  "messages",
  "exam-schedules",
  "absence-alerts",
]);

const getResourceEnforcementStatus = (resource: string): "enforced" | "role-based" => {
  return ENFORCED_RESOURCES.has(resource) ? "enforced" : "role-based";
};

const toMatrix = (roles: RolePermissionRecord[]): PermissionMatrix =>
  roles.reduce<PermissionMatrix>((acc, role) => {
    acc[role.role] = role.permissions || {};
    return acc;
  }, {});

export function RolesPage() {
  const theme = useTheme();
  const toast = useToast();
  const [roles, setRoles] = useState<RolePermissionRecord[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResources, setAvailableResources] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftPermissions, setDraftPermissions] = useState<PermissionMatrix>({});
  const [savedPermissions, setSavedPermissions] = useState<PermissionMatrix>({});

  const loadRoles = async () => {
    try {
      setLoading(true);
      const payload = await rolePermissionService.getRolesPermissions();
      const nextRoles = payload.roles || [];
      const matrix = toMatrix(nextRoles);

      setRoles(nextRoles);
      setAvailableActions(payload.availableActions || []);
      setAvailableResources(payload.availableResources || []);
      setDraftPermissions(matrix);
      setSavedPermissions(matrix);
      setSelectedRole((current) => current || nextRoles[0]?.role || "");
    } catch (error) {
      toast.error("Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const selectedRoleData = useMemo(
    () => roles.find((role) => role.role === selectedRole),
    [roles, selectedRole],
  );

  const selectedPermissions = draftPermissions[selectedRole] || {};

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole) return false;
    return JSON.stringify(draftPermissions[selectedRole] || {}) !== JSON.stringify(savedPermissions[selectedRole] || {});
  }, [draftPermissions, savedPermissions, selectedRole]);

  const togglePermission = (resource: string, action: string) => {
    if (!selectedRole) return;

    setDraftPermissions((current) => {
      const rolePermissions = current[selectedRole] || {};
      const resourceActions = rolePermissions[resource] || [];
      const nextActions = resourceActions.includes(action)
        ? resourceActions.filter((item) => item !== action)
        : [...resourceActions, action];

      return {
        ...current,
        [selectedRole]: {
          ...rolePermissions,
          [resource]: nextActions,
        },
      };
    });
  };

  const handleCancel = () => {
    if (!selectedRole) return;

    setDraftPermissions((current) => ({
      ...current,
      [selectedRole]: savedPermissions[selectedRole] || {},
    }));
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);
      const updated = await rolePermissionService.updateRolePermissions(
        selectedRole,
        draftPermissions[selectedRole] || {},
      );

      setSavedPermissions((current) => ({
        ...current,
        [selectedRole]: updated.permissions,
      }));
      setDraftPermissions((current) => ({
        ...current,
        [selectedRole]: updated.permissions,
      }));
      setRoles((current) =>
        current.map((role) =>
          role.role === selectedRole ? { ...role, permissions: updated.permissions } : role,
        ),
      );
      setEditMode(false);
      toast.success(`${selectedRoleData?.name || selectedRole} permissions saved`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save role permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Roles & Permissions
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Manage real backend permissions for each system role.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Roles
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadRoles}
                disabled={loading || saving}
              >
                Refresh
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {roles.map((role) => (
                  <Grid size={{ xs: 12 }} key={role.role}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: "pointer",
                        border: `2px solid ${
                          selectedRole === role.role
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.15)
                        }`,
                        background:
                          selectedRole === role.role
                            ? alpha(theme.palette.primary.main, 0.04)
                            : theme.palette.background.paper,
                      }}
                      onClick={() => setSelectedRole(role.role)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                        <Assignment
                          sx={{
                            color:
                              selectedRole === role.role
                                ? theme.palette.primary.main
                                : theme.palette.text.secondary,
                          }}
                        />
                        <Typography variant="subtitle1" fontWeight={600}>
                          {role.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {role.description}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {role.userCount} users
                        </Typography>
                        <Chip
                          size="small"
                          icon={<Security />}
                          label={`${Object.keys(role.permissions || {}).length} resources`}
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                mb: 3,
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Permission Matrix
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedRoleData
                    ? `${selectedRoleData.name} backend access rules`
                    : "Select a role to inspect permissions"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <Button
                  variant={editMode ? "outlined" : "contained"}
                  onClick={() => setEditMode((current) => !current)}
                  disabled={!selectedRole || saving || loading}
                >
                  {editMode ? "Stop Editing" : "Edit Permissions"}
                </Button>
                {editMode && (
                  <>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      disabled={saving || !hasUnsavedChanges}
                    >
                      Save Changes
                    </Button>
                  </>
                )}
              </Box>
            </Box>

            {!selectedRoleData ? (
              <Box sx={{ textAlign: "center", py: 10 }}>
                <Typography variant="body2" color="text.secondary">
                  Select a role to view or edit its permissions.
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
                  {availableActions.map((action) => (
                    <Chip
                      key={action}
                      label={action}
                      size="small"
                      sx={{
                        background: alpha(
                          CRITICAL_ACTIONS.has(action)
                            ? theme.palette.error.main
                            : theme.palette.success.main,
                          0.1,
                        ),
                        color: CRITICAL_ACTIONS.has(action)
                          ? theme.palette.error.main
                          : theme.palette.success.main,
                        border: `1px solid ${alpha(
                          CRITICAL_ACTIONS.has(action)
                            ? theme.palette.error.main
                            : theme.palette.success.main,
                          0.3,
                        )}`,
                      }}
                    />
                  ))}
                </Box>

                <Grid container spacing={2}>
                  {availableResources.map((resource) => {
                    const resourceActions = selectedPermissions[resource] || [];
                    const enforcementStatus = getResourceEnforcementStatus(resource);
                    return (
                      <Grid size={{ xs: 12, md: 6 }} key={resource}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            borderColor: alpha(theme.palette.primary.main, 0.18),
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {resource}
                            </Typography>
                            <Chip
                              size="small"
                              label={enforcementStatus === "enforced" ? "Granular" : "Role-based"}
                              color={enforcementStatus === "enforced" ? "success" : "default"}
                              variant="outlined"
                            />
                          </Box>
                          <Divider sx={{ mb: 1.5 }} />
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            {availableActions.map((action) => (
                              <FormControlLabel
                                key={`${resource}-${action}`}
                                control={
                                  <Checkbox
                                    checked={resourceActions.includes(action)}
                                    onChange={() => togglePermission(resource, action)}
                                    disabled={!editMode || saving}
                                  />
                                }
                                label={`${action}${CRITICAL_ACTIONS.has(action) ? " (sensitive)" : ""}`}
                              />
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default RolesPage;
