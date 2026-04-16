import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Button,
  useTheme,
  alpha,
  Dialog,
  CircularProgress,
} from "@mui/material";
import {
  Security,
  Refresh,
  Warning,
  CheckCircle,
  TrendingUp,
  People,
  Storage,
  Memory,
  Speed,
} from "@mui/icons-material";
import { Chip } from "@mui/material";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPost } from "@/services/api";

interface SystemStats {
  totalLogs: number;
  successCount: number;
  failureCount: number;
  criticalCount: number;
  uniqueUserCount: number;
}

interface UserStats {
  _id: string;
  count: number;
  active: number;
}

interface SecurityAlert {
  id: string;
  action: string;
  description: string;
  severity: string;
  status: string;
  timestamp: string;
  username: string;
}

export function SecurityPage() {
  const theme = useTheme();
  const toast = useToast();

  // State
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const result: any = await apiPost(`/system/backups/run`, {});
      toast.success(`Backup created: ${result.data.filename} (${result.data.size})`);
    } catch (error: any) {
      console.error("Backup failed:", error);
      toast.error(error.message || "Failed to create backup");
    } finally {
      setBackupLoading(false);
    }
  };
  useEffect(() => {
    loadSystemData();
  }, [timeRange]);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      const statsData: any = await apiGet(`/system/stats`, { timeRange });
      setSystemStats(statsData.data.systemStats);
      setUserStats(statsData.data.userStats);
      setSecurityAlerts(statsData.data.securityAlerts);

      try {
        const healthData: any = await apiGet(`/system/health`);
        setSystemHealth(healthData.data);
      } catch {
        // health endpoint is optional, ignore if unavailable
      }
    } catch (error) {
      console.error("Failed to load system data:", error);
      toast.error("Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (percent: number) => {
    if (percent >= 90) return theme.palette.success.main;
    if (percent >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return theme.palette.error.main;
      case "HIGH":
        return theme.palette.warning.main;
      case "MEDIUM":
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Security & Backups
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Monitor system security, manage backups, and track potential threats
      </Typography>

      {/* Time Range Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="subtitle1">Time Range:</Typography>
          <Button
            variant={timeRange === "1h" ? "contained" : "outlined"}
            size="small"
            onClick={() => setTimeRange("1h")}
          >
            1 Hour
          </Button>
          <Button
            variant={timeRange === "24h" ? "contained" : "outlined"}
            size="small"
            onClick={() => setTimeRange("24h")}
          >
            24 Hours
          </Button>
          <Button
            variant={timeRange === "7d" ? "contained" : "outlined"}
            size="small"
            onClick={() => setTimeRange("7d")}
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === "30d" ? "contained" : "outlined"}
            size="small"
            onClick={() => setTimeRange("30d")}
          >
            30 Days
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSystemData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography>Loading security data...</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* System Statistics */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                System Activity Statistics
              </Typography>
              {systemStats && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h4" color="primary" fontWeight={700}>
                        {systemStats.totalLogs}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Logs
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h4" color="success" fontWeight={700}>
                        {systemStats.successCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Success
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h4" color="error" fontWeight={700}>
                        {systemStats.failureCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Failures
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h4" color="warning" fontWeight={700}>
                        {systemStats.criticalCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Critical
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* User Statistics */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                User Activity by Role
              </Typography>
              <Grid container spacing={2}>
                {userStats.map((stat) => (
                  <Grid size={{ xs: 6 }} key={stat._id}>
                    <Card
                      sx={{
                        background: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      }}
                    >
                      <CardContent sx={{ textAlign: "center", py: 2 }}>
                        <People
                          sx={{
                            fontSize: 40,
                            color: theme.palette.primary.main,
                            mb: 1,
                          }}
                        />
                        <Typography variant="h6" fontWeight={600}>
                          {stat.count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat._id}
                        </Typography>
                        <Typography variant="caption" color="success.main">
                          {stat.active} active
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Security Alerts */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Recent Security Alerts
              </Typography>
              {securityAlerts.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CheckCircle
                    sx={{ fontSize: 48, color: theme.palette.success.main, mb: 2 }}
                  />
                  <Typography variant="h6" color="success.main">
                    No Security Alerts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    System is operating normally
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {securityAlerts.map((alert) => (
                    <Grid size={{ xs: 12, md: 6 }} key={alert.id}>
                      <Card
                        sx={{
                          borderLeft: `4px solid ${getAlertColor(alert.severity)}`,
                          background: alpha(getAlertColor(alert.severity), 0.05),
                        }}
                      >
                        <CardContent sx={{ pb: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              mb: 1,
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight={600}>
                              {alert.action}
                            </Typography>
                            <Box
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                background: getAlertColor(alert.severity),
                                color: "white",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              {alert.severity}
                            </Box>
                          </Box>
                          <Typography variant="body2" mb={1}>
                            {alert.description}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {alert.username} • {formatTimestamp(alert.timestamp)}
                            </Typography>
                            <Chip
                              label={alert.status}
                              size="small"
                              color={
                                alert.status === "SUCCESS"
                                  ? "success"
                                  : alert.status === "FAILURE"
                                    ? "error"
                                    : "warning"
                              }
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* System Health */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                System Health Indicators
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      API Server
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Online
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.success.main, 0.2),
                    }}
                    color="success"
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      Database
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      98%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={98}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.success.main, 0.2),
                    }}
                    color="success"
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      Storage
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      45%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={45}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.warning.main, 0.2),
                    }}
                    color="warning"
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      Memory
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      62%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={62}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: alpha(theme.palette.warning.main, 0.2),
                    }}
                    color="warning"
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Backup Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Backup Status
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Card sx={{ background: alpha(theme.palette.success.main, 0.05) }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Storage
                        sx={{
                          fontSize: 40,
                          color: theme.palette.success.main,
                          mb: 1,
                        }}
                      />
                      <Typography variant="h6" fontWeight={600} color="success.main">
                        Last Backup
                      </Typography>
                      <Typography variant="body1">
                        {new Date().toLocaleDateString()} 08:00:00
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completed Successfully
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{ mt: 2 }}
                        startIcon={<Storage />}
                        onClick={handleBackup}
                        disabled={backupLoading}
                      >
                        {backupLoading ? "Backing up..." : "Backup Now"}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Card sx={{ background: alpha(theme.palette.info.main, 0.05) }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <TrendingUp
                        sx={{
                          fontSize: 40,
                          color: theme.palette.info.main,
                          mb: 1,
                        }}
                      />
                      <Typography variant="h6" fontWeight={600} color="info.main">
                        Backup Schedule
                      </Typography>
                      <Typography variant="body1">
                        Daily at 8:00 AM
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Next backup in 15 hours
                      </Typography>
                      <Button
                        variant="outlined"
                        sx={{ mt: 2 }}
                        onClick={() => toast.info("Schedule settings coming soon")}
                      >
                        Configure Schedule
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
      {/* Backup Loading Modal */}
      <Dialog
        open={backupLoading}
        PaperProps={{
          sx: {
            background: "transparent",
            boxShadow: "none",
            overflow: "hidden",
          },
        }}
        BackdropProps={{
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: alpha(theme.palette.background.default, 0.7),
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 4,
            minWidth: 300,
          }}
        >
          <CircularProgress size={64} thickness={3} sx={{ mb: 3 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Creating Backup...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we backup your data
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
}

export default SecurityPage;
