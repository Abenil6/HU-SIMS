import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Badge,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  createTheme,
  ThemeProvider,
  CssBaseline,
  alpha,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  School,
  Brightness4,
  Brightness7,
  Assignment,
  Assessment,
  Event,
  Settings,
  Logout,
  AccountCircle,
  Message,
  Announcement,
  Schedule,
  Description,
  Class,
  Person,
  LibraryBooks,
  Warning,
} from "@mui/icons-material";

import { useAuthStore } from "@/stores/authStore";
import type { AppearanceSettings } from "@/types/user";
import authService from "@/services/authService";
import { useInbox } from "@/hooks/messages/useMessages";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  normalizeAppearanceSettings,
} from "@/lib/appearance";

const colors = {
  sage: "#8FA998",
  sageLight: "#A8C4B5",
  sageDark: "#6B8A78",
  parchment: "#FDFBF7",
  eggshell: "#F5F2EA",
  charcoal: "#242424",
  forest: "#1A4A3A",
  forestLight: "#2D6B54",
  graphite: "#1D1F1E",
  midnight: "#0F1513",
  mist: "#DDE4DF",
};

const themePalettes: Record<
  string,
  {
    light: { main: string; light: string; dark: string; secondary: string };
    dark: { main: string; light: string; dark: string; secondary: string };
  }
> = {
  green: {
    light: {
      main: colors.forest,
      light: colors.forestLight,
      dark: colors.charcoal,
      secondary: colors.sage,
    },
    dark: {
      main: colors.sage,
      light: colors.sageLight,
      dark: colors.sageDark,
      secondary: colors.sageLight,
    },
  },
  blue: {
    light: { main: "#1F5AA6", light: "#4E86D9", dark: "#163D73", secondary: "#6CA6DC" },
    dark: { main: "#7DB3F7", light: "#A9CEFA", dark: "#4C7DB8", secondary: "#B7D5FA" },
  },
  purple: {
    light: { main: "#6D4ACF", light: "#9576E6", dark: "#4D32A1", secondary: "#B9A4F4" },
    dark: { main: "#B9A4F4", light: "#D6C8FA", dark: "#8C73CF", secondary: "#E2D8FF" },
  },
  orange: {
    light: { main: "#C7681A", light: "#E69952", dark: "#8F4B11", secondary: "#F0B06A" },
    dark: { main: "#F4B36A", light: "#F8CAA0", dark: "#C78642", secondary: "#FFD4A8" },
  },
  red: {
    light: { main: "#B33A3A", light: "#D86A6A", dark: "#7F2626", secondary: "#E8A1A1" },
    dark: { main: "#F08D8D", light: "#F7B4B4", dark: "#B85D5D", secondary: "#FFD0D0" },
  },
  slate: {
    light: { main: "#475569", light: "#64748B", dark: "#334155", secondary: "#94A3B8" },
    dark: { main: "#94A3B8", light: "#CBD5E1", dark: "#64748B", secondary: "#E2E8F0" },
  },
};

const fontScaleMap: Record<string, number> = {
  small: 13,
  medium: 14,
  large: 16,
  extraLarge: 18,
};

const borderRadiusMap: Record<string, number> = {
  none: 0,
  small: 6,
  medium: 10,
  large: 18,
};

const densitySpacingMap: Record<string, number> = {
  compact: 6,
  comfortable: 8,
  spacious: 10,
};

const createDashboardTheme = (appearance: AppearanceSettings) => {
  const paletteKey = themePalettes[appearance.colorTheme] ? appearance.colorTheme : "green";
  const paletteSet = themePalettes[paletteKey];
  const mode = appearance.darkMode ? "dark" : "light";
  const activePalette = appearance.darkMode ? paletteSet.dark : paletteSet.light;
  const borderColor = alpha(
    activePalette.light,
    appearance.darkMode ? 0.2 : 0.12,
  );

  return createTheme({
    spacing: densitySpacingMap[appearance.density] || densitySpacingMap.comfortable,
    palette: {
      mode,
      primary: {
        main: activePalette.main,
        light: activePalette.light,
        dark: activePalette.dark,
      },
      secondary: { main: activePalette.secondary },
      background: appearance.darkMode
        ? { default: colors.midnight, paper: colors.graphite }
        : { default: colors.parchment, paper: colors.eggshell },
      text: appearance.darkMode
        ? { primary: colors.parchment, secondary: colors.mist }
        : { primary: colors.charcoal, secondary: "#4F5B57" },
    },
    typography: {
      fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
      fontSize: fontScaleMap[appearance.fontSize] || fontScaleMap.medium,
      h4: {
        fontFamily: '"Playfair Display", "Times New Roman", serif',
        fontWeight: 600,
      },
    },
    shape: { borderRadius: borderRadiusMap[appearance.borderRadius] ?? borderRadiusMap.medium },
    transitions: {
      create: (...args) =>
        appearance.showAnimations
          ? createTheme().transitions.create(...args)
          : "none",
      duration: appearance.showAnimations
        ? createTheme().transitions.duration
        : {
            shortest: 0,
            shorter: 0,
            short: 0,
            standard: 0,
            complex: 0,
            enteringScreen: 0,
            leavingScreen: 0,
          },
      easing: createTheme().transitions.easing,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: appearance.showAnimations ? undefined : "none !important",
          },
          "*": {
            transition: appearance.showAnimations ? undefined : "none !important",
            animation: appearance.showAnimations ? undefined : "none !important",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${borderColor}`,
            boxShadow: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${borderColor}`,
            boxShadow: "none",
          },
        },
      },
    },
  });
};

const drawerWidth = 280;
const collapsedDrawerWidth = 92;

// SystemAdmin specific navigation
const getSystemAdminNavigation = (t: any) => [
  { text: t('dashboard.dashboard'), icon: <Dashboard />, path: "" },
  { text: t('dashboard.userManagement'), icon: <People />, path: "users" },
  { text: t('dashboard.rolesPermissions'), icon: <Assignment />, path: "roles" },
  { text: t('dashboard.systemSettings'), icon: <Settings />, path: "settings" },
  { text: t('dashboard.securityBackups'), icon: <Warning />, path: "security" },
  { text: t('dashboard.systemLogs'), icon: <Description />, path: "logs" },
  { text: t('dashboard.profile'), icon: <Person />, path: "profile" },
];

// SchoolAdmin specific navigation
const getSchoolAdminNavigation = (t: any) => [
  { text: t('dashboard.dashboard'), icon: <Dashboard />, path: "" },
  { text: t('dashboard.classes'), icon: <Class />, path: "classes" },
  { text: t('dashboard.students'), icon: <School />, path: "students" },
  { text: t('dashboard.bulkUpload'), icon: <Assignment />, path: "students/upload" },
  { text: t('dashboard.teachers'), icon: <People />, path: "teachers" },
  { text: t('dashboard.parents'), icon: <People />, path: "parents" },
  { text: t('dashboard.attendance'), icon: <Event />, path: "attendance" },
  { text: t('dashboard.grades'), icon: <Assessment />, path: "grades" },
  { text: t('dashboard.timetable'), icon: <Schedule />, path: "timetable" },
  { text: t('dashboard.messages'), icon: <Message />, path: "messages" },
  { text: t('dashboard.announcements'), icon: <Announcement />, path: "announcements" },
  { text: t('dashboard.examSchedule'), icon: <Event />, path: "exam-schedule" },
  { text: t('dashboard.reports'), icon: <Assignment />, path: "reports" },
  { text: t('dashboard.settings'), icon: <Settings />, path: "settings" },
  { text: t('dashboard.profile'), icon: <Person />, path: "profile" },
];

// Teacher specific navigation
const getTeacherNavigation = (t: any) => [
  { text: t('dashboard.dashboard'), icon: <Dashboard />, path: "" },
  { text: t('dashboard.students'), icon: <School />, path: "students" },
  { text: t('dashboard.attendance'), icon: <Event />, path: "attendance" },
  { text: t('dashboard.grades'), icon: <Assessment />, path: "grades" },
  { text: t('dashboard.timetable'), icon: <Schedule />, path: "timetable" },
  { text: t('dashboard.messages'), icon: <Message />, path: "messages" },
  { text: t('dashboard.announcements'), icon: <Announcement />, path: "announcements" },
  { text: t('dashboard.examSchedule'), icon: <Event />, path: "exam-schedule" },
  { text: t('dashboard.profile'), icon: <Person />, path: "profile" },
];

// Student specific navigation
const getStudentNavigation = (t: any) => [
  { text: t('dashboard.dashboard'), icon: <Dashboard />, path: "" },
  { text: t('dashboard.grades'), icon: <Assessment />, path: "grades" },
  { text: t('dashboard.attendance'), icon: <Event />, path: "attendance" },
  { text: t('dashboard.timetable'), icon: <Schedule />, path: "timetable" },
  { text: t('dashboard.messages'), icon: <Message />, path: "messages" },
  { text: t('dashboard.reports'), icon: <Description />, path: "reports" },
  { text: t('dashboard.profile'), icon: <Person />, path: "profile" },
];

// Parent specific navigation
const getParentNavigation = (t: any, firstChildId: string) => [
  { text: t('dashboard.dashboard'), icon: <Dashboard />, path: "" },
  { text: t('dashboard.grades'), icon: <Assessment />, path: firstChildId ? `children/${firstChildId}/grades` : "grades" },
  { text: t('dashboard.attendance'), icon: <Event />, path: firstChildId ? `children/${firstChildId}/attendance` : "attendance" },
  { text: t('dashboard.timetable'), icon: <Schedule />, path: "timetable" },
  { text: t('dashboard.messages'), icon: <Message />, path: "messages" },
  { text: t('dashboard.alerts'), icon: <Warning />, path: "alerts" },
  { text: t('dashboard.reports'), icon: <Description />, path: "reports" },
  { text: t('dashboard.profile'), icon: <Person />, path: "profile" },
];

const getNavigationItems = (role: string, firstChildId: string = "", t: any) => {
  switch (role) {
    case "SystemAdmin":
      return getSystemAdminNavigation(t);
    case "SchoolAdmin":
      return getSchoolAdminNavigation(t);
    case "Teacher":
      return getTeacherNavigation(t);
    case "Student":
      return getStudentNavigation(t);
    case "Parent":
      return getParentNavigation(t, firstChildId);
    default:
      return [{ text: t('dashboard.dashboard'), icon: <Dashboard />, path: "" }];
  }
};

export function DashboardLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser, selectedChildId } = useAuthStore();
  const { data: inboxData } = useInbox();
  const appearance = normalizeAppearanceSettings(user?.appearanceSettings);
  const unreadInboxCount = Array.isArray((inboxData as any)?.data)
    ? (inboxData as any).data.filter((message: any) => !message?.isRead).length
    : 0;
  
  const [appearanceState, setAppearanceState] = useState<AppearanceSettings>(appearance);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    Boolean(appearance.sidebarCollapsed),
  );
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const currentTheme = createDashboardTheme(appearanceState);

  // Fetch parent's children for navigation
  const { data: childrenData } = useQuery({
    queryKey: ["parent", "children"],
    queryFn: () => apiGet<any>("/parents/children"),
    enabled: user?.role === "Parent",
  });
  const children: any[] = Array.isArray(childrenData?.data?.children || childrenData?.children || childrenData?.data)
    ? (childrenData.data.children || childrenData.children || childrenData.data)
    : [];
  const firstChildId = children[0]?._id || children[0]?.id || "";
  const activeChildId = selectedChildId || firstChildId;

  useEffect(() => {
    setSidebarCollapsed(Boolean(appearance.sidebarCollapsed));
  }, [appearance.sidebarCollapsed]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    logout();
    navigate("/");
    handleProfileMenuClose();
  };
  const handleProfileClick = () => {
    const basePath = getBasePath();
    navigate(`${basePath}/profile`);
    handleProfileMenuClose();
  };

  const persistAppearance = async (nextAppearance: AppearanceSettings) => {
    try {
      setIsSavingAppearance(true);
      const updated = await authService.updateAppearance(nextAppearance);
      updateUser({
        appearanceSettings: normalizeAppearanceSettings({
          ...(updated.appearanceSettings || {}),
          ...nextAppearance,
        }),
      });
    } catch (error) {
      // Revert from server copy on failure by reusing current store-backed settings on next render
    } finally {
      setIsSavingAppearance(false);
    }
  };

  // Sync with user settings when they change externally
  useEffect(() => {
    setAppearanceState(appearance);
  }, [user?.appearanceSettings]);

  const handleThemeToggle = () => {
    const nextAppearance: AppearanceSettings = {
      ...appearanceState,
      darkMode: !appearanceState.darkMode,
    };
    setAppearanceState(nextAppearance);
    updateUser({
      appearanceSettings: nextAppearance,
    });
    void persistAppearance(nextAppearance);
  };

  const effectiveDrawerWidth =
    !isMobile && sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;

  const filteredNavItems = getNavigationItems(user?.role || "", activeChildId, t);
  const getBasePath = () => {
    const role = user?.role || "";
    switch (role) {
      case "SystemAdmin":
        return "/admin";
      case "SchoolAdmin":
        return "/school-admin";
      case "Teacher":
        return "/teacher";
      case "Student":
        return "/student";
      case "Parent":
        return "/parent";
      default:
        return "/";
    }
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: sidebarCollapsed && !isMobile ? 2 : 3,
          borderBottom: `1px solid ${alpha(currentTheme.palette.primary.main, 0.12)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${colors.forest}, ${colors.sage})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <School sx={{ color: "white", fontSize: 24 }} />
          </Box>
          {!sidebarCollapsed || isMobile ? <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              SIMS
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {t(`roles.${user?.role?.toLowerCase() || 'student'}`) || "User"}
            </Typography>
          </Box> : null}
        </Box>
      </Box>

      <List sx={{ flex: 1, py: 2 }}>
        {filteredNavItems.map((item: any) => {
          const basePath = getBasePath();
          const fullPath =
            `${basePath}/${item.path}`.replace(/\/+$/, "") +
            (item.path ? "/" : "");
          const isActive =
            location.pathname === fullPath ||
            (item.path === "" && location.pathname === basePath);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path === "" ? basePath : fullPath);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  mx: 2,
                  borderRadius: 2,
                  backgroundColor: isActive
                    ? alpha(currentTheme.palette.primary.main, 0.1)
                    : "transparent",
                  color: isActive
                    ? currentTheme.palette.primary.main
                    : "text.secondary",
                  "&:hover": {
                    backgroundColor: alpha(
                      currentTheme.palette.primary.main,
                      0.08,
                    ),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive
                      ? currentTheme.palette.primary.main
                      : "text.secondary",
                    minWidth: 40,
                  }}
                >
                  {item.path === "messages" ? (
                    <Badge
                      color="error"
                      badgeContent={unreadInboxCount}
                      invisible={unreadInboxCount === 0}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "0.875rem",
                    display: sidebarCollapsed && !isMobile ? "none" : "block",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha(currentTheme.palette.primary.main, 0.12)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 1,
            justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start",
          }}
        >
          <Avatar
            src={user?.profileImage}
            sx={{ bgcolor: currentTheme.palette.primary.main }}
          >
            {(!user?.profileImage && user?.firstName?.charAt(0)) ||
              (!user?.profileImage && <AccountCircle />)}
          </Avatar>
          {!sidebarCollapsed || isMobile ? <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {user?.email}
            </Typography>
          </Box> : null}
        </Box>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", height: "100vh" }}>
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${effectiveDrawerWidth}px)` },
            ml: { md: `${effectiveDrawerWidth}px` },
            bgcolor: currentTheme.palette.background.paper,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={() =>
                setSidebarCollapsed((prev) => !prev)
              }
              sx={{ color: "text.secondary", mr: 1, display: { xs: "none", md: "inline-flex" } }}
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              onClick={handleThemeToggle}
              sx={{ color: "text.secondary", mr: 1 }}
              disabled={isSavingAppearance}
            >
              {appearanceState.darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            <LanguageSelector />
            <NotificationBell />
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ color: "text.secondary" }}
            >
              <Avatar
                src={user?.profileImage}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: currentTheme.palette.primary.main,
                }}
              >
                {(!user?.profileImage && user?.firstName?.charAt(0)) ||
                  (!user?.profileImage && <AccountCircle />)}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          component="nav"
          sx={{ width: { md: effectiveDrawerWidth }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={isMobile ? mobileOpen : true}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: effectiveDrawerWidth,
                overflowX: "hidden",
              },
            }}
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${effectiveDrawerWidth}px)` },
            bgcolor: currentTheme.palette.background.default,
            minHeight: "100vh",
          }}
        >
          <Toolbar />
          <Box
            sx={{
              p:
                appearanceState.density === "compact"
                  ? 2
                  : appearanceState.density === "spacious"
                    ? 4
                    : 3,
            }}
          >
            <Outlet />
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem onClick={handleProfileClick}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            {t('dashboard.profile')}
          </MenuItem>
          {(user?.role === "SystemAdmin" || user?.role === "SchoolAdmin") && (
            <MenuItem
              onClick={() => {
                const basePath = getBasePath();
                navigate(`${basePath}/settings`);
                handleProfileMenuClose();
              }}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              {t('dashboard.settings')}
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            {t('dashboard.logout')}
          </MenuItem>
        </Menu>
      </Box>
    </ThemeProvider>
  );
}
