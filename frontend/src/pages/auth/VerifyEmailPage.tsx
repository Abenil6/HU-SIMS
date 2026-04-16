import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  ArrowBack,
  School,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Email,
} from "@mui/icons-material";
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

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing verification token. Please request a new verification email.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid verification token");
      return;
    }

    if (!password) {
      toast.error("Please enter a password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    setVerifying(true);
    try {
      await authService.verifyEmail(token, password);
      setSuccess(true);
      toast.success("Email verified and password set successfully!");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to verify email";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  if (success) {
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
                <CardContent sx={{ p: 4, textAlign: "center" }}>
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
                    <CheckCircle sx={{ fontSize: 40, color: colors.forest }} />
                  </Box>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Email Verified Successfully
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Your email has been verified and your password has been set.
                    You can now log in to your account.
                  </Typography>
                  <Button
                    component={Link}
                    to="/login"
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      py: 1.5,
                      background: `linear-gradient(135deg, ${colors.forest} 0%, ${colors.forestLight} 100%)`,
                    }}
                  >
                    Go to Login
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  if (error && !token) {
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
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: alpha("#e74c3c", 0.1),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Email sx={{ fontSize: 40, color: "#e74c3c" }} />
                  </Box>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Invalid Verification Link
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    {error}
                  </Typography>
                  <Button
                    component={Link}
                    to="/login"
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{
                      py: 1.5,
                      background: `linear-gradient(135deg, ${colors.forest} 0%, ${colors.forestLight} 100%)`,
                    }}
                  >
                    Go to Login
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

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
                <Box sx={{ textAlign: "center", mb: 3 }}>
                  <Typography variant="h5" gutterBottom fontWeight={600}>
                    Verify Your Email
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Welcome! Please create a password to complete your account setup.
                  </Typography>
                </Box>

                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Create Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                    required
                    disabled={verifying}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            edge="end"
                          >
                            {showConfirmPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 3 }}
                    required
                    disabled={verifying}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading || verifying}
                    startIcon={verifying && <CircularProgress size={20} color="inherit" />}
                    sx={{
                      py: 1.5,
                      mb: 2,
                      background: `linear-gradient(135deg, ${colors.forest} 0%, ${colors.forestLight} 100%)`,
                      "&:hover": {
                        background: `linear-gradient(135deg, ${colors.forestLight} 0%, ${colors.forest} 100%)`,
                      },
                    }}
                  >
                    {verifying ? "Verifying..." : "Complete Registration"}
                  </Button>

                  <Box sx={{ textAlign: "center" }}>
                    <Button
                      component={Link}
                      to="/login"
                      startIcon={<ArrowBack />}
                      sx={{ textTransform: "none" }}
                      disabled={verifying}
                    >
                      Back to Login
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>

            {/* Footer */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", mt: 3 }}
            >
              © 2024 SchoolPro. All rights reserved.
            </Typography>
          </motion.div>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default VerifyEmailPage;
