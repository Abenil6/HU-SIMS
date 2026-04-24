import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Save,
  School,
  Notifications,
  Security,
  Palette,
} from "@mui/icons-material";
import { apiGet, apiPost } from "@/services/api";
import toast from "react-hot-toast";
import authService from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import type { AppearanceSettings } from "@/types/user";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearanceSettings,
} from "@/lib/appearance";
import { academicYearService } from "@/services/academicYearService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedSettings, setLoadedSettings] = useState<any>(null);

  // School Settings State
  const [schoolSettings, setSchoolSettings] = useState({
    schoolName: "Haramaya University Non-Boarding Secondary School",
    schoolAddress: "Ethiopia",
    academicYear: "2025-2026",
    semester: "1st Semester",
    timezone: "Africa/Addis_Ababa",
    contactEmail: "admin@school.edu",
    contactPhone: "+251-XX-XXX-XXXX",
  });

  // Academic Year State
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    absenceAlerts: true,
    gradeNotifications: true,
    announcementNotifications: true,
    messageNotifications: true,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: "30",
    passwordExpiry: "90",
  });

  const handleSchoolChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setSchoolSettings({ ...schoolSettings, [field]: event.target.value });
      setSaved(false);
    };

  const handleNotificationChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setNotificationSettings({
        ...notificationSettings,
        [field]: event.target.checked,
      });
      setSaved(false);
    };

  // Appearance Settings State
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);

  const handleSecurityChange =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSecuritySettings({ ...securitySettings, [field]: event.target.value });
      setSaved(false);
    };

  const handleAppearanceChange =
    (field: string) =>
    (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
      const target = event.target as HTMLInputElement & { value: unknown };
      const value =
        target.type === "checkbox" ? target.checked : target.value;
      const nextAppearanceSettings = {
        ...appearanceSettings,
        [field]: value,
      } as AppearanceSettings;
      setAppearanceSettings(nextAppearanceSettings);
      setSaved(false);
    };

  // Fetch academic years on mount
  useEffect(() => {
    academicYearService
      .getAcademicYears()
      .then((res: any) => {
        const years = res?.data || [];
        setAcademicYears(years);
        if (years.length > 0 && !selectedAcademicYearId) {
          const activeYear = years.find((y: any) => y.isActive);
          const defaultYear = activeYear || years[0];
          setSelectedAcademicYearId(defaultYear._id || defaultYear.id);
          setSchoolSettings((prev) => ({
            ...prev,
            academicYear: defaultYear.year,
          }));
        }
      })
      .catch(() => setAcademicYears([]));
  }, []);

  // Handle academic year activation
  const handleActivateAcademicYear = async (id: string) => {
    try {
      await academicYearService.setAsActive(id);
      toast.success("Academic year activated successfully");
      // Refresh academic years to update active status
      const res: any = await academicYearService.getAcademicYears();
      const years = res?.data || [];
      setAcademicYears(years);
      const activeYear = years.find((y: any) => y.isActive);
      if (activeYear) {
        setSchoolSettings((prev) => ({
          ...prev,
          academicYear: activeYear.year,
        }));
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to activate academic year");
    }
  };

  const applyLoadedSettings = (payload: any) => {
    if (payload?.systemSettings) {
      setSchoolSettings((prev) => ({
        ...prev,
        schoolName: payload.systemSettings.siteName ?? prev.schoolName,
        schoolAddress:
          payload.systemSettings.schoolAddress ?? prev.schoolAddress,
        academicYear:
          payload.systemSettings.academicYear ?? prev.academicYear,
        semester: payload.systemSettings.semester ?? prev.semester,
        timezone: payload.systemSettings.timezone ?? prev.timezone,
        contactEmail:
          payload.systemSettings.contactEmail ?? prev.contactEmail,
        contactPhone:
          payload.systemSettings.contactPhone ?? prev.contactPhone,
      }));
    }

    if (payload?.notificationSettings) {
      setNotificationSettings((prev) => ({
        ...prev,
        emailNotifications:
          payload.notificationSettings.emailNotifications ??
          prev.emailNotifications,
        smsNotifications:
          payload.notificationSettings.smsNotifications ??
          prev.smsNotifications,
        absenceAlerts:
          payload.notificationSettings.absenceAlerts ??
          prev.absenceAlerts,
        gradeNotifications:
          payload.notificationSettings.gradeNotifications ??
          prev.gradeNotifications,
        announcementNotifications:
          payload.notificationSettings.announcementNotifications ??
          prev.announcementNotifications,
        messageNotifications:
          payload.notificationSettings.messageNotifications ??
          prev.messageNotifications,
      }));
    }

    if (payload?.securitySettings) {
      setSecuritySettings((prev) => ({
        ...prev,
        twoFactorAuth: Boolean(payload.securitySettings.twoFactorAuth),
        sessionTimeout: String(
          payload.systemSettings?.sessionTimeout ?? prev.sessionTimeout,
        ),
        passwordExpiry: String(
          payload.securitySettings.passwordExpiry ?? prev.passwordExpiry,
        ),
      }));
    }
  };

  const handleCancel = () => {
    if (loadedSettings) {
      applyLoadedSettings(loadedSettings);
    }
    if (user?.appearanceSettings) {
      setAppearanceSettings(normalizeAppearanceSettings(user.appearanceSettings));
    } else {
      setAppearanceSettings(DEFAULT_APPEARANCE);
    }
    setSaved(false);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const res: any = await apiGet("/system/settings");
        const payload = res?.data ?? res;
        setLoadedSettings(payload);
        applyLoadedSettings(payload);

        if (user?.appearanceSettings) {
          setAppearanceSettings(
            normalizeAppearanceSettings(user.appearanceSettings),
          );
        }
      } catch (error) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.appearanceSettings]);

  const persistSettings = async () => {
    try {
      setLoading(true);
      await apiPost("/system/settings", {
        systemSettings: {
          ...(loadedSettings?.systemSettings || {}),
          siteName: schoolSettings.schoolName,
          schoolAddress: schoolSettings.schoolAddress,
          academicYear: schoolSettings.academicYear,
          semester: schoolSettings.semester,
          timezone: schoolSettings.timezone,
          contactEmail: schoolSettings.contactEmail,
          contactPhone: schoolSettings.contactPhone,
          sessionTimeout: Number(securitySettings.sessionTimeout),
        },
        notificationSettings: {
          ...(loadedSettings?.notificationSettings || {}),
          emailNotifications: notificationSettings.emailNotifications,
          smsNotifications: notificationSettings.smsNotifications,
          absenceAlerts: notificationSettings.absenceAlerts,
          gradeNotifications: notificationSettings.gradeNotifications,
          announcementNotifications:
            notificationSettings.announcementNotifications,
          messageNotifications: notificationSettings.messageNotifications,
        },
        securitySettings: {
          ...(loadedSettings?.securitySettings || {}),
          twoFactorAuth: securitySettings.twoFactorAuth,
          passwordExpiry: Number(securitySettings.passwordExpiry),
        },
      });
      const updatedUser =
        await authService.updateAppearance(appearanceSettings);
      updateUser({
        appearanceSettings: normalizeAppearanceSettings({
          ...(updatedUser.appearanceSettings || {}),
          ...appearanceSettings,
        }),
      });
      setSaved(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        {t('common.settings')}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {t('common.manageSettings')}
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('common.settingsSaved')}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab icon={<School />} label={t('common.schoolSettings')} iconPosition="start" />
          <Tab
            icon={<Notifications />}
            label={t('common.notifications')}
            iconPosition="start"
          />
          <Tab icon={<Security />} label={t('common.security')} iconPosition="start" />
          <Tab icon={<Palette />} label={t('common.appearance')} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* School Settings */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('common.schoolConfiguration')}
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="School Name"
                  value={schoolSettings.schoolName}
                  onChange={handleSchoolChange("schoolName")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Address"
                  value={schoolSettings.schoolAddress}
                  onChange={handleSchoolChange("schoolAddress")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FormControl fullWidth>
                    <InputLabel>Academic Year</InputLabel>
                    <Select
                      value={selectedAcademicYearId}
                      label="Academic Year"
                      onChange={(e) => {
                        setSelectedAcademicYearId(e.target.value);
                        const selectedYear = academicYears.find(
                          (y: any) => (y._id || y.id) === e.target.value
                        );
                        if (selectedYear) {
                          setSchoolSettings((prev) => ({
                            ...prev,
                            academicYear: selectedYear.year,
                          }));
                          setSaved(false);
                        }
                      }}
                    >
                      {academicYears.map((year: any) => (
                        <MenuItem key={year._id || year.id} value={year._id || year.id}>
                          {year.year} {year.isActive ? "(Active)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={() => selectedAcademicYearId && handleActivateAcademicYear(selectedAcademicYearId)}
                    disabled={!selectedAcademicYearId}
                    sx={{ minWidth: 100 }}
                  >
                    Activate
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Current Semester"
                  value={schoolSettings.semester}
                  onChange={handleSchoolChange("semester")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={schoolSettings.contactEmail}
                  onChange={handleSchoolChange("contactEmail")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={schoolSettings.contactPhone}
                  onChange={handleSchoolChange("contactPhone")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={schoolSettings.timezone}
                    label="Timezone"
                    onChange={(e) => {
                      setSchoolSettings({
                        ...schoolSettings,
                        timezone: e.target.value,
                      });
                      setSaved(false);
                    }}
                  >
                    <MenuItem value="Africa/Addis_Ababa">
                      Africa/Addis Ababa (UTC+3)
                    </MenuItem>
                    <MenuItem value="Africa/Nairobi">
                      Africa/Nairobi (UTC+3)
                    </MenuItem>
                    <MenuItem value="UTC">UTC</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Notification Settings */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('common.notificationPreferences')}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onChange={handleNotificationChange("emailNotifications")}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.absenceAlerts}
                    onChange={handleNotificationChange("absenceAlerts")}
                  />
                }
                label="Absence Alerts to Parents"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.gradeNotifications}
                    onChange={handleNotificationChange("gradeNotifications")}
                  />
                }
                label="Grade Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.announcementNotifications}
                    onChange={handleNotificationChange(
                      "announcementNotifications",
                    )}
                  />
                }
                label="Announcement Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.messageNotifications}
                    onChange={handleNotificationChange("messageNotifications")}
                  />
                }
                label="Message Notifications"
              />
            </Box>
          </TabPanel>

          {/* Security Settings */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('common.securitySettings')}
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onChange={(e) => {
                        setSecuritySettings({
                          ...securitySettings,
                          twoFactorAuth: e.target.checked,
                        });
                        setSaved(false);
                      }}
                    />
                  }
                  label="Two-Factor Authentication"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={handleSecurityChange("sessionTimeout")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Password Expiry (days)"
                  type="number"
                  value={securitySettings.passwordExpiry}
                  onChange={handleSecurityChange("passwordExpiry")}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Appearance Settings */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              {t('common.appearanceSettings')}
            </Typography>
            <Grid container spacing={3}>
              {/* Dark Mode */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearanceSettings.darkMode}
                      onChange={handleAppearanceChange("darkMode")}
                    />
                  }
                  label="Dark Mode"
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Enable dark theme for the entire application
                </Typography>
              </Grid>

              {/* Color Theme */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Color Theme</InputLabel>
                  <Select
                    value={appearanceSettings.colorTheme}
                    label="Color Theme"
                    onChange={handleAppearanceChange("colorTheme") as any}
                  >
                    <MenuItem value="green">Green (Default)</MenuItem>
                    <MenuItem value="blue">Blue</MenuItem>
                    <MenuItem value="purple">Purple</MenuItem>
                    <MenuItem value="orange">Orange</MenuItem>
                    <MenuItem value="red">Red</MenuItem>
                    <MenuItem value="slate">Slate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Font Size */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Font Size</InputLabel>
                  <Select
                    value={appearanceSettings.fontSize}
                    label="Font Size"
                    onChange={handleAppearanceChange("fontSize") as any}
                  >
                    <MenuItem value="small">Small</MenuItem>
                    <MenuItem value="medium">Medium (Default)</MenuItem>
                    <MenuItem value="large">Large</MenuItem>
                    <MenuItem value="extraLarge">Extra Large</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Layout Density */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Layout Density</InputLabel>
                  <Select
                    value={appearanceSettings.density}
                    label="Layout Density"
                    onChange={handleAppearanceChange("density") as any}
                  >
                    <MenuItem value="compact">Compact</MenuItem>
                    <MenuItem value="comfortable">
                      Comfortable (Default)
                    </MenuItem>
                    <MenuItem value="spacious">Spacious</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Border Radius */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Border Radius</InputLabel>
                  <Select
                    value={appearanceSettings.borderRadius}
                    label="Border Radius"
                    onChange={handleAppearanceChange("borderRadius") as any}
                  >
                    <MenuItem value="none">None (Sharp)</MenuItem>
                    <MenuItem value="small">Small</MenuItem>
                    <MenuItem value="medium">Medium (Default)</MenuItem>
                    <MenuItem value="large">Large (Rounded)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Sidebar Collapsed */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearanceSettings.sidebarCollapsed}
                      onChange={handleAppearanceChange("sidebarCollapsed")}
                    />
                  }
                  label="Collapse Sidebar by Default"
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Start with a collapsed sidebar for more screen space
                </Typography>
              </Grid>

              {/* Show Animations */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearanceSettings.showAnimations}
                      onChange={handleAppearanceChange("showAnimations")}
                    />
                  }
                  label="Enable Animations"
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Show smooth transitions and animations throughout the UI
                </Typography>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="outlined"
            sx={{ mr: 2 }}
            disabled={loading}
            onClick={handleCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={persistSettings}
            disabled={loading}
          >
            {t('common.saveChanges')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
