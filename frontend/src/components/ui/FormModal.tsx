import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Slide,
  alpha,
  useTheme,
  TextField,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  FormHelperText,
  ListSubheader,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import type { TransitionProps } from "@mui/material/transitions";

const Transition = React.forwardRef<
  HTMLDivElement,
  TransitionProps & { children: React.ReactElement<unknown, string> }
>(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export interface FormField {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "select"
    | "multiselect"
    | "textarea"
    | "date"
    | "file"
    | "checkbox"
    | "radio";
  options?: Array<{ value: string | number; label: string; group?: string }>;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  accept?: string;
  helperText?: string;
}

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onValuesChange?: (values: Record<string, unknown>) => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
  readOnly?: boolean;
}

export function FormModal({
  open,
  onClose,
  title,
  fields,
  initialValues,
  onSubmit,
  onValuesChange,
  submitText = "Submit",
  cancelText = "Cancel",
  loading = false,
  maxWidth = "sm",
  children,
  readOnly = false,
}: FormModalProps) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const handleChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  const handleClose = () => {
    setValues(initialValues);
    onClose();
  };

  const handleDialogClose = (
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) => {
    if (reason === "backdropClick") return;
    handleClose();
  };

  const inputSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-root": {
        borderRadius: 2,
        "& fieldset": {
          borderColor: alpha(theme.palette.primary.main, 0.3),
        },
        "&:hover fieldset": {
          borderColor: alpha(theme.palette.primary.main, 0.5),
        },
        "&.Mui-focused fieldset": {
          borderColor: theme.palette.primary.main,
        },
      },
    }),
    [theme],
  );

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth={maxWidth}
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          py: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ color: theme.palette.text.secondary }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Box
          component="form"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {fields.map((field) => {
            const value = values[field.name];
            const label = (
              <>
                {field.label}
                {field.required ? (
                  <Typography
                    component="span"
                    sx={{ color: theme.palette.error.main, ml: 0.5 }}
                  >
                    *
                  </Typography>
                ) : null}
              </>
            );

            if (field.type === "checkbox") {
              return (
                <Box key={field.name}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(value)}
                        onChange={(event) =>
                          handleChange(field.name, event.target.checked)
                        }
                        sx={{
                          color: alpha(theme.palette.primary.main, 0.4),
                          "&.Mui-checked": {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" color="text.secondary">
                        {field.placeholder || field.label}
                      </Typography>
                    }
                  />
                </Box>
              );
            }

            if (field.type === "select") {
              return (
                <Box key={field.name}>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1,
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {label}
                  </Typography>
                  <Select
                    value={String(value || "")}
                    onChange={(event) => handleChange(field.name, event.target.value)}
                    fullWidth
                    size="small"
                    MenuProps={{ disablePortal: true }}
                    sx={inputSx}
                  >
                    <MenuItem value="">Select {field.label}</MenuItem>
                    {field.options?.map((option, index) => {
                      const previousGroup = field.options?.[index - 1]?.group;
                      const showGroupHeader =
                        option.group && option.group !== previousGroup;

                      if (showGroupHeader) {
                        return [
                          <ListSubheader key={`group-${option.group}`}>
                            {option.group}
                          </ListSubheader>,
                          <MenuItem
                            key={`${option.group || "default"}-${String(option.value)}`}
                            value={option.value}
                          >
                            {option.label}
                          </MenuItem>,
                        ];
                      }

                      return (
                        <MenuItem
                          key={`${option.group || "default"}-${String(option.value)}`}
                          value={option.value}
                        >
                          {option.label}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  {field.helperText ? (
                    <FormHelperText>{field.helperText}</FormHelperText>
                  ) : null}
                </Box>
              );
            }

            if (field.type === "multiselect") {
              const multiValue = Array.isArray(value) ? value : [];
              return (
                <Box key={field.name}>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1,
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {label}
                  </Typography>
                  <Select
                    multiple
                    value={multiValue as string[]}
                    onChange={(event) => handleChange(field.name, event.target.value)}
                    fullWidth
                    size="small"
                    MenuProps={{ disablePortal: true }}
                    renderValue={(selected) =>
                      Array.isArray(selected)
                        ? selected
                            .map(
                              (selectedValue) =>
                                field.options?.find(
                                  (option) => option.value === selectedValue,
                                )?.label || String(selectedValue),
                            )
                            .join(", ")
                        : ""
                    }
                    sx={inputSx}
                  >
                    {field.options?.map((option) => (
                      <MenuItem key={String(option.value)} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {field.helperText ? (
                    <FormHelperText>{field.helperText}</FormHelperText>
                  ) : null}
                </Box>
              );
            }

            if (field.type === "file") {
              return (
                <Box key={field.name}>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1,
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {label}
                  </Typography>
                  <TextField
                    type="file"
                    fullWidth
                    size="small"
                    inputProps={{ accept: field.accept }}
                    onChange={(event) => {
                      const input = event.target as HTMLInputElement;
                      handleChange(field.name, input.files?.[0] || null);
                    }}
                    sx={inputSx}
                  />
                  {field.helperText ? (
                    <FormHelperText>{field.helperText}</FormHelperText>
                  ) : null}
                </Box>
              );
            }

            return (
              <Box key={field.name}>
                <TextField
                  label={field.label}
                  type={
                    field.type === "textarea"
                      ? "text"
                      : field.type === "date"
                        ? "date"
                        : field.type || "text"
                  }
                  value={String(value ?? "")}
                  onChange={(event) =>
                    handleChange(field.name, event.target.value)
                  }
                  fullWidth
                  size="small"
                  required={field.required}
                  placeholder={field.placeholder}
                  multiline={field.type === "textarea" || field.multiline}
                  rows={field.rows ?? (field.type === "textarea" ? 4 : undefined)}
                  InputLabelProps={
                    field.type === "date" ? { shrink: true } : undefined
                  }
                  helperText={field.helperText}
                  sx={inputSx}
                />
              </Box>
            );
          })}
          {children}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderColor: alpha(theme.palette.primary.main, 0.3),
            color: theme.palette.text.primary,
            "&:hover": {
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
          }}
        >
          {cancelText}
        </Button>
        {!readOnly ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              "&:hover": {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              },
            }}
          >
            {loading ? "Saving..." : submitText}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
