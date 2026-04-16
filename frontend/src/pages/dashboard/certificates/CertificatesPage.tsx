import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  alpha,
  useTheme,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  LinearProgress,
} from "@mui/material";
import {
  Add,
  Download,
  Print,
  Visibility,
  Edit,
  Delete,
  Search,
  Description,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { PageHeader, Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatsCard } from "@/components/ui/StatsCard";
import { FormModal } from "@/components/ui/FormModal";
import type { FormField } from "@/components/ui/FormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import {
  certificateService,
  type CertificateType,
  getCertificateTypeLabel,
  getCertificateStatusLabel,
} from "@/services/certificateService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/services/api";

const certificateTypes: { value: CertificateType; label: string }[] = [
  { value: "Completion", label: "Completion Certificate" },
  { value: "Transfer", label: "Transfer Certificate" },
  { value: "Character", label: "Character Certificate" },
  { value: "Bonafide", label: "Bonafide Certificate" },
];

const statusColors: Record<
  string,
  "success" | "warning" | "error" | "default"
> = {
  Draft: "warning",
  Issued: "success",
  Cancelled: "error",
  Replaced: "default",
};

export function CertificatesPage() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    academicYear: "2026",
  });
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] =
    useState<any | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const certificatesQuery = useQuery({
    queryKey: ["certificates", "list", filters],
    queryFn: () =>
      certificateService.getCertificates({
        certificateType: (filters.type || undefined) as any,
        status: (filters.status || undefined) as any,
        academicYear: filters.academicYear || undefined,
        page: 1,
        limit: 200,
      }),
    staleTime: 60 * 1000,
  });

  const studentsQuery = useQuery({
    queryKey: ["users", "students", "for-certificates"],
    queryFn: () => apiGet<any>("/admin/users?role=Student&limit=200&page=1"),
    staleTime: 5 * 60 * 1000,
  });

  const certificates: any[] = certificatesQuery.data?.certificates || [];
  const students: any[] = studentsQuery.data?.data || studentsQuery.data || [];

  // Stats
  const stats = useMemo(() => {
    return {
      total: certificates.length,
      issued: certificates.filter((c) => c.status === "Issued").length,
      draft: certificates.filter((c) => c.status === "Draft").length,
      cancelled: certificates.filter((c) => c.status === "Cancelled").length,
    };
  }, [certificates]);

  // Filter certificates
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      if (
        search &&
        !String(c.recipientName || "")
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        !String(c.certificateNumber || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      if (filters.type && c.certificateType !== filters.type) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (activeTab === 1 && c.status !== "Issued") return false;
      if (activeTab === 2 && c.status !== "Draft") return false;
      return true;
    });
  }, [certificates, search, filters, activeTab]);

  // Table columns
  const columns: Column<any>[] = useMemo(
    () => [
      {
        id: "certificateNumber",
        label: "Certificate #",
        format: (_, row) => (
          <Typography variant="body2" fontWeight={500}>
            {row.certificateNumber || "--"}
          </Typography>
        ),
      },
      {
        id: "certificateType",
        label: "Type",
        format: (value) => (
          <Chip
            label={getCertificateTypeLabel(value as CertificateType)}
            size="small"
            sx={{ textTransform: "capitalize" }}
          />
        ),
      },
      {
        id: "recipientName",
        label: "Student",
        format: (_, row) => (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.recipientName ||
                `${row.student?.firstName || ""} ${row.student?.lastName || ""}`.trim() ||
                "--"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.student?._id || "--"}
            </Typography>
          </Box>
        ),
      },
      {
        id: "gradeStream",
        label: "Grade/Stream",
        format: (_, row) => {
          const grade = row.completionDetails?.grade || "--";
          const stream = row.completionDetails?.section;
          return stream ? `Grade ${grade} - ${stream}` : `Grade ${grade}`;
        },
      },
      {
        id: "issueDate",
        label: "Issue Date",
        format: (value) =>
          value ? new Date(value as string).toLocaleDateString() : "--",
      },
      {
        id: "status",
        label: "Status",
        format: (value) => (
          <Chip
            label={getCertificateStatusLabel(value as string)}
            size="small"
            color={statusColors[value as string] || "default"}
          />
        ),
      },
      {
        id: "actions",
        label: "Actions",
        format: (_, row) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={() => {
                setSelectedCertificate(row);
                setPreviewOpen(true);
              }}
            >
              View
            </Button>
            <Button
              size="small"
              startIcon={<Download />}
              onClick={() => toast.success("Export is not wired yet")}
            >
              PDF
            </Button>
            {row.status !== "Cancelled" && (
              <Button
                size="small"
                color="error"
                startIcon={<Delete />}
                onClick={() => {
                  setSelectedCertificate(row);
                  setCancelDialogOpen(true);
                }}
              >
                Cancel
              </Button>
            )}
          </Box>
        ),
      },
    ],
    [],
  );

  const studentOptions = students.map((s) => ({
    value: s._id || s.id,
    label:
      `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
      s.email ||
      s.username ||
      (s._id || s.id),
  }));

  const formFields: FormField[] = [
    {
      name: "type",
      label: "Certificate Type",
      type: "select",
      required: true,
      options: certificateTypes,
    },
    {
      name: "studentId",
      label: "Student",
      type: "select",
      required: true,
      options: studentOptions,
    },
    {
      name: "purpose",
      label: "Purpose",
      type: "text",
      placeholder: "e.g., School Transfer, Visa Application",
    },
    {
      name: "academicYear",
      label: "Academic Year",
      type: "select",
      required: true,
      options: [
        { value: "2026", label: "2026" },
        { value: "2025", label: "2025" },
        { value: "2024", label: "2024" },
      ],
    },
  ];

  const handleCreate = () => {
    setSelectedCertificate(null);
    setFormModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const studentId = values.studentId as string;
      const student = students.find((s) => (s._id || s.id) === studentId);
      const recipientName =
        `${student?.firstName || ""} ${student?.lastName || ""}`.trim() ||
        "Student";

      return certificateService.createCertificate({
        certificateType: values.type as CertificateType,
        studentId,
        academicYear: values.academicYear as string,
        title: `${values.type} Certificate`,
        recipientName,
        notes: values.purpose as string,
      } as any);
    },
    onSuccess: async () => {
      toast.success("Certificate created");
      setFormModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create certificate"),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCertificate?._id) throw new Error("Missing certificate id");
      return certificateService.deleteCertificate(selectedCertificate._id);
    },
    onSuccess: async () => {
      toast.success("Certificate cancelled");
      setCancelDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to cancel certificate"),
  });

  return (
    <Box>
      <Breadcrumbs items={[{ label: "Certificates" }]} />

      <PageHeader
        title="Certificate Management"
        subtitle="Generate and manage student certificates"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreate}
          >
            New Certificate
          </Button>
        }
      />

      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <StatsCard
          title="Total"
          value={stats.total}
          icon={<Description />}
          color="primary"
        />
        <StatsCard
          title="Issued"
          value={stats.issued}
          icon={<Print />}
          color="success"
        />
        <StatsCard
          title="Drafts"
          value={stats.draft}
          icon={<Edit />}
          color="warning"
        />
        <StatsCard
          title="Cancelled"
          value={stats.cancelled}
          icon={<Delete />}
          color="error"
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label="All Certificates" />
          <Tab label="Issued" />
          <Tab label="Drafts" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            placeholder="Search by student name or certificate #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <Search sx={{ mr: 1, color: "text.secondary" }} />
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          <TextField
            select
            size="small"
            label="Type"
            value={filters.type}
            onChange={(e) =>
              setFilters((p) => ({ ...p, type: e.target.value }))
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Types</MenuItem>
            {certificateTypes.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={filters.status}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value }))
            }
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="Issued">Issued</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* Certificates Table */}
      <Paper sx={{ borderRadius: 3 }}>
        <DataTable
          columns={columns}
          rows={filteredCertificates}
          onRowClick={(row) => {
            setSelectedCertificate(row);
            setPreviewOpen(true);
          }}
        />
      </Paper>

      {/* Create/Edit Modal */}
      <FormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="Create Certificate"
        fields={formFields}
        initialValues={{
          type: "",
          studentId: "",
          purpose: "",
          academicYear: "2026",
        }}
        onSubmit={(vals) => createMutation.mutate(vals)}
        submitText={createMutation.isPending ? "Creating..." : "Create"}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel Certificate"
        message="Are you sure you want to cancel this certificate?"
        confirmText={cancelMutation.isPending ? "Cancelling..." : "Cancel Certificate"}
        severity="error"
      />
    </Box>
  );
}
