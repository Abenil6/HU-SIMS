import { type ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Badge,
  Box,
  Chip,
  Divider,
  IconButton,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Announcement,
  Assessment,
  MailOutline,
  NotificationsNone,
  Schedule,
  SettingsSuggest,
  WarningAmber,
} from "@mui/icons-material";

import {
  type DashboardNotification,
  type NotificationKind,
  useNotifications,
} from "@/hooks/notifications/useNotifications";

const kindIconMap: Record<NotificationKind, ReactNode> = {
  message: <MailOutline fontSize="small" />,
  announcement: <Announcement fontSize="small" />,
  absence: <WarningAmber fontSize="small" />,
  grade: <Assessment fontSize="small" />,
  timetable: <Schedule fontSize="small" />,
  system: <SettingsSuggest fontSize="small" />,
};

const kindLabelMap: Record<NotificationKind, string> = {
  message: "Message",
  announcement: "Announcement",
  absence: "Alert",
  grade: "Grade",
  timetable: "Timetable",
  system: "System",
};

const formatNotificationTime = (createdAt: string) => {
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return "Recent";

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute));
    return `${minutes}m ago`;
  }

  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return `${hours}h ago`;
  }

  const days = Math.max(1, Math.round(diff / day));
  return `${days}d ago`;
};

export function NotificationBell() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    summary,
    isLoading,
  } =
    useNotifications();

  const unreadLabel = useMemo(
    () =>
      unreadCount > 99
        ? "99+"
        : unreadCount > 0
          ? String(unreadCount)
          : "",
    [unreadCount],
  );

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: DashboardNotification) => {
    await markNotificationAsRead(notification);
    handleClose();
    navigate(notification.href);
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: "text.secondary", mr: 1 }}>
        <Badge
          color="error"
          badgeContent={unreadLabel}
          invisible={unreadCount === 0}
        >
          <NotificationsNone />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 380,
            maxWidth: "calc(100vw - 24px)",
            mt: 1,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              <Chip
                size="small"
                color={unreadCount > 0 ? "primary" : "default"}
                label={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              />
            </Stack>
            {unreadCount > 0 ? (
              <Button size="small" onClick={() => void handleMarkAllAsRead()}>
                Mark all read
              </Button>
            ) : null}
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
            {summary}
          </Typography>
        </Box>

        <Divider />

        {notifications.length === 0 ? (
          <Box sx={{ px: 2.5, py: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isLoading ? "Loading notifications..." : "No new notifications"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {isLoading
                ? "Pulling updates from your dashboard feeds."
                : "New messages, announcements, alerts, grades, and timetable changes will appear here."}
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 420, overflowY: "auto" }}>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <ListItemButton
                  onClick={() => void handleNotificationClick(notification)}
                  sx={{
                    alignItems: "flex-start",
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    backgroundColor: notification.unread
                      ? alpha(theme.palette.primary.main, 0.05)
                      : "transparent",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      mt: 0.25,
                      color:
                        notification.priority === "high"
                          ? theme.palette.warning.main
                          : theme.palette.primary.main,
                    }}
                  >
                    {kindIconMap[notification.kind]}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: notification.unread ? 700 : 600, flex: 1 }}
                        >
                          {notification.title}
                        </Typography>
                        {notification.unread ? (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: theme.palette.primary.main,
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.75}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "text.secondary",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {notification.description}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            variant="outlined"
                            label={kindLabelMap[notification.kind]}
                            sx={{ height: 22 }}
                          />
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {formatNotificationTime(notification.createdAt)}
                          </Typography>
                        </Stack>
                      </Stack>
                    }
                  />
                </ListItemButton>
                {index < notifications.length - 1 ? <Divider component="li" /> : null}
              </Box>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}
