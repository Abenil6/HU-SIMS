import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  Badge,
} from "@mui/material";
import {
  Warning,
  CheckCircle,
  Schedule,
  Visibility,
  Reply,
  Person,
  CalendarToday,
  NotificationsActive,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableLoading } from "@/components/ui/LoadingSpinner";
import {
  absenceAlertService,
  type AbsenceAlert,
} from "@/services/absenceAlertService";
import { useAuthStore } from "@/stores/authStore";

export function ParentAlertsPage() {
  const theme = useTheme();
  const { user } = useAuthStore();

  // State
  const [alerts, setAlerts] = useState<AbsenceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<AbsenceAlert | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [response, setResponse] = useState<
    "Acknowledged" | "Excused" | "Unexcused"
  >("Acknowledged");
  const [responseNote, setResponseNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch alerts
  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await absenceAlertService.getParentAlerts();
      setAlerts(response.data);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      toast.error("Failed to fetch alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Get alert type color
  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case "FirstAbsence":
        return "warning";
      case "ConsecutiveAbsence":
        return "error";
      case "ThresholdReached":
        return "error";
      case "PatternDetected":
        return "info";
      default:
        return "default";
    }
  };

  // Get alert type label
  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "FirstAbsence":
        return "First Absence";
      case "ConsecutiveAbsence":
        return "Consecutive Absence";
      case "ThresholdReached":
        return "Threshold Reached";
      case "PatternDetected":
        return "Pattern Detected";
      default:
        return type;
    }
  };

  // Handle view alert
  const handleViewAlert = async (alert: AbsenceAlert) => {
    setSelectedAlert(alert);
    setViewDialogOpen(true);

    // Mark as read if unread
    if (unreadCount > 0) {
      try {
        await absenceAlertService.markAsRead(alert._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
  };

  // Handle respond dialog
  const handleOpenRespond = (alert: AbsenceAlert) => {
    setSelectedAlert(alert);
    setResponse("Acknowledged");
    setResponseNote("");
    setRespondDialogOpen(true);
    setViewDialogOpen(false);
  };

  // Handle submit response
  const handleSubmitResponse = async () => {
    if (!selectedAlert) return;

    setIsSubmitting(true);
    try {
      await absenceAlertService.respondToAlert(selectedAlert._id, {
        response,
        responseNote,
      });
      toast.success("Response submitted successfully");
      setRespondDialogOpen(false);
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = {
    total: alerts.length,
    unresolved: alerts.filter((a) => a.status === "Active").length,
    responded: alerts.filter((a) => a.parentResponse?.responded).length,
  };

  return (
    <Box>
      <Breadcrumbs
        items={[
          { label: "Dashboard", path: "/parent" },
          { label: "Absence Alerts", path: "/parent/alerts" },
        ]}
      />

      <PageHeader
        title="Absence Alerts"
        subtitle="View and respond to your child's absence notifications"
        action={
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsActive />
          </Badge>
        }
      />

      {/* Stats Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Alerts", value: stats.total, icon: <Warning /> },
          { label: "Unresolved", value: stats.unresolved, icon: <Schedule /> },
          { label: "Responded", value: stats.responded, icon: <CheckCircle /> },
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

      {/* Alerts List */}
      {loading ? (
        <TableLoading />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No Absence Alerts"
          description="You don't have any absence alerts at this time."
        />
      ) : (
        <List>
          {alerts.map((alert) => (
            <Card
              key={alert._id}
              sx={{
                mb: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                background: alert.parentResponse?.responded
                  ? "transparent"
                  : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                "&:hover": {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                      }}
                    >
                      <Person />
                    </Box>
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {alert.student.firstName} {alert.student.lastName}
                        </Typography>
                        <Chip
                          label={getAlertTypeLabel(alert.alertType)}
                          size="small"
                          color={getAlertTypeColor(alert.alertType) as any}
                        />
                        {alert.consecutiveCount > 1 && (
                          <Chip
                            label={`${alert.consecutiveCount} days`}
                            size="small"
                            variant="outlined"
                            color="error"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Grade {alert.grade}-{alert.section}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          <CalendarToday
                            sx={{
                              fontSize: 12,
                              mr: 0.5,
                              verticalAlign: "middle",
                            }}
                          />
                          {new Date(alert.date).toLocaleDateString()}
                        </Typography>
                        {alert.period !== "Full Day" && (
                          <Typography variant="caption" color="text.secondary">
                            Period {alert.period}
                          </Typography>
                        )}
                        {alert.subject && (
                          <Typography variant="caption" color="text.secondary">
                            {alert.subject}
                          </Typography>
                        )}
                      </Box>
                      {alert.reason && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Reason:</strong> {alert.reason}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box>
                    {alert.parentResponse?.responded ? (
                      <Chip
                        icon={<CheckCircle />}
                        label={alert.parentResponse.response}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          color="primary"
                          onClick={() => handleViewAlert(alert)}
                        >
                          <Visibility />
                        </IconButton>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Reply />}
                          onClick={() => handleOpenRespond(alert)}
                          sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                          }}
                        >
                          Respond
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* View Alert Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAlert && (
          <>
            <DialogTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <Person />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {selectedAlert.student.firstName}{" "}
                    {selectedAlert.student.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Grade {selectedAlert.grade}-{selectedAlert.section}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
              >
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip
                    label={getAlertTypeLabel(selectedAlert.alertType)}
                    color={getAlertTypeColor(selectedAlert.alertType) as any}
                  />
                  <Chip label={selectedAlert.status} variant="outlined" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Absence Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedAlert.date).toLocaleDateString()}
                  </Typography>
                </Box>
                {selectedAlert.period !== "Full Day" && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Period
                    </Typography>
                    <Typography variant="body1">
                      {selectedAlert.period}
                    </Typography>
                  </Box>
                )}
                {selectedAlert.subject && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Subject
                    </Typography>
                    <Typography variant="body1">
                      {selectedAlert.subject}
                    </Typography>
                  </Box>
                )}
                {selectedAlert.teacher && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Teacher
                    </Typography>
                    <Typography variant="body1">
                      {selectedAlert.teacher.firstName}{" "}
                      {selectedAlert.teacher.lastName}
                    </Typography>
                  </Box>
                )}
                {selectedAlert.reason && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedAlert.reason}
                    </Typography>
                  </Box>
                )}
                {selectedAlert.parentResponse?.responded && (
                  <Box
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      p: 2,
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2" color="success.main">
                      Your Response
                    </Typography>
                    <Typography variant="body1">
                      {selectedAlert.parentResponse.response}
                    </Typography>
                    {selectedAlert.parentResponse.responseNote && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {selectedAlert.parentResponse.responseNote}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
              {!selectedAlert.parentResponse?.responded && (
                <Button
                  variant="contained"
                  startIcon={<Reply />}
                  onClick={() => handleOpenRespond(selectedAlert)}
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  }}
                >
                  Respond
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Respond Dialog */}
      <Dialog
        open={respondDialogOpen}
        onClose={() => setRespondDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Respond to Absence Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {selectedAlert && (
              <Typography variant="body2" color="text.secondary">
                Responding to absence alert for{" "}
                <strong>
                  {selectedAlert.student.firstName}{" "}
                  {selectedAlert.student.lastName}
                </strong>{" "}
                on {new Date(selectedAlert.date).toLocaleDateString()}
              </Typography>
            )}
            <FormControl fullWidth>
              <InputLabel>Your Response</InputLabel>
              <Select
                value={response}
                label="Your Response"
                onChange={(e) =>
                  setResponse(
                    e.target.value as "Acknowledged" | "Excused" | "Unexcused",
                  )
                }
              >
                <MenuItem value="Acknowledged">Acknowledged</MenuItem>
                <MenuItem value="Excused">Excused</MenuItem>
                <MenuItem value="Unexcused">Unexcused</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Additional Notes (Optional)"
              multiline
              rows={3}
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRespondDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitResponse}
            disabled={isSubmitting}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            }}
          >
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ParentAlertsPage;
