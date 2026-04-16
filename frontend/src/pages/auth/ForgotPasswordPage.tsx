import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  createTheme,
  ThemeProvider,
  CssBaseline,
  alpha,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { motion } from "framer-motion";
import { ArrowBack, Email, School, Lock } from "@mui/icons-material";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";

const colors = {
  sage: "#8FA998",
  sageLight: "#A8C4B5",
  sageDark: "#6B8A78",
  parchment: "#FDFBF7",
  eggshell: "#F5F2EA",
  charcoal: "#242424",
  forest: "#1A4A3A",
  forestLight: "#2D6B54",
  graphite: "#1D1F1E",
  midnight: "#0F1513",
  mist: "#DDE4DF",
};

const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.forest,
      light: colors.forestLight,
      dark: colors.charcoal,
    },
    secondary: { main: colors.sage },
    background: { default: colors.parchment, paper: colors.eggshell },
    text: { primary: colors.charcoal, secondary: "#4F5B57" },
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
    h4: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 700,
    },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          padding: "10px 24px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha(colors.forest, 0.08)}`,
          boxShadow: "0 18px 35px rgba(20, 35, 29, 0.08)",
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.sage,
      light: colors.sageLight,
      dark: colors.sageDark,
    },
    secondary: { main: colors.sageLight },
    background: { default: colors.midnight, paper: colors.graphite },
    text: { primary: colors.parchment, secondary: colors.mist },
  },
  typography: lightTheme.typography,
  shape: lightTheme.shape,
  components: {
    ...lightTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(colors.sageLight, 0.12)}`,
          boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
          backgroundImage: `linear-gradient(160deg, ${alpha(colors.graphite, 0.9)} 0%, ${alpha(colors.midnight, 0.95)} 100%)`,
        },
      },
    },
  },
});

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setEmailSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${colors.parchment} 0%, ${colors.eggshell} 100%)`,
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: "16px",
                  background: `linear-gradient(135deg, ${colors.forest} 0%, ${colors.forestLight} 100%)`,
                  boxShadow: "0 8px 20px rgba(26, 74, 58, 0.3)",
                  mb: 2,
                }}
              >
                <School sx={{ fontSize: 32, color: "#fff" }} />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: 700,
                  color: colors.forest,
                }}
              >
                SchoolPro
              </Typography>
            </Box>

            <Card>
              <CardContent sx={{ p: 4 }}>
                {emailSent ? (
                  <Box sx={{ textAlign: "center" }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        background: alpha(colors.forest, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 3,
                      }}
                    >
                      <Email sx={{ fontSize: 40, color: colors.forest }} />
                    </Box>
                    <Typography variant="h5" gutterBottom fontWeight={600}>
                      Check Your Email
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      We've sent a password reset link to{" "}
                      <strong>{email}</strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 3 }}
                    >
                      Didn't receive the email? Check your spam folder or{" "}
                      <Button
                        variant="text"
                        onClick={() => setEmailSent(false)}
                      >
                        try again
                      </Button>
                    </Typography>
                    <Button
                      component={Link}
                      to="/login"
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      fullWidth
                    >
                      Back to Login
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ textAlign: "center", mb: 3 }}>
                      <Typography variant="h5" gutterBottom fontWeight={600}>
                        Forgot Password?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Enter your email address and we'll send you a link to
                        reset your password.
                      </Typography>
                    </Box>

                    <form onSubmit={handleSubmit}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email color="action" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 3 }}
                        required
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={loading}
                        sx={{
                          py: 1.5,
                          mb: 2,
                          background: `linear-gradient(135deg, ${colors.forest} 0%, ${colors.forestLight} 100%)`,
                          "&:hover": {
                            background: `linear-gradient(135deg, ${colors.forestLight} 0%, ${colors.forest} 100%)`,
                          },
                        }}
                      >
                        {loading ? "Sending..." : "Send Reset Link"}
                      </Button>

                      <Box sx={{ textAlign: "center" }}>
                        <Button
                          component={Link}
                          to="/login"
                          startIcon={<ArrowBack />}
                          sx={{ textTransform: "none" }}
                        >
                          Back to Login
                        </Button>
                      </Box>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 3 }}
            >
              © 2025 HU Non-Boarding Secondary School. All rights reserved.
            </Typography>
          </motion.div>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default ForgotPasswordPage;
