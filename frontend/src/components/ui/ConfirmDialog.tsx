import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
} from "@mui/material";
import { Close, Warning } from "@mui/icons-material";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  severity?: "warning" | "error" | "info";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  severity = "warning",
}: ConfirmDialogProps) {
  const theme = useTheme();

  const severityColors = {
    warning: {
      bg: alpha(theme.palette.warning.main, 0.1),
      icon: theme.palette.warning.main,
      button: theme.palette.warning.main,
    },
    error: {
      bg: alpha(theme.palette.error.main, 0.1),
      icon: theme.palette.error.main,
      button: theme.palette.error.main,
    },
    info: {
      bg: alpha(theme.palette.info.main, 0.1),
      icon: theme.palette.info.main,
      button: theme.palette.primary.main,
    },
  };

  const colors = severityColors[severity];
  const paperBg = theme.palette.background.paper as string;
  const defaultBg = theme.palette.background.default as string;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(160deg, ${alpha(paperBg, 0.98)} 0%, ${alpha(defaultBg, 0.98)} 100%)`
              : `linear-gradient(160deg, ${alpha(paperBg, 0.98)} 0%, ${alpha(defaultBg, 0.98)} 100%)`,
          border: `1px solid ${alpha(colors.icon, 0.2)}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          py: 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.bg,
          }}
        >
          <Warning sx={{ color: colors.icon, fontSize: 24 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ ml: "auto", color: theme.palette.text.secondary }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
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
          onClick={onClose}
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
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          sx={{
            background: `linear-gradient(135deg, ${colors.button}, ${alpha(colors.button, 0.8)})`,
            "&:hover": {
              background: `linear-gradient(135deg, ${colors.button}, ${colors.button})`,
            },
          }}
        >
          {loading ? "Please wait..." : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
