import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { DeleteOutline, Description, PhotoCamera, UploadFile } from "@mui/icons-material";
import toast from "react-hot-toast";
import type {
  CreateAcademicDocumentInput,
  CreateStudentData,
} from "@/services/studentService";

const steps = [
  "Personal Information",
  "Contact Information",
  "Parent / Guardian Information",
  "Academic Information",
  "Enrollment Details",
];

type AcademicDocumentUpload = CreateAcademicDocumentInput & {
  fileName: string;
  fileType: string;
  fileSize: number;
};

type WizardFormState = {
  grade8MinistryResultDocuments: AcademicDocumentUpload[];
  previousGradeReportDocuments: AcademicDocumentUpload[];
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  gender: "" | "Male" | "Female";
  dob: string;
  placeOfBirthWoreda: string;
  placeOfBirthZone: string;
  placeOfBirthRegion: string;
  nationality: string;
  profileImage: string;
  phone: string;
  email: string;
  addressRegion: string;
  addressCity: string;
  addressSubCity: string;
  addressHouseNumber: string;
  primaryGuardianName: string;
  primaryGuardianRelationship: string;
  primaryGuardianPhone: string;
  primaryGuardianEmail: string;
  primaryGuardianOccupation: string;
  primaryGuardianAddress: string;
  secondaryGuardianName: string;
  secondaryGuardianRelationship: string;
  secondaryGuardianPhone: string;
  secondaryGuardianEmail: string;
  secondaryGuardianOccupation: string;
  secondaryGuardianAddress: string;
  grade: string;
  stream: string;
  previousSchoolName: string;
  previousGradeCompleted: string;
  entranceExamResult: string;
  admissionDate: string;
  academicYear: string;
  enrollmentType: "" | "New Admission" | "Transfer Student";
};

const defaultFormState: WizardFormState = {
  grade8MinistryResultDocuments: [],
  previousGradeReportDocuments: [],
  firstName: "",
  fatherName: "",
  grandfatherName: "",
  gender: "",
  dob: "",
  placeOfBirthWoreda: "",
  placeOfBirthZone: "",
  placeOfBirthRegion: "",
  nationality: "Ethiopian",
  profileImage: "",
  phone: "",
  email: "",
  addressRegion: "",
  addressCity: "",
  addressSubCity: "",
  addressHouseNumber: "",
  primaryGuardianName: "",
  primaryGuardianRelationship: "",
  primaryGuardianPhone: "",
  primaryGuardianEmail: "",
  primaryGuardianOccupation: "",
  primaryGuardianAddress: "",
  secondaryGuardianName: "",
  secondaryGuardianRelationship: "",
  secondaryGuardianPhone: "",
  secondaryGuardianEmail: "",
  secondaryGuardianOccupation: "",
  secondaryGuardianAddress: "",
  grade: "",
  stream: "",
  previousSchoolName: "",
  previousGradeCompleted: "",
  entranceExamResult: "",
  admissionDate: new Date().toISOString().split("T")[0],
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  enrollmentType: "",
};

const requiresStream = (grade: string) => grade === "11" || grade === "12";

const buildStudentPayload = (values: WizardFormState): CreateStudentData => {
  const lastName = [values.fatherName, values.grandfatherName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const addressParts = [
    values.addressSubCity,
    values.addressHouseNumber && `House ${values.addressHouseNumber}`,
  ].filter(Boolean);

  const secondaryGuardianProvided = [
    values.secondaryGuardianName,
    values.secondaryGuardianPhone,
    values.secondaryGuardianEmail,
    values.secondaryGuardianRelationship,
  ].some(Boolean);
  const academicDocuments = [
    ...values.grade8MinistryResultDocuments,
    ...values.previousGradeReportDocuments,
  ].map((document) => ({
    category: document.category,
    title: document.title,
    file: document.file,
  }));

  return {
    firstName: values.firstName.trim(),
    lastName,
    email: values.email.trim(),
    phone: values.phone.trim() || undefined,
    profileImage: values.profileImage || undefined,
    gender: values.gender || "Male",
    dob: values.dob,
    nationality: values.nationality.trim() || undefined,
    grandfatherName: values.grandfatherName.trim() || undefined,
    placeOfBirth:
      values.placeOfBirthWoreda ||
      values.placeOfBirthZone ||
      values.placeOfBirthRegion
        ? {
            woreda: values.placeOfBirthWoreda.trim() || undefined,
            zone: values.placeOfBirthZone.trim() || undefined,
            region: values.placeOfBirthRegion.trim() || undefined,
          }
        : undefined,
    grade: values.grade,
    stream: requiresStream(values.grade) ? values.stream : undefined,
    academicYear: values.academicYear.trim(),
    admissionDate: values.admissionDate,
    enrollmentType: values.enrollmentType || undefined,
    previousSchool: values.previousSchoolName.trim()
      ? {
          name: values.previousSchoolName.trim(),
        }
      : undefined,
    previousGradeCompleted: values.previousGradeCompleted.trim() || undefined,
    entranceExamResult: values.entranceExamResult.trim() || undefined,
    academicDocuments: academicDocuments.length > 0 ? academicDocuments : undefined,
    address:
      values.addressRegion ||
      values.addressCity ||
      values.addressSubCity ||
      values.addressHouseNumber
        ? {
            region: values.addressRegion.trim() || undefined,
            city: values.addressCity.trim() || undefined,
            street: addressParts.join(", ") || undefined,
          }
        : undefined,
    emergencyContact: {
      name: values.primaryGuardianName.trim(),
      phone: values.primaryGuardianPhone.trim(),
      relationship: values.primaryGuardianRelationship,
      email: values.primaryGuardianEmail.trim(),
    },
    primaryGuardian: {
      fullName: values.primaryGuardianName.trim(),
      relationship: values.primaryGuardianRelationship,
      phone: values.primaryGuardianPhone.trim(),
      email: values.primaryGuardianEmail.trim(),
      occupation: values.primaryGuardianOccupation.trim() || undefined,
      address: values.primaryGuardianAddress.trim() || undefined,
    },
    secondaryGuardian: secondaryGuardianProvided
      ? {
          fullName: values.secondaryGuardianName.trim() || undefined,
          relationship: values.secondaryGuardianRelationship || undefined,
          phone: values.secondaryGuardianPhone.trim() || undefined,
          email: values.secondaryGuardianEmail.trim() || undefined,
          occupation: values.secondaryGuardianOccupation.trim() || undefined,
          address: values.secondaryGuardianAddress.trim() || undefined,
        }
      : undefined,
  };
};

interface CreateStudentWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStudentData) => Promise<void>;
  loading?: boolean;
}

export function CreateStudentWizard({
  open,
  onClose,
  onSubmit,
  loading = false,
}: CreateStudentWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<WizardFormState>(defaultFormState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const grade8DocumentInputRef = useRef<HTMLInputElement | null>(null);
  const previousReportInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setValues(defaultFormState);
    }
  }, [open]);

  const setValue = <K extends keyof WizardFormState>(
    key: K,
    value: WizardFormState[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (): boolean => {
    if (activeStep === 0) {
      if (!values.firstName || !values.fatherName || !values.grandfatherName) {
        toast.error("Student first, father, and grandfather names are required");
        return false;
      }
      if (!values.gender || !values.dob) {
        toast.error("Gender and date of birth are required");
        return false;
      }
    }

    if (activeStep === 1) {
      if (!values.email) {
        toast.error("Student email is required");
        return false;
      }
      if (!values.addressRegion || !values.addressCity) {
        toast.error("Region and city/town are required");
        return false;
      }
    }

    if (activeStep === 2) {
      if (
        !values.primaryGuardianName ||
        !values.primaryGuardianRelationship ||
        !values.primaryGuardianPhone ||
        !values.primaryGuardianEmail
      ) {
        toast.error("Primary guardian name, relationship, phone, and email are required");
        return false;
      }

      const studentEmail = values.email.trim().toLowerCase();
      const primaryGuardianEmail = values.primaryGuardianEmail.trim().toLowerCase();
      const secondaryGuardianEmail = values.secondaryGuardianEmail.trim().toLowerCase();

      if (studentEmail && primaryGuardianEmail === studentEmail) {
        toast.error("Primary guardian email must be different from the student email");
        return false;
      }

      const secondaryStarted = [
        values.secondaryGuardianName,
        values.secondaryGuardianPhone,
        values.secondaryGuardianEmail,
        values.secondaryGuardianRelationship,
      ].some(Boolean);

      if (
        secondaryStarted &&
        (!values.secondaryGuardianName ||
          !values.secondaryGuardianRelationship ||
          !values.secondaryGuardianPhone ||
          !values.secondaryGuardianEmail)
      ) {
        toast.error("Complete all secondary guardian fields or leave them empty");
        return false;
      }

      if (studentEmail && secondaryGuardianEmail && secondaryGuardianEmail === studentEmail) {
        toast.error("Secondary guardian email must be different from the student email");
        return false;
      }
    }

    if (activeStep === 3) {
      if (!values.grade) {
        toast.error("Grade level is required");
        return false;
      }
      if (requiresStream(values.grade) && !values.stream) {
        toast.error("Stream is required for Grade 11 and Grade 12");
        return false;
      }
    }

    if (activeStep === 4) {
      if (!values.admissionDate || !values.academicYear || !values.enrollmentType) {
        toast.error("Admission date, academic year, and enrollment type are required");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setValue("profileImage", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const readAcademicFiles = async (
    files: FileList | null,
    category: AcademicDocumentUpload["category"],
  ): Promise<AcademicDocumentUpload[]> => {
    if (!files?.length) return [];

    const acceptedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const maxFileSize = 5 * 1024 * 1024;

    return Array.from(files).map((file) => {
      if (!acceptedMimeTypes.includes(file.type)) {
        throw new Error(
          `${file.name} is not supported. Upload PDF, JPG, PNG, or WEBP files.`,
        );
      }

      if (file.size > maxFileSize) {
        throw new Error(`${file.name} exceeds the 5 MB size limit.`);
      }

      return {
        category,
        title: file.name.replace(/\.[^.]+$/, ""),
        file,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };
    });
  };

  const handleAcademicDocumentChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "grade8MinistryResultDocuments" | "previousGradeReportDocuments",
    category: AcademicDocumentUpload["category"],
    replaceExisting = false,
  ) => {
    try {
      const documents = await readAcademicFiles(event.target.files, category);
      if (documents.length === 0) return;

      setValues((prev) => ({
        ...prev,
        [field]: replaceExisting ? documents.slice(0, 1) : [...prev[field], ...documents],
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add academic document");
    } finally {
      event.target.value = "";
    }
  };

  const removeAcademicDocument = (
    field: "grade8MinistryResultDocuments" | "previousGradeReportDocuments",
    index: number,
  ) => {
    setValues((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleFinalSubmit = async () => {
    if (!validateStep()) return;
    await onSubmit(buildStudentPayload(values));
  };

  const renderPersonalStep = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="First Name"
          value={values.firstName}
          onChange={(e) => setValue("firstName", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Father's Name"
          value={values.fatherName}
          onChange={(e) => setValue("fatherName", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Grandfather's Name"
          value={values.grandfatherName}
          onChange={(e) => setValue("grandfatherName", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Gender</InputLabel>
          <Select
            label="Gender"
            value={values.gender}
            onChange={(e) => setValue("gender", e.target.value as "Male" | "Female")}
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Date of Birth"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={values.dob}
          onChange={(e) => setValue("dob", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Nationality"
          value={values.nationality}
          onChange={(e) => setValue("nationality", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Place of Birth - Woreda"
          value={values.placeOfBirthWoreda}
          onChange={(e) => setValue("placeOfBirthWoreda", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Place of Birth - Zone"
          value={values.placeOfBirthZone}
          onChange={(e) => setValue("placeOfBirthZone", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Place of Birth - Region"
          value={values.placeOfBirthRegion}
          onChange={(e) => setValue("placeOfBirthRegion", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar src={values.profileImage} sx={{ width: 64, height: 64 }} />
          <Box>
            <Button
              variant="outlined"
              startIcon={<PhotoCamera />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoChange}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Optional
            </Typography>
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  const renderContactStep = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Student Phone Number"
          value={values.phone}
          onChange={(e) => setValue("phone", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={values.email}
          onChange={(e) => setValue("email", e.target.value)}
          helperText="Used to send the password setup email"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Region"
          value={values.addressRegion}
          onChange={(e) => setValue("addressRegion", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="City / Town"
          value={values.addressCity}
          onChange={(e) => setValue("addressCity", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Sub-city / Kebele"
          value={values.addressSubCity}
          onChange={(e) => setValue("addressSubCity", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="House Number"
          value={values.addressHouseNumber}
          onChange={(e) => setValue("addressHouseNumber", e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderGuardianFields = (
    prefix: "primaryGuardian" | "secondaryGuardian",
    optional = false,
  ) => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Full Name"
          value={values[`${prefix}Name` as keyof WizardFormState] as string}
          onChange={(e) =>
            setValue(`${prefix}Name` as keyof WizardFormState, e.target.value as never)
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>Relationship</InputLabel>
          <Select
            label="Relationship"
            value={values[`${prefix}Relationship` as keyof WizardFormState] as string}
            onChange={(e) =>
              setValue(
                `${prefix}Relationship` as keyof WizardFormState,
                e.target.value as never,
              )
            }
          >
            <MenuItem value="Father">Father</MenuItem>
            <MenuItem value="Mother">Mother</MenuItem>
            <MenuItem value="Guardian">Guardian</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Phone Number"
          value={values[`${prefix}Phone` as keyof WizardFormState] as string}
          onChange={(e) =>
            setValue(`${prefix}Phone` as keyof WizardFormState, e.target.value as never)
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={values[`${prefix}Email` as keyof WizardFormState] as string}
          onChange={(e) =>
            setValue(`${prefix}Email` as keyof WizardFormState, e.target.value as never)
          }
          helperText={
            prefix === "primaryGuardian"
              ? "A parent account will be created or linked using this email"
              : "Optional parent account email for the secondary guardian"
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Occupation"
          value={values[`${prefix}Occupation` as keyof WizardFormState] as string}
          onChange={(e) =>
            setValue(
              `${prefix}Occupation` as keyof WizardFormState,
              e.target.value as never,
            )
          }
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label={optional ? "Address (if different)" : "Address"}
          value={values[`${prefix}Address` as keyof WizardFormState] as string}
          onChange={(e) =>
            setValue(`${prefix}Address` as keyof WizardFormState, e.target.value as never)
          }
        />
      </Grid>
    </Grid>
  );

  const renderGuardianStep = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="body2" color="text.secondary">
        Guardian emails are used to create or link parent portal accounts automatically.
      </Typography>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Primary Guardian
        </Typography>
        {renderGuardianFields("primaryGuardian")}
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Secondary Guardian
        </Typography>
        {renderGuardianFields("secondaryGuardian", true)}
      </Box>
    </Box>
  );

  const renderAcademicStep = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Grade Level</InputLabel>
          <Select
            label="Grade Level"
            value={values.grade}
            onChange={(e) => {
              const nextGrade = e.target.value;
              setValue("grade", nextGrade);
              if (!requiresStream(nextGrade)) {
                setValue("stream", "");
              }
            }}
          >
            <MenuItem value="9">Grade 9</MenuItem>
            <MenuItem value="10">Grade 10</MenuItem>
            <MenuItem value="11">Grade 11</MenuItem>
            <MenuItem value="12">Grade 12</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth disabled={!requiresStream(values.grade)}>
          <InputLabel>Stream</InputLabel>
          <Select
            label="Stream"
            value={values.stream}
            onChange={(e) => setValue("stream", e.target.value)}
          >
            <MenuItem value="Natural">Natural Science</MenuItem>
            <MenuItem value="Social">Social Science</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Previous Grade Completed"
          value={values.previousGradeCompleted}
          onChange={(e) => setValue("previousGradeCompleted", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Previous School Name"
          value={values.previousSchoolName}
          onChange={(e) => setValue("previousSchoolName", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Entrance Exam Result"
          value={values.entranceExamResult}
          onChange={(e) => setValue("entranceExamResult", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            height: "100%",
          }}
        >
          <Typography variant="subtitle2">Grade 8 Ministry Result</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload one PDF or image file.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<UploadFile />}
            onClick={() => grade8DocumentInputRef.current?.click()}
          >
            Add Ministry Result
          </Button>
          <input
            ref={grade8DocumentInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) =>
              handleAcademicDocumentChange(
                event,
                "grade8MinistryResultDocuments",
                "Grade 8 Ministry Result",
                true,
              )
            }
          />
          {values.grade8MinistryResultDocuments.map((document, index) => (
            <Box
              key={`${document.fileName}-${index}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                backgroundColor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Description fontSize="small" color="action" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {document.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(Number(document.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutline />}
                onClick={() => removeAcademicDocument("grade8MinistryResultDocuments", index)}
              >
                Remove
              </Button>
            </Box>
          ))}
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            height: "100%",
          }}
        >
          <Typography variant="subtitle2">Previous Grade Reports</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload one or more report cards as PDF or image files.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<UploadFile />}
            onClick={() => previousReportInputRef.current?.click()}
          >
            Add Previous Reports
          </Button>
          <input
            ref={previousReportInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(event) =>
              handleAcademicDocumentChange(
                event,
                "previousGradeReportDocuments",
                "Previous Grade Report",
              )
            }
          />
          {values.previousGradeReportDocuments.map((document, index) => (
            <Box
              key={`${document.fileName}-${index}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                backgroundColor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Description fontSize="small" color="action" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {document.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(Number(document.fileSize || 0) / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutline />}
                onClick={() => removeAcademicDocument("previousGradeReportDocuments", index)}
              >
                Remove
              </Button>
            </Box>
          ))}
        </Box>
      </Grid>
    </Grid>
  );

  const renderEnrollmentStep = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Admission Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={values.admissionDate}
          onChange={(e) => setValue("admissionDate", e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Academic Year"
          value={values.academicYear}
          onChange={(e) => setValue("academicYear", e.target.value)}
          helperText="Example: 2018 E.C / 2025-2026 G.C"
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Enrollment Type</InputLabel>
          <Select
            label="Enrollment Type"
            value={values.enrollmentType}
            onChange={(e) =>
              setValue(
                "enrollmentType",
                e.target.value as "New Admission" | "Transfer Student",
              )
            }
          >
            <MenuItem value="New Admission">New Admission</MenuItem>
            <MenuItem value="Transfer Student">Transfer Student</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPersonalStep();
      case 1:
        return renderContactStep();
      case 2:
        return renderGuardianStep();
      case 3:
        return renderAcademicStep();
      case 4:
        return renderEnrollmentStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Student</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStepContent()}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleBack} disabled={activeStep === 0 || loading}>
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={handleFinalSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Student"}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
