import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
  Collapse,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  School,
  CheckCircle,
  CalendarToday,
} from "@mui/icons-material";
import {
  academicYearService,
  type AcademicYear,
  type Semester,
} from "@/services/academicYearService";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const statuses = ["Planning", "Active", "Completed"] as const;
type AcademicYearStatus = (typeof statuses)[number];

interface AcademicYearFormData {
  year: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  notes: string;
  semesters: Semester[];
}

export function AcademicYearPage() {
  const theme = useTheme();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);

  const [formData, setFormData] = useState<AcademicYearFormData>({
    year: "",
    startDate: "",
    endDate: "",
    status: "Planning",
    notes: "",
    semesters: [
      { name: "Semester 1", startDate: "", endDate: "" },
      { name: "Semester 2", startDate: "", endDate: "" },
    ],
  });

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const response = await academicYearService.getAcademicYears();
      const typedResponse = response as {
        success: boolean;
        data: AcademicYear[];
      };
      if (typedResponse.success) {
        setYears(typedResponse.data);
      }
    } catch (error) {
      console.error("Failed to fetch academic years:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (year?: AcademicYear) => {
    if (year) {
      setEditingYear(year);
      setFormData({
        year: year.year,
        startDate: year.startDate.split("T")[0],
        endDate: year.endDate.split("T")[0],
        status: year.status,
        notes: year.notes || "",
        semesters: year.semesters.map((s) => ({
          ...s,
          startDate: s.startDate.split("T")[0],
          endDate: s.endDate.split("T")[0],
        })),
      });
    } else {
      setEditingYear(null);
      setFormData({
        year: "",
        startDate: "",
        endDate: "",
        status: "Planning",
        notes: "",
        semesters: [
          { name: "Semester 1", startDate: "", endDate: "" },
          { name: "Semester 2", startDate: "", endDate: "" },
        ],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingYear(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingYear) {
        await academicYearService.updateAcademicYear(editingYear.id, formData);
      } else {
        await academicYearService.createAcademicYear(formData);
      }
      fetchYears();
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to save academic year:", error);
    }
  };

  const handleDelete = (year: AcademicYear) => {
    setYearToDelete(year);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!yearToDelete) return;
    try {
      await academicYearService.deleteAcademicYear(yearToDelete.id);
      fetchYears();
    } catch (error) {
      console.error("Failed to delete academic year:", error);
    }
    setDeleteDialogOpen(false);
    setYearToDelete(null);
  };

  const handleSetActive = async (id: string) => {
    try {
      await academicYearService.setAsActive(id);
      fetchYears();
    } catch (error) {
      console.error("Failed to set academic year as active:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return theme.palette.success.main;
      case "Planning":
        return theme.palette.info.main;
      case "Completed":
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Academic Years
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage academic years and semesters
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Academic Year
        </Button>
      </Box>

      {/* Active Academic Year Banner */}
      {years.find((y) => y.isActive) && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.background.paper as string, 1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CheckCircle sx={{ color: theme.palette.success.main }} />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Active Academic Year: {years.find((y) => y.isActive)?.year}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {years.find((y) => y.isActive)?.status}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Academic Years List */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow
              sx={{ background: alpha(theme.palette.primary.main, 0.05) }}
            >
              <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Active</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : years.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No academic years found
                </TableCell>
              </TableRow>
            ) : (
              years.map((year) => (
                <React.Fragment key={year.id}>
                  <TableRow hover>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <School
                          sx={{
                            color: theme.palette.primary.main,
                            fontSize: 20,
                          }}
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {year.year}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(year.startDate).toLocaleDateString()} -{" "}
                        {new Date(year.endDate).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={year.status}
                        size="small"
                        sx={{
                          backgroundColor: alpha(
                            getStatusColor(year.status),
                            0.1,
                          ),
                          color: getStatusColor(year.status),
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {year.isActive ? (
                        <Chip
                          icon={<CheckCircle sx={{ fontSize: 16 }} />}
                          label="Active"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSetActive(year.id)}
                        >
                          Set Active
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(year)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedYear(
                            expandedYear === year.id ? null : year.id,
                          )
                        }
                      >
                        {expandedYear === year.id ? (
                          <ExpandLess />
                        ) : (
                          <ExpandMore />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(year)}
                        disabled={year.isActive}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                      <Collapse in={expandedYear === year.id}>
                        <Box sx={{ py: 2, px: 3 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            mb={2}
                          >
                            Semesters
                          </Typography>
                          <Grid container spacing={2}>
                            {year.semesters.map((semester) => (
                              <Grid
                                size={{ xs: 12, md: 6 }}
                                key={semester.name}
                              >
                                <Card
                                  variant="outlined"
                                  sx={{ borderRadius: 2 }}
                                >
                                  <CardContent>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mb: 1,
                                      }}
                                    >
                                      <CalendarToday
                                        sx={{
                                          fontSize: 18,
                                          color: theme.palette.primary.main,
                                        }}
                                      />
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={600}
                                      >
                                        {semester.name}
                                      </Typography>
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {new Date(
                                        semester.startDate,
                                      ).toLocaleDateString()}{" "}
                                      -{" "}
                                      {new Date(
                                        semester.endDate,
                                      ).toLocaleDateString()}
                                    </Typography>
                                    {semester.examPeriodStart && (
                                      <Typography
                                        variant="caption"
                                        display="block"
                                        color="text.secondary"
                                      >
                                        Exams:{" "}
                                        {new Date(
                                          semester.examPeriodStart,
                                        ).toLocaleDateString()}{" "}
                                        -{" "}
                                        {new Date(
                                          semester.examPeriodEnd!,
                                        ).toLocaleDateString()}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                          {year.notes && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              mt={2}
                            >
                              Notes: {year.notes}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingYear ? "Edit Academic Year" : "Add Academic Year"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Academic Year"
                placeholder="e.g., 2025-2026"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: e.target.value })
                }
                required
                helperText="Format: YYYY-YYYY"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Grid>

            {/* Semesters */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" fontWeight={600} mt={2} mb={1}>
                Semesters
              </Typography>
            </Grid>
            {formData.semesters.map((semester, index) => (
              <React.Fragment key={semester.name}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" fontWeight={500} color="primary">
                    {semester.name}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={semester.startDate}
                    onChange={(e) => {
                      const newSemesters = [...formData.semesters];
                      newSemesters[index].startDate = e.target.value;
                      setFormData({ ...formData, semesters: newSemesters });
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={semester.endDate}
                    onChange={(e) => {
                      const newSemesters = [...formData.semesters];
                      newSemesters[index].endDate = e.target.value;
                      setFormData({ ...formData, semesters: newSemesters });
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </React.Fragment>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingYear ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${yearToDelete?.year}? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
      />
    </Box>
  );
}

export default AcademicYearPage;
