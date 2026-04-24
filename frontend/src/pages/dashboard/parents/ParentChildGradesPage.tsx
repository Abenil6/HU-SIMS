import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
  Button,
  CircularProgress,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { TrendingUp, Assessment, CalendarToday } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { getStatus } from "@/services/academicService";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";

interface Grade {
  subject: string;
  midExam: number;
  finalExam: number;
  assignment: number;
  classQuiz: number;
  continuousAssessment: number;
  total: number;
  percentage: number;
  semester: string;
  academicYear: string;
}

export function ParentChildGradesPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { childId } = useParams<{ childId: string }>();
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Fetch child information
  const { data: childData, isLoading: isLoadingChild } = useQuery({
    queryKey: ["parent", "child", childId],
    queryFn: () => apiGet<any>(`/parents/children/${childId}`),
    enabled: Boolean(childId),
  });

  const child = childData?.data || childData;

  // Fetch child grades
  const actualChildId = child?._id || childId;
  const { data: gradesData, isLoading: isLoadingGrades, refetch } = useQuery({
    queryKey: ["parent", "child", actualChildId, "grades", selectedSemester, selectedYear],
    queryFn: () => apiGet<any>(`/parents/children/${actualChildId}/grades`, {
      semester: selectedSemester,
      academicYear: selectedYear,
    }),
    enabled: Boolean(actualChildId),
  });

  const grades = useMemo((): Grade[] => {
    const records = Array.isArray(gradesData?.data?.grades)
      ? gradesData.data.grades
      : Array.isArray(gradesData?.data)
      ? gradesData.data
      : Array.isArray(gradesData)
      ? gradesData
      : [];

    const approvedRecords = records.filter((r: any) => 
      r?.status === "Approved" || r?.status === "Submitted"
    );

    const subjectMap = new Map<string, Grade>();

    approvedRecords.forEach((record: any) => {
      const subject = String(record?.subject || "");
      const semester = String(record?.semester || "");
      const academicYear = String(record?.academicYear || "");
      
      const midExam = Number(record?.marks?.midExam ?? 0);
      const finalExam = Number(record?.marks?.finalExam ?? 0);
      const assignment = Number(record?.marks?.assignment ?? 0);
      const classQuiz = Number(record?.marks?.classQuiz ?? 0);
      const continuousAssessment = Number(record?.marks?.continuousAssessment ?? 0);
      const totalMarks = midExam + finalExam + assignment + classQuiz + continuousAssessment;

      const key = `${subject}-${semester}-${academicYear}`;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subject,
          midExam,
          finalExam,
          assignment,
          classQuiz,
          continuousAssessment,
          total: totalMarks,
          percentage: Math.round((totalMarks / 110) * 100),
          semester,
          academicYear,
        });
      }
    });

    return Array.from(subjectMap.values());
  }, [gradesData]);

  const filteredGrades = useMemo(() => {
    return grades.filter((g: Grade) => {
      if (selectedYear && String(g.academicYear || "").trim() !== String(selectedYear).trim()) {
        return false;
      }
      if (selectedSemester && String(g.semester || "").trim() !== String(selectedSemester).trim()) {
        return false;
      }
      return true;
    });
  }, [grades, selectedSemester, selectedYear]);

  const stats = useMemo(() => {
    if (filteredGrades.length === 0)
      return { average: 0, highest: 0, lowest: 0, passed: 0, failed: 0 };
    const percentages = filteredGrades.map((g: Grade) => g.percentage);
    const passed = filteredGrades.filter(
      (g) => getStatus(g.percentage) === "passed",
    ).length;
    return {
      average: Math.round(
        percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length,
      ),
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      passed,
      failed: filteredGrades.length - passed,
    };
  }, [filteredGrades]);

  // Get unique years and semesters for filters
  const availableYears = useMemo(() => {
    const years = new Set(grades.map((g) => g.academicYear).filter(Boolean));
    return Array.from(years).sort();
  }, [grades]);

  const availableSemesters = useMemo(() => {
    const semesters = new Set(grades.map((g) => g.semester).filter(Boolean));
    return Array.from(semesters).sort();
  }, [grades]);

  if (isLoadingChild) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs items={[
        { label: t('parent.parent'), path: "/parent/dashboard" },
        { label: t('parent.childGrades') }
      ]} />

      <PageHeader
        title={`${child?.firstName || ""} ${child?.lastName || ""} - ${t('parent.academicProgress')}`}
        subtitle={t('parent.trackPerformance', { name: child?.firstName || t('parent.parent') })}
      />

      {/* Child Info Card */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" fontWeight={600}>
              {child?.firstName} {child?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('parent.gradeLevel')}: {child?.studentProfile?.grade || "N/A"}
              {child?.studentProfile?.stream && ` - ${child.studentProfile.stream}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('parent.studentId')}: {child?.studentProfile?.studentId || "N/A"}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              {t('parent.academicYear')}: {selectedYear || t('parent.allYears')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('parent.semester')}: {selectedSemester || t('parent.allSemesters')}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title={t('parent.overallAverage')}
          value={`${stats.average}%`}
          icon={<TrendingUp />}
          color="primary"
        />
        <StatsCard
          title={t('parent.highestScore')}
          value={`${stats.highest}%`}
          icon={<TrendingUp />}
          color="success"
        />
        <StatsCard
          title={t('parent.lowestScore')}
          value={`${stats.lowest}%`}
          icon={<Assessment />}
          color="warning"
        />
        <StatsCard
          title={t('parent.passed')}
          value={stats.passed}
          icon={<Assessment />}
          color="success"
        />
        <StatsCard
          title={t('parent.failed')}
          value={stats.failed}
          icon={<Assessment />}
          color="error"
        />
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('parent.filters')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('parent.filterPerformance')}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>{t('parent.academicYear')}</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              label={t('parent.academicYear')}
            >
              <MenuItem value="">{t('parent.allYears')}</MenuItem>
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>{t('parent.semester')}</InputLabel>
            <Select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              label={t('parent.semester')}
            >
              <MenuItem value="">{t('parent.allSemesters')}</MenuItem>
              {availableSemesters.map((semester) => (
                <MenuItem key={semester} value={semester}>
                  {semester}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={() => refetch()}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Paper>

      {/* Grades Table */}
      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{ background: alpha(theme.palette.primary.main, 0.05) }}
              >
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.subject')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.mid')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.final')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.assignment')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.quiz')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.continuous')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.total')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.percentage')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{t('parent.letterGrade')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.semester')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('parent.year')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingGrades ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : filteredGrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography color="text.secondary">
                      {t('parent.noGradesEntered')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGrades.map((row) => (
                  <TableRow
                    key={`${row.subject}-${row.semester}-${row.academicYear}`}
                    sx={{ "&:hover": { background: alpha(theme.palette.primary.main, 0.02) } }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{row.subject}</TableCell>
                    <TableCell align="center">{row.midExam > 0 ? `${row.midExam}/20` : "-"}</TableCell>
                    <TableCell align="center">{row.finalExam > 0 ? `${row.finalExam}/40` : "-"}</TableCell>
                    <TableCell align="center">{row.assignment > 0 ? `${row.assignment}/20` : "-"}</TableCell>
                    <TableCell align="center">{row.classQuiz > 0 ? `${row.classQuiz}/20` : "-"}</TableCell>
                    <TableCell align="center">{row.continuousAssessment > 0 ? `${row.continuousAssessment}/10` : "-"}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>{row.total}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color:
                            row.percentage >= 90
                              ? theme.palette.success.main
                              : row.percentage >= 80
                                ? theme.palette.info.main
                                : row.percentage >= 70
                                  ? theme.palette.warning.main
                                  : row.percentage >= 60
                                    ? theme.palette.warning.dark
                                    : theme.palette.error.main,
                        }}
                      >
                        {row.percentage}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getStatus(row.percentage) === "passed" ? t('parent.pass') : t('parent.fail')}
                        color={getStatus(row.percentage) === "passed" ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{row.semester}</TableCell>
                    <TableCell>{row.academicYear}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
