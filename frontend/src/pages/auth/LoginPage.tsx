import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  createTheme,
  ThemeProvider,
  CssBaseline,
  alpha,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Visibility,
  VisibilityOff,
  School,
  Login as LoginIcon,
  AdminPanelSettings,
  Person,
  SupervisedUserCircle,
  MenuBook,
  ArrowBack,
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const demoRoles = [
  {
    role: "SystemAdmin",
    label: "System Admin",
    icon: <AdminPanelSettings />,
    color: "#7B1FA2",
  },
  {
    role: "SchoolAdmin",
    label: "School Admin",
    icon: <School />,
    color: colors.forest,
  },
  { role: "Teacher", label: "Teacher", icon: <Person />, color: "#1976D2" },
  { role: "Student", label: "Student", icon: <MenuBook />, color: "#388E3C" },
  {
    role: "Parent",
    label: "Parent",
    icon: <SupervisedUserCircle />,
    color: "#F57C00",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const {
    login,
    verifyTwoFactor,
    clearTwoFactorChallenge,
    pendingTwoFactorToken,
    pendingTwoFactorEmail,
    demoLogin,
    isLoading,
  } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const currentTheme = darkMode ? darkTheme : lightTheme;

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data.email, data.password);
      if (result.requiresTwoFactor) {
        toast.success(result.message || "Verification code sent");
        return;
      }
      toast.success("Login successful!");
      const user = useAuthStore.getState().user;
      if (user) {
        const routes: Record<string, string> = {
          SystemAdmin: "/admin",
          SchoolAdmin: "/school-admin",
          Teacher: "/teacher",
          Student: "/student",
          Parent: "/parent",
        };
        navigate(routes[user.role] || "/dashboard");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      await verifyTwoFactor(verificationCode);
      toast.success("Login successful!");
      const user = useAuthStore.getState().user;
      if (user) {
        const routes: Record<string, string> = {
          SystemAdmin: "/admin",
          SchoolAdmin: "/school-admin",
          Teacher: "/teacher",
          Student: "/student",
          Parent: "/parent",
        };
        navigate(routes[user.role] || "/dashboard");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    }
  };

  const handleDemoLogin = (role: string) => {
    demoLogin(role);
    toast.success(`Demo login as ${role}!`);
    navigate(`/${role.toLowerCase()}`);
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          position: "relative",
          overflow: "hidden",
          background: `radial-gradient(circle at top, ${alpha(colors.sage, 0.9)} 0%, ${colors.forest} 60%)`,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=2000&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.25,
            filter: "saturate(1.1)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.75) 100%)",
          }}
        />

        <Container maxWidth="sm">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Box sx={{ mb: 2 }}>
              <Button
                component={Link}
                to="/"
                startIcon={<ArrowBack />}
                sx={{
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                  "&:hover": {
                    color: "#ffffff",
                    background: "rgba(255,255,255,0.12)",
                  },
                }}
              >
                Back to Home
              </Button>
            </Box>
            <Card
              sx={{
                p: 4,
                position: "relative",
                zIndex: 1,
                background: `linear-gradient(160deg, ${alpha(colors.parchment, 0.98)} 0%, ${alpha(colors.eggshell, 0.95)} 100%)`,
              }}
            >
              <CardContent>
                <Box sx={{ textAlign: "center", mb: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <School
                      sx={{ mr: 1, color: "primary.main", fontSize: 40 }}
                    />
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 700, color: "primary.main" }}
                    >
                      SIMS
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                    Welcome Back
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Sign in to access your student information management system
                  </Typography>
                </Box>

                {showDemo ? (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ mb: 2, textAlign: "center" }}
                    >
                      Click on a role to access the dashboard demo:
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      {demoRoles.map((item) => (
                        <Button
                          key={item.role}
                          variant="outlined"
                          onClick={() => handleDemoLogin(item.role)}
                          sx={{
                            py: 1.5,
                            flexDirection: "column",
                            gap: 0.5,
                            borderColor: alpha(item.color, 0.3),
                            color: item.color,
                            minWidth: 90,
                            "&:hover": {
                              background: alpha(item.color, 0.1),
                              borderColor: item.color,
                            },
                          }}
                        >
                          {item.icon}
                          <Typography variant="caption" fontWeight={600}>
                            {item.label}
                          </Typography>
                        </Button>
                      ))}
                    </Box>
                  </Box>
                ) : pendingTwoFactorToken ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <Alert severity="info">
                      Enter the 6-digit verification code sent to{" "}
                      <strong>{pendingTwoFactorEmail}</strong>.
                    </Alert>
                    <TextField
                      label="Verification Code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={isLoading || verificationCode.trim().length < 6}
                      startIcon={<LoginIcon />}
                      onClick={handleVerifyTwoFactor}
                      sx={{
                        py: 1.5,
                        borderRadius: 999,
                        fontSize: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      {isLoading ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => {
                        clearTwoFactorChallenge();
                        setVerificationCode("");
                      }}
                    >
                      Back to sign in
                    </Button>
                  </Box>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 3 }}
                    >
                      <TextField
                        label="Email Address"
                        type="email"
                        placeholder="admin@school.com"
                        fullWidth
                        variant="outlined"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        {...register("email")}
                      />
                      <TextField
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        fullWidth
                        variant="outlined"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        {...register("password")}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <FormControlLabel
                          control={<Checkbox size="small" />}
                          label="Remember me"
                        />
                        <Link
                          to="/forgot-password"
                          style={{
                            fontSize: "0.875rem",
                            color: currentTheme.palette.primary.main,
                            textDecoration: "none",
                          }}
                        >
                          Forgot password?
                        </Link>
                      </Box>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={isLoading}
                        startIcon={<LoginIcon />}
                        sx={{
                          py: 1.5,
                          borderRadius: 999,
                          fontSize: "1rem",
                          fontWeight: 600,
                        }}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                      <Box sx={{ textAlign: "center", mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Don't have an account? Please contact the school
                          administrator for access.
                        </Typography>
                      </Box>
                    </Box>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
