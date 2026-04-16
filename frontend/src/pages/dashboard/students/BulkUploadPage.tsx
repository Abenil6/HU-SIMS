import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Upload,
} from "@mui/icons-material";
import { useBulkUploadStudents } from "@/hooks/students/useStudents";

interface UploadedStudent {
  row: number;
  firstName: string;
  lastName: string;
  email: string;
  grade: string;
  stream: string;
  status: "Success" | "Error";
  message?: string;
}

const sampleCSV = `firstName,lastName,email,grade,stream
John,Smith,john.smith@school.com,Grade 9,
Jane,Doe,jane.doe@school.com,Grade 10,
Abel,Kassa,abel.kassa@school.com,Grade 11,Natural
Marta,Lemma,marta.lemma@school.com,Grade 12,Social`;

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

const normalizeHeader = (header: string): string =>
  header.toLowerCase().trim().replace(/_/g, " ").replace(/\s+/g, " ");

const pick = (row: Record<string, string>, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
};

function parseCSV(text: string): Array<{ firstName: string; lastName: string; email: string; grade?: string; stream?: string }> {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(normalizeHeader);
  const rows: Array<{ firstName: string; lastName: string; email: string; grade?: string; stream?: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });

    const firstName = pick(row, ["first name", "firstname"]);
    const lastName = pick(row, ["last name", "lastname"]);
    const email = pick(row, ["email", "email address"]);
    const grade = pick(row, ["grade", "grade level", "class"]);
    const stream = pick(row, ["stream", "section"]);

    const isEmptyRow = !firstName && !lastName && !email && !grade && !stream;
    if (isEmptyRow) continue;

    rows.push({
      firstName,
      lastName,
      email,
      grade: grade || undefined,
      stream: stream || undefined,
    });
  }

  return rows;
}

export function BulkUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedStudents, setUploadedStudents] = useState<UploadedStudent[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");

  const bulkUpload = useBulkUploadStudents();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCSV], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!selectedFile || !grade) return;

    try {
      const text = await selectedFile.text();
      const students = parseCSV(text);
      if (students.length === 0) {
        return;
      }

      const defaultGrade = grade.startsWith("Grade") ? grade : `Grade ${grade}`;
      const numericGrade = defaultGrade.replace(/^Grade\s+/i, "").trim();
      const requiresStream = numericGrade === "11" || numericGrade === "12";
      const defaultStream = requiresStream ? stream || "Natural" : undefined;

      const result = await bulkUpload.mutateAsync({
        students,
        defaultGrade,
        defaultStream,
      });

      setUploadedStudents(
        (result.results || []).map((r: any) => ({
          row: r.row,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          grade: r.grade || defaultGrade,
          stream: r.stream || defaultStream || "",
          status: r.status,
          message: r.message,
        }))
      );
      setShowResults(true);
    } catch {
      // Error handled by hook
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setUploadedStudents([]);
    setSelectedFile(null);
  };

  const successCount = uploadedStudents.filter(
    (s) => s.status === "Success",
  ).length;
  const errorCount = uploadedStudents.filter(
    (s) => s.status === "Error",
  ).length;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Bulk Student Upload
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Upload multiple students at once using CSV file
      </Typography>

      <Paper sx={{ borderRadius: 3, p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Upload Steps
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                1. Select Grade and Stream (Grade 11-12 only)
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Grade</InputLabel>
                <Select
                  value={grade}
                  label="Grade"
                  onChange={(e) => setGrade(e.target.value)}
                >
                  <MenuItem value="Grade 9">Grade 9</MenuItem>
                  <MenuItem value="Grade 10">Grade 10</MenuItem>
                  <MenuItem value="Grade 11">Grade 11</MenuItem>
                  <MenuItem value="Grade 12">Grade 12</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={!["Grade 11", "Grade 12"].includes(grade)}>
                <InputLabel>Stream</InputLabel>
                <Select
                  value={stream}
                  label="Stream"
                  onChange={(e) => setStream(e.target.value)}
                >
                  <MenuItem value="Natural">Natural</MenuItem>
                  <MenuItem value="Social">Social</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                2. Download Template
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleDownloadTemplate}
              >
                Download CSV Template
              </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                3. Upload CSV File
              </Typography>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUpload />}
              >
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {selectedFile && (
                <Box
                  sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CheckCircle color="success" fontSize="small" />
                  <Typography variant="body2">{selectedFile.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Box>
              )}
            </Box>

            {bulkUpload.isPending && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Uploading...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={<Upload />}
              onClick={handleUpload}
              disabled={!selectedFile || !grade || bulkUpload.isPending}
              fullWidth
            >
              {bulkUpload.isPending ? "Uploading..." : "Upload Students"}
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                CSV Format Instructions
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Your CSV file should have the following columns:
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Column</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Required</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>firstName</TableCell>
                    <TableCell>Student's first name</TableCell>
                    <TableCell>
                      <Chip label="Yes" size="small" color="success" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>lastName</TableCell>
                    <TableCell>Student's last name</TableCell>
                    <TableCell>
                      <Chip label="Yes" size="small" color="success" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>email</TableCell>
                    <TableCell>Student's email address</TableCell>
                    <TableCell>
                      <Chip label="Yes" size="small" color="success" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>grade</TableCell>
                    <TableCell>Grade level (Grade 9-12)</TableCell>
                    <TableCell>
                      <Chip label="Optional" size="small" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>stream</TableCell>
                    <TableCell>Stream (Natural/Social) for Grade 11-12</TableCell>
                    <TableCell>
                      <Chip label="Optional" size="small" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Upload Results Dialog */}
      <Dialog
        open={showResults}
        onClose={handleCloseResults}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Results</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
            <Chip
              icon={<CheckCircle />}
              label={`${successCount} Success`}
              color="success"
            />
            <Chip
              icon={<Error />}
              label={`${errorCount} Errors`}
              color="error"
            />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Row</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Message</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uploadedStudents.map((student) => (
                <TableRow key={student.row}>
                  <TableCell>{student.row}</TableCell>
                  <TableCell>
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Chip
                      icon={
                        student.status === "Success" ? (
                          <CheckCircle />
                        ) : (
                          <Error />
                        )
                      }
                      label={student.status}
                      color={student.status === "Success" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{student.message || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResults}>Close</Button>
          <Button variant="contained" onClick={handleCloseResults}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
