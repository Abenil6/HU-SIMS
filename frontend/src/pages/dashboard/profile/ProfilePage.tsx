import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  Tab,
  Tabs,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
  CircularProgress,
} from "@mui/material";
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Person,
  ContactPhone,
  Lock,
  Palette,
  Draw,
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/Toast";
import authService from "@/services/authService";
import type { AppearanceSettings } from "@/types/user";
import { apiGet } from "@/services/api";
import {
  normalizeAppearanceSettings,
} from "@/lib/appearance";

const ROLE_COPY = {
  SystemAdmin: {
    title: "System Administrator",
    subtitle:
      "Manages system configuration, user access, and platform security.",
  },
  SchoolAdmin: {
    title: "School Administrator",
    subtitle:
      "Coordinates school operations, academic workflows, and staff support.",
  },
  Teacher: {
    title: "Teacher",
    subtitle:
      "Manages classes, attendance, grading, and communication with families.",
  },
  Student: {
    title: "Student",
    subtitle:
      "Tracks your learning progress, timetable, and school communication.",
  },
  Parent: {
    title: "Parent",
    subtitle:
      "Monitors your child’s progress and stays connected with the school.",
  },
} as const;

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const toast = useToast();
  const roleCopy = ROLE_COPY[user?.role || "Student"];
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [roleData, setRoleData] = useState<any>(null);
  const [isLoadingRoleData, setIsLoadingRoleData] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettings>(
      normalizeAppearanceSettings(user?.appearanceSettings),
    );

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "+251-XX-XXX-XXXX",
  });

  // Initialize profileImage from user profileImage if available
  React.useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user?.profileImage]);

  // Initialize signature from user signature if available
  React.useEffect(() => {
    if (user?.signature) {
      setSignature(user.signature);
    }
  }, [user?.signature]);

  React.useEffect(() => {
    setAppearanceSettings(normalizeAppearanceSettings(user?.appearanceSettings));
  }, [user?.appearanceSettings]);

  React.useEffect(() => {
    let cancelled = false;

    const loadRoleData = async () => {
      if (!user?.role) {
        setRoleData(null);
        setIsLoadingRoleData(false);
        return;
      }

      setIsLoadingRoleData(true);

      try {
        if (user.role === "Student") {
          const res: any = await apiGet("/students/profile");
          if (!cancelled) setRoleData(res?.data ?? res);
          return;
        }

        if (user.role === "Teacher") {
          const [profileRes, classesRes] = await Promise.all([
            apiGet<any>("/teachers/profile"),
            apiGet<any>("/teachers/classes"),
          ]);

          if (!cancelled) {
            setRoleData({
              profile: profileRes?.data ?? profileRes,
              classes: classesRes?.data?.assignedClasses || [],
            });
          }
          return;
        }

        if (user.role === "Parent") {
          const [profileRes, childrenRes] = await Promise.all([
            apiGet<any>("/parents/profile"),
            apiGet<any>("/parents/children"),
          ]);

          if (!cancelled) {
            setRoleData({
              profile: profileRes?.data ?? profileRes,
              children: childrenRes?.data?.children || [],
            });
          }
          return;
        }

        setRoleData(null);
      } catch {
        if (!cancelled) {
          setRoleData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRoleData(false);
        }
      }
    };

    loadRoleData();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ✅ Single unified change handler for profile fields
  const handleFieldChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setProfileData({ ...profileData, [field]: event.target.value });
      setSaved(false);
    };

  // ✅ Single unified change handler for password fields
  const handlePasswordFieldChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordData({ ...passwordData, [field]: event.target.value });
    };

  const applyAppearancePreview = (
    nextAppearanceSettings: AppearanceSettings,
  ) => {
    // Only update local state for preview - don't update store yet
    // Store will be updated in handleSave after backend confirms the change
    setAppearanceSettings(nextAppearanceSettings);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        try {
          const updated = await authService.updateProfile({
            profileImage: result,
          });
          setProfileImage(result);
          updateUser({
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phone: updated.phone,
            profileImage: updated.profileImage,
          });
          toast.success("Profile picture updated!");
        } catch (err: any) {
          toast.error(err?.message || "Failed to update profile picture");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        try {
          const updated = await authService.updateProfile({
            signature: result,
          });
          setSignature(result);
          updateUser({
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phone: updated.phone,
            signature: updated.signature,
          });
          toast.success("Signature uploaded!");
        } catch (err: any) {
          toast.error(err?.message || "Failed to upload signature");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    try {
      const updated =
        tabValue === 3
          ? await authService.updateAppearance(appearanceSettings)
          : await authService.updateProfile({
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              email: profileData.email,
              phone: profileData.phone,
            });
      updateUser({
        firstName: updated.firstName ?? user?.firstName,
        lastName: updated.lastName ?? user?.lastName,
        email: updated.email ?? user?.email,
        phone: updated.phone ?? user?.phone,
        appearanceSettings: normalizeAppearanceSettings({
          ...(updated.appearanceSettings || {}),
          ...appearanceSettings,
        }),
      });
      setSaved(true);
      setIsEditing(false);
      toast.success(
        tabValue === 3
          ? "Appearance updated successfully!"
          : "Profile updated successfully!",
      );
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(
        err?.message ||
          (tabValue === 3
            ? "Failed to update appearance"
            : "Failed to update profile"),
      );
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (!passwordData.currentPassword.trim()) {
      toast.error("Current password is required");
      return;
    }

    try {
      setPasswordBusy(true);
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSaved(true);
      toast.success("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to change password");
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setProfileData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "+251-XX-XXX-XXXX",
    });
    setAppearanceSettings(normalizeAppearanceSettings(user?.appearanceSettings));
  };

  const renderRoleSpecificSummary = () => {
    if (user?.role === "Student") {
      const studentProfile = roleData?.studentProfile || {};
      return (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Student ID"
              value={studentProfile.studentId || ""}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Grade"
              value={studentProfile.grade || ""}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Stream / Section"
              value={studentProfile.stream || studentProfile.section || ""}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Academic Year"
              value={studentProfile.academicYear || ""}
              disabled
            />
          </Grid>
        </Grid>
      );
    }

    if (user?.role === "Teacher") {
      const teacherProfile = roleData?.profile?.teacherProfile || {};
      const classes = roleData?.classes || [];
      return (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Department"
              value={teacherProfile.department || ""}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Subjects"
              value={
                (teacherProfile.subjects || []).join(", ") ||
                "No subjects assigned"
              }
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Assigned Classes"
              value={
                classes
                  .map((item: any) => `${item.grade} ${item.section}`)
                  .join(", ") || "No classes assigned"
              }
              disabled
            />
          </Grid>
        </Grid>
      );
    }

    if (user?.role === "Parent") {
      const parentProfile = roleData?.profile?.parentProfile || {};
      const children = roleData?.children || [];
      return (
        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Occupation"
              value={parentProfile.occupation || ""}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Preferred Contact"
              value={parentProfile.preferredContactMethod || ""}
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Linked Children"
              value={
                children
                  .map((child: any) => `${child.firstName} ${child.lastName}`)
                  .join(", ") || "No linked children"
              }
              disabled
            />
          </Grid>
        </Grid>
      );
    }

    return null;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        {t('common.myProfile')}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {t('common.managePersonalInfo')}
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('common.profileUpdated')}
        </Alert>
      )}

      {passwordSaved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('common.passwordChanged')}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab icon={<Person />} label={t('common.personalInfo')} iconPosition="start" />
          <Tab
            icon={<ContactPhone />}
            label={t('common.contactInfo')}
            iconPosition="start"
          />
          <Tab icon={<Lock />} label={t('common.changePassword')} iconPosition="start" />
          <Tab icon={<Palette />} label={t('common.appearance')} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Profile Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profileImage || undefined}
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: 40,
                  bgcolor: "primary.main",
                  mr: 3,
                }}
              >
                {!profileImage && (
                  <>
                    {profileData.firstName.charAt(0)}
                    {profileData.lastName.charAt(0)}
                  </>
                )}
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
              <IconButton
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: "primary.main",
                  width: 32,
                  height: 32,
                  "&:hover": { bgcolor: "primary.dark" },
                }}
                onClick={triggerFileInput}
                aria-label="Change profile picture"
              >
                <PhotoCamera fontSize="small" />
              </IconButton>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {profileData.firstName} {profileData.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {roleCopy.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {roleCopy.subtitle}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {isEditing ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancelEdit}
                  disabled={!isEditing}
                  aria-label="Cancel editing profile"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={!isEditing || saved}
                  aria-label="Save profile changes"
                >
                  {t('common.saveChanges')}
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
                aria-label="Edit profile"
              >
                {t('common.editProfile')}
              </Button>
            )}
          </Box>

          {/* Signature Upload Section for SchoolAdmin */}
          {user?.role === "SchoolAdmin" && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: "background.paper" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Box
                  sx={{
                    width: 200,
                    height: 100,
                    border: "2px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    bgcolor: "background.default",
                  }}
                >
                  {signature ? (
                    <img
                      src={signature}
                      alt="Signature"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: "center", p: 2 }}>
                      <Draw sx={{ fontSize: 32, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        {t('common.noSignature')}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {t('common.digitalSignature')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload your signature image for official report approval. This signature will appear on
                    approved report cards.
                  </Typography>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleSignatureUpload}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Draw />}
                    onClick={() => signatureInputRef.current?.click()}
                  >
                    {signature ? t('common.changeSignature') : t('common.uploadSignature')}
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* ✅ FIXED: Personal Info Tab - complete JSX structure */}
          {tabValue === 0 && (
            <>
              {isLoadingRoleData ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('pages.dashboard.firstName')}
                        value={profileData.firstName}
                        onChange={handleFieldChange("firstName")}
                        disabled={!isEditing}
                      />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('pages.dashboard.lastName')}
                    value={profileData.lastName}
                    onChange={handleFieldChange("lastName")}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('common.email')}
                    value={profileData.email}
                    onChange={handleFieldChange("email")}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('common.username')}
                    value={user?.username || ""}
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('common.role')}
                    value={roleCopy.title}
                    disabled
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('common.aboutThisRole')}
                    value={roleCopy.subtitle}
                    multiline
                    rows={3}
                    disabled
                  />
                </Grid>
              </Grid>

              {renderRoleSpecificSummary() && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    {t('common.roleDetails')}
                  </Typography>
                  {renderRoleSpecificSummary()}
                </>
              )}
                </Box>
              )}
            </>
          )}

          {/* ✅ FIXED: Contact Details Tab - complete JSX structure */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={t('common.emailAddress')}
                  value={profileData.email}
                  disabled
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Contact Note"
                  value="Phone and profile photo can be updated here. Other role-specific records are managed from their dedicated modules."
                  multiline
                  rows={3}
                  disabled
                />
              </Grid>
            </Grid>
          )}

          {/* ✅ FIXED: Change Password Tab - correct function calls */}
          {tabValue === 2 && (
            <Box sx={{ maxWidth: 500 }}>
              <Typography variant="h6" fontWeight={600} mb={3}>
                {t('common.changePassword')}
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('common.currentPassword')}
                    type="password"
                    autoComplete="current-password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordFieldChange("currentPassword")}
                    disabled={passwordBusy}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('common.newPassword')}
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordFieldChange("newPassword")}
                    disabled={passwordBusy}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('common.confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordFieldChange("confirmPassword")}
                    disabled={passwordBusy}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    startIcon={<Lock />}
                    onClick={handlePasswordChange}
                    disabled={passwordBusy}
                    aria-label="Change password"
                  >
                    {passwordBusy ? t('common.loading') : t('common.changePassword')}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearanceSettings.darkMode}
                      onChange={(e) =>
                        applyAppearancePreview({
                          ...appearanceSettings,
                          darkMode: e.target.checked,
                        })
                      }
                      disabled={!isEditing}
                    />
                  }
                  label="Dark Mode"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Color Theme</InputLabel>
                  <Select
                    value={appearanceSettings.colorTheme}
                    label="Color Theme"
                    onChange={(e) =>
                      applyAppearancePreview({
                        ...appearanceSettings,
                        colorTheme: e.target
                          .value as AppearanceSettings["colorTheme"],
                      })
                    }
                  >
                    <MenuItem value="green">Green</MenuItem>
                    <MenuItem value="blue">Blue</MenuItem>
                    <MenuItem value="purple">Purple</MenuItem>
                    <MenuItem value="orange">Orange</MenuItem>
                    <MenuItem value="red">Red</MenuItem>
                    <MenuItem value="slate">Slate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Font Size</InputLabel>
                  <Select
                    value={appearanceSettings.fontSize}
                    label="Font Size"
                    onChange={(e) =>
                      applyAppearancePreview({
                        ...appearanceSettings,
                        fontSize: e.target
                          .value as AppearanceSettings["fontSize"],
                      })
                    }
                  >
                    <MenuItem value="small">Small</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="large">Large</MenuItem>
                    <MenuItem value="extraLarge">Extra Large</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Density</InputLabel>
                  <Select
                    value={appearanceSettings.density}
                    label="Density"
                    onChange={(e) =>
                      applyAppearancePreview({
                        ...appearanceSettings,
                        density: e.target
                          .value as AppearanceSettings["density"],
                      })
                    }
                  >
                    <MenuItem value="compact">Compact</MenuItem>
                    <MenuItem value="comfortable">Comfortable</MenuItem>
                    <MenuItem value="spacious">Spacious</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel>Border Radius</InputLabel>
                  <Select
                    value={appearanceSettings.borderRadius}
                    label="Border Radius"
                    onChange={(e) =>
                      applyAppearancePreview({
                        ...appearanceSettings,
                        borderRadius: e.target
                          .value as AppearanceSettings["borderRadius"],
                      })
                    }
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="small">Small</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="large">Large</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearanceSettings.sidebarCollapsed}
                      onChange={(e) =>
                        applyAppearancePreview({
                          ...appearanceSettings,
                          sidebarCollapsed: e.target.checked,
                        })
                      }
                      disabled={!isEditing}
                    />
                  }
                  label="Collapse Sidebar by Default"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearanceSettings.showAnimations}
                      onChange={(e) =>
                        applyAppearancePreview({
                          ...appearanceSettings,
                          showAnimations: e.target.checked,
                        })
                      }
                      disabled={!isEditing}
                    />
                  }
                  label="Enable Animations"
                />
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
