import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useScroll, useTransform, useInView, motion, useAnimation } from "framer-motion";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Card,
  CardContent,
  Chip,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Divider,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  School,
  Menu as MenuIcon,
  DarkMode,
  LightMode,
  Assignment,
  Grading,
  Campaign,
  Chat,
  Send,
  LocationOn,
  Phone,
  Email,
  AccessTime,
  People,
  EmojiEvents,
  Person,
  Subject,
  Message,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ExpandMore,
} from "@mui/icons-material";
import { useAuthStore } from "@/stores/authStore";
import { SplitScreenLoader } from "@/components/ui/SplitScreenLoader";
import { SchoolIllustration } from "@/components/ui/SchoolIllustration";
import { ArrowUpRight } from "lucide-react";
import axios from "axios";

const PUBLIC_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Color Palette
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
    secondary: {
      main: colors.sage,
    },
    background: {
      default: colors.parchment,
      paper: colors.eggshell,
    },
    text: {
      primary: colors.charcoal,
      secondary: "#4F5B57",
    },
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 700,
      color: colors.charcoal,
    },
    h2: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 700,
      color: colors.charcoal,
    },
    h3: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.charcoal,
    },
    h4: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.charcoal,
    },
    h5: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.charcoal,
    },
    h6: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.charcoal,
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
          backdropFilter: "blur(6px)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 10px 25px rgba(20, 35, 29, 0.08)",
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
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 700,
      color: colors.parchment,
    },
    h2: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 700,
      color: colors.parchment,
    },
    h3: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.parchment,
    },
    h4: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.parchment,
    },
    h5: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.parchment,
    },
    h6: {
      fontFamily: '"Playfair Display", "Times New Roman", serif',
      fontWeight: 600,
      color: colors.parchment,
    },
  },
  shape: lightTheme.shape,
  components: {
    ...lightTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(colors.sageLight, 0.12)}`,
          boxShadow: "0 20px 45px rgba(0,0,0,0.35)",
          backgroundImage: `linear-gradient(160deg, ${alpha(
            colors.graphite,
            0.9
          )} 0%, ${alpha(colors.midnight, 0.95)} 100%)`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
        },
      },
    },
  },
});

export function LandingPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [activeSection, setActiveSection] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [statistics, setStatistics] = useState({
    students: 0,
    teachers: 0,
    yearsOfExcellence: 0,
    classes: 0
  });
  
  // Fetch real-time statistics from backend
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
        const response = await fetch(`${baseUrl}/system/public-stats`);
        if (response.ok) {
          const data = await response.json();
          setStatistics(data);
        } else {
          console.error('API returned non-OK status:', response.status);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();
  }, []);
  
  // Parallax effect for hero background
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity1 = useTransform(scrollY, [0, 300], [1, 0.3]);
  
  // Scroll progress calculation
  const scrollProgress = useTransform(scrollY, [0, document.body.scrollHeight - window.innerHeight], [0, 1]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const { isAuthenticated, logout, user } = useAuthStore();
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Handle back button - logout if user navigates back to landing page
  useEffect(() => {
    const handleBackButton = () => {
      if (isAuthenticated) {
        logout();
      }
    };
    window.addEventListener("popstate", handleBackButton);
    return () => {
      window.removeEventListener("popstate", handleBackButton);
    };
  }, [isAuthenticated, logout]);

  useEffect(() => {
    const sectionIds = [
      "home",
      "features",
      "announcements",
      "about",
      "faq",
      "system-access",
      "contact",
    ];
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportMiddle = scrollY + window.innerHeight / 3;
      
      let currentSection = "home";
      let minDistance = Infinity;
      
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const sectionTop = el.offsetTop;
          const distance = Math.abs(viewportMiddle - sectionTop);
          
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = id;
          }
        }
      }
      
      setActiveSection(currentSection);
      setScrolled(scrollY > 100);
    };
    
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const navigationEntries = performance.getEntriesByType("navigation");
      const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
      if (navEntry && navEntry.type === "back_forward") {
        logout();
      }
    }
  }, []);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleContactFormChange = (field: string, value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!contactForm.name.trim()) {
      errors.name = "Name is required";
    } else if (contactForm.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    
    if (!contactForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!contactForm.subject.trim()) {
      errors.subject = "Subject is required";
    } else if (contactForm.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters";
    }
    
    if (!contactForm.message.trim()) {
      errors.message = "Message is required";
    } else if (contactForm.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }
    
    return errors;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Simulate API call - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log("Contact form submitted:", contactForm);
      
      // Reset form on success
      setContactForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setSubmitSuccess(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      setSubmitError("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const announcementsQuery = useQuery({
    queryKey: ["public", "announcements"],
    queryFn: async () => {
      const res = await axios.get(`${PUBLIC_API_URL}/announcements/public?limit=3`);
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const announcements: any[] = announcementsQuery.data ?? [];

  const features = [
    {
      icon: <Assignment fontSize="large" />,
      title: "Registration",
      desc: "Online student enrollment",
    },
    {
      icon: <Grading fontSize="large" />,
      title: "Results",
      desc: "Academic records & grades",
    },
    {
      icon: <Campaign fontSize="large" />,
      title: "Announcements",
      desc: "School notices & updates",
    },
    {
      icon: <Chat fontSize="large" />,
      title: "Communication",
      desc: "Parent-teacher messaging",
    },
  ];

  const roles = [
    {
      title: "Students",
      description:
        "View grades, attendance, announcements, and personal records",
    },
    {
      title: "Parents",
      description: "Monitor academic progress and communicate with teachers",
    },
    {
      title: "Teachers",
      description: "Manage grades, attendance, and class materials",
    },
    {
      title: "Administrators",
      description: "Full system access for school management",
    },
  ];

  const currentTheme = darkMode ? darkTheme : lightTheme;
  
  // Animation Variants
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };
  
  const fadeDown = {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };
  
  const fadeLeft = {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };
  
  const fadeRight = {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };
  
  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
  };
  
  const scaleBounce = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut", type: "spring", bounce: 0.4 } },
  };
  
  const rotateIn = {
    hidden: { opacity: 0, rotate: -10, scale: 0.9 },
    visible: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } },
  };
  
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };
  
  const staggerSlow = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.2 } },
  };
  
  const slideUpStagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };
  
  const textReveal = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  
  const textStagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.03,
      },
    },
  };
  
  // Animated counter hook
  const useAnimatedCounter = (end: number, duration: number = 2) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    
    useEffect(() => {
      if (isInView) {
        let startTime: number;
        const animateCount = (currentTime: number) => {
          if (!startTime) startTime = currentTime;
          const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) {
            requestAnimationFrame(animateCount);
          } else {
            setCount(end);
          }
        };
        requestAnimationFrame(animateCount);
      }
    }, [isInView, end, duration]);
    
    return { count, ref };
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <SplitScreenLoader duration={2000} />
      <Box
        sx={{ 
          flexGrow: 1, 
          minHeight: "100vh", 
          bgcolor: "background.default",
          scrollBehavior: "smooth",
        }}
      >
        {/* Skip to Content Link */}
        <Box
          component="a"
          href="#main-content"
          sx={{
            position: "absolute",
            top: -40,
            left: 0,
            bgcolor: colors.forest,
            color: "white",
            py: 1,
            px: 2,
            zIndex: 10000,
            "&:focus": {
              top: 0,
            },
          }}
        >
          Skip to main content
        </Box>
        
        {/* Scroll Progress Indicator */}
        <motion.div
          style={{
            scaleX: scrollProgress,
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: currentTheme.palette.mode === "dark" ? colors.sageLight : colors.forest,
            transformOrigin: "left",
            zIndex: 9999,
          }}
        />
        
        {/* Back to Top Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: showBackToTop ? 1 : 0,
            scale: showBackToTop ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            bottom: 30,
            right: 30,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={scrollToTop}
            aria-label="Scroll to top"
            sx={{
              bgcolor: currentTheme.palette.mode === "dark" ? colors.sage : colors.forest,
              color: "white",
              "&:hover": {
                bgcolor: currentTheme.palette.mode === "dark" ? colors.sageLight : colors.forestLight,
                transform: "scale(1.1)",
              },
              "&:focus-visible": {
                outline: "2px solid white",
                outlineOffset: 2,
              },
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
            }}
          >
            <KeyboardArrowUp />
          </IconButton>
        </motion.div>
        {/* Navigation Bar */}
        <AppBar
          position="fixed"
          color="inherit"
          role="navigation"
          aria-label="Main navigation"
          sx={{
            bgcolor: "transparent",
            backdropFilter: "none",
            borderBottom: "none",
            boxShadow: "none",
            transition: "all 0.3s ease",
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 4 } }}>
            {/* Left side - Logo */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <School
                sx={{
                  mr: 1,
                  color: scrolled ? "primary.main" : "white",
                  fontSize: 32,
                  transition: "color 0.3s ease",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: scrolled ? "primary.main" : "white",
                  transition: "color 0.3s ease",
                }}
              >
                SIMS
              </Typography>
            </Box>

            {/* Centered Navigation Links */}
            {!isMobile && (
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: scrolled
                    ? alpha(currentTheme.palette.background.paper, 0.9)
                    : alpha("rgba(0,0,0,0.3)", 0.6),
                  backdropFilter: "blur(12px)",
                  px: 3,
                  py: 1.5,
                  borderRadius: 999,
                  border: `1px solid ${alpha(
                    scrolled ? currentTheme.palette.primary.main : "#FFFFFF",
                    0.2
                  )}`,
                  boxShadow: scrolled
                    ? "0 8px 32px rgba(0,0,0,0.1)"
                    : "0 8px 32px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                {[
                  { label: "Home", href: "#home" },
                  { label: "Features", href: "#features" },
                  { label: "Announcements", href: "#announcements" },
                  { label: "About", href: "#about" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Contact", href: "#contact" },
                ].map((item) => (
                  <Button
                    key={item.label}
                    color="inherit"
                    href={item.href}
                    sx={{
                      color: scrolled ? "text.primary" : "white",
                      fontWeight: 500,
                      fontSize: "0.9rem",
                      textTransform: "none",
                      borderRadius: 999,
                      px: 2,
                      py: 0.75,
                      bgcolor:
                        activeSection === item.href.replace("#", "")
                          ? alpha(
                              scrolled
                                ? currentTheme.palette.primary.main
                                : "#FFFFFF",
                              0.2
                            )
                          : "transparent",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        bgcolor: alpha(
                          scrolled
                            ? currentTheme.palette.primary.main
                            : "#FFFFFF",
                          0.15
                        ),
                        color: scrolled ? "primary.main" : "white",
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}

            {/* Right side - Actions */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isMobile && (
                <>
                  <IconButton
                    onClick={toggleDarkMode}
                    aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
                    sx={{
                      bgcolor: scrolled
                        ? alpha(currentTheme.palette.background.paper, 0.9)
                        : alpha("rgba(0,0,0,0.3)", 0.6),
                      backdropFilter: "blur(12px)",
                      color: scrolled ? "text.primary" : "white",
                      "&:hover": {
                        bgcolor: alpha(
                          scrolled
                            ? currentTheme.palette.primary.main
                            : "#FFFFFF",
                          0.2
                        ),
                        color: scrolled ? "primary.main" : "white",
                      },
                      "&:focus-visible": {
                        outline: "3px solid white",
                        outlineOffset: 2,
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    {darkMode ? <LightMode /> : <DarkMode />}
                  </IconButton>
                  <IconButton
                    color="inherit"
                    onClick={handleMenuClick}
                    aria-label="Open mobile menu"
                    sx={{
                      bgcolor: scrolled
                        ? alpha(currentTheme.palette.background.paper, 0.9)
                        : alpha("rgba(0,0,0,0.3)", 0.6),
                      backdropFilter: "blur(12px)",
                      color: scrolled ? "text.primary" : "white",
                      "&:hover": {
                        bgcolor: alpha(
                          scrolled
                            ? currentTheme.palette.primary.main
                            : "#FFFFFF",
                          0.2
                        ),
                        color: scrolled ? "primary.main" : "white",
                      },
                      "&:focus-visible": {
                        outline: "3px solid white",
                        outlineOffset: 2,
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <MenuIcon />
                  </IconButton>
                </>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Floating Action Buttons (Top Right) */}
        <Box
          sx={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1100,
            display: "flex",
            gap: 1.5,
          }}
        >
          {/* Dark Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.2,
              type: "spring",
              stiffness: 200,
            }}
          >
            <IconButton
              onClick={toggleDarkMode}
              aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
              sx={{
                bgcolor: currentTheme.palette.mode === "dark" ? colors.sage : colors.forest,
                color: "white",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                "&:hover": {
                  bgcolor:
                    currentTheme.palette.mode === "dark"
                      ? colors.sageLight
                      : colors.forestLight,
                  transform: "scale(1.05) translateY(-2px)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                },
                "&:focus-visible": {
                  outline: "3px solid white",
                  outlineOffset: 2,
                },
                transition: "all 0.3s ease",
              }}
            >
              {darkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </motion.div>

          {/* Login Button */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: 0,
              }}
              transition={{
                duration: 0.5,
                delay: 0.2,
                type: "spring",
                stiffness: 200,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/login")}
                aria-label="Login to system"
                endIcon={<ArrowUpRight size={20} />}
                sx={{
                  bgcolor: currentTheme.palette.mode === "dark" ? colors.sage : colors.forest,
                  color: "white",
                  fontWeight: 600,
                  borderRadius: 999,
                  px: 3,
                  py: 1.25,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                  "&:hover": {
                    bgcolor:
                      currentTheme.palette.mode === "dark"
                        ? colors.sageLight
                        : colors.forestLight,
                    transform: "scale(1.05) translateY(-2px)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                  },
                  "&:focus-visible": {
                    outline: "3px solid white",
                    outlineOffset: 2,
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Login
              </Button>
            </motion.div>
          )}
        </Box>

        {/* Skip to content link */}
        <Box sx={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("#main-content")}
            aria-label="Skip to main content"
            sx={{ display: "none", "&:focus-visible": { display: "block" } }}
          >
            Skip to main content
          </Button>
        </Box>

        {/* Mobile Menu */}
        {isMobile && (
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                borderRadius: 3,
                bgcolor:
                  currentTheme.palette.mode === "dark"
                    ? colors.graphite
                    : colors.parchment,
                border: `1px solid ${alpha(
                  currentTheme.palette.text.primary,
                  0.08
                )}`,
              },
            }}
          >
            <MenuItem
              onClick={handleMenuClose}
              component="a"
              href="#home"
              aria-label="Go to home section"
              sx={{
                color:
                  currentTheme.palette.mode === "dark"
                    ? colors.parchment
                    : colors.charcoal,
                "&:hover": {
                  bgcolor: alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              Home
            </MenuItem>
            <MenuItem
              onClick={handleMenuClose}
              component="a"
              href="#features"
              aria-label="Go to features section"
              sx={{
                color:
                  currentTheme.palette.mode === "dark"
                    ? colors.parchment
                    : colors.charcoal,
                "&:hover": {
                  bgcolor: alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              Features
            </MenuItem>
            <MenuItem
              onClick={handleMenuClose}
              component="a"
              href="#announcements"
              aria-label="Go to announcements section"
              sx={{
                color:
                  currentTheme.palette.mode === "dark"
                    ? colors.parchment
                    : colors.charcoal,
                "&:hover": {
                  bgcolor: alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              Announcements
            </MenuItem>
            <MenuItem
              onClick={handleMenuClose}
              component="a"
              href="#about"
              aria-label="Go to about school section"
              sx={{
                color:
                  currentTheme.palette.mode === "dark"
                    ? colors.parchment
                    : colors.charcoal,
                "&:hover": {
                  bgcolor: alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              About School
            </MenuItem>
            <MenuItem
              onClick={handleMenuClose}
              component="a"
              href="#faq"
              aria-label="Go to FAQ section"
              sx={{
                color:
                  currentTheme.palette.mode === "dark"
                    ? colors.parchment
                    : colors.charcoal,
                "&:hover": {
                  bgcolor: alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              FAQ
            </MenuItem>
            <MenuItem
              onClick={handleMenuClose}
              component="a"
              href="#contact"
              aria-label="Go to contact section"
              sx={{
                color:
                  currentTheme.palette.mode === "dark"
                    ? colors.parchment
                    : colors.charcoal,
                "&:hover": {
                  bgcolor: alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              Contact
            </MenuItem>
          </Menu>
        )}

        {/* Hero Section - Sage Green Background */}
        <Box
          id="home"
          sx={{
            minHeight: "100vh",
            pt: { xs: 12, md: 16 },
            pb: { xs: 12, md: 16 },
            px: 2,
            position: "relative",
            overflow: "hidden",
            background:
              currentTheme.palette.mode === "dark"
                ? `radial-gradient(circle at top, ${alpha(
                    colors.sageDark,
                    0.45
                  )} 0%, ${colors.midnight} 55%)`
                : `radial-gradient(circle at top, ${alpha(
                    colors.sage,
                    0.9
                  )} 0%, ${colors.forest} 60%)`,
            color: "white",
          }}
        >
          {/* Animated Gradient Background */}
          <motion.div
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              inset: 0,
              background: currentTheme.palette.mode === "dark"
                ? `linear-gradient(-45deg, ${colors.sageDark}, ${colors.graphite}, ${colors.midnight}, ${colors.forest})`
                : `linear-gradient(-45deg, ${colors.sage}, ${colors.forest}, ${colors.forestLight}, ${colors.sageDark})`,
              backgroundSize: "400% 400%",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          {/* Floating Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -30, 0],
                x: [0, i % 2 === 0 ? 20 : -20, 0],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                width: 10 + i * 5,
                height: 10 + i * 5,
                borderRadius: "50%",
                background: alpha(colors.sageLight, 0.4),
                left: `${10 + i * 15}%`,
                top: `${20 + i * 10}%`,
                filter: "blur(2px)",
              }}
            />
          ))}
          <Container maxWidth="lg">
            <motion.div
              variants={slideUpStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: { xs: 4, md: 8 },
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    textAlign: { xs: "center", md: "left" },
                  }}
                >
                <motion.div variants={textStagger}>
                  <motion.div variants={textReveal}>
                    <Typography
                      variant="h2"
                      component="h1"
                      sx={{
                        mb: 3,
                        fontSize: { xs: "2.3rem", md: "3.2rem", lg: "3.8rem" },
                        fontWeight: 700,
                        color: "white",
                        lineHeight: 1.1,
                        textShadow: "0 16px 35px rgba(0,0,0,0.25)",
                      }}
                    >
                      Building a Digital Future
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        mb: 4,
                        fontSize: { xs: "1.4rem", md: "1.8rem", lg: "2.1rem" },
                        fontWeight: 500,
                        color: alpha(colors.sageLight, 0.95),
                        textShadow: "0 8px 20px rgba(0,0,0,0.3)",
                      }}
                    >
                      Haramaya University Non-Boarding School
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 5,
                        fontSize: { xs: "1.05rem", md: "1.25rem", lg: "1.35rem" },
                        fontWeight: 400,
                        color: alpha("#FFFFFF", 0.85),
                        textShadow: "0 10px 24px rgba(0,0,0,0.35)",
                        maxWidth: 600,
                      }}
                    >
                      Secure web-based system for student registration, academic records, and school communication
                    </Typography>
                  </motion.div>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Divider
                    sx={{
                      my: 3,
                      borderColor: alpha(colors.sageLight, 0.4),
                      borderWidth: 1,
                      width: "120px",
                      mx: "auto",
                    }}
                  />
                </motion.div>
                
                {/* Mini Stats Preview */}
                <motion.div variants={fadeUp}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "center",
                      flexWrap: "wrap",
                      mb: 5,
                    }}
                  >
                    {[
                      { label: "Students", value: statistics.students, icon: <People /> },
                      { label: "Teachers", value: statistics.teachers, icon: <School /> },
                      { label: "Classes", value: statistics.classes, icon: <Assignment /> },
                    ].map((stat, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          color: "white",
                        }}
                      >
                        <Box sx={{ fontSize: 20, opacity: 0.8 }}>{stat.icon}</Box>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: "2.5rem", md: "3.5rem" },
                              lineHeight: 1,
                            }}
                          >
                            {stat.value}+
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.75rem",
                              opacity: 0.8,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {stat.label}
                          </Typography>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        href="/login"
                        endIcon={<ArrowUpRight size={20} />}
                        aria-label="Login to Student Information Management System"
                        sx={{
                          bgcolor: "white",
                          color: colors.forest,
                          fontWeight: 600,
                          borderRadius: 999,
                          px: 4,
                          py: 1.5,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                          "&:hover": {
                            bgcolor: alpha(colors.sageLight, 0.95),
                            transform: "scale(1.05) translateY(-3px)",
                            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
                          },
                          "&:focus-visible": {
                            outline: "3px solid white",
                            outlineOffset: 2,
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        Get Started
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        variant="outlined"
                        size="large"
                        href="#announcements"
                        aria-label="View school announcements"
                        sx={{
                          borderColor: "white",
                          color: "white",
                          borderRadius: 999,
                          borderWidth: 2,
                          "&:hover": {
                            borderColor: "white",
                            bgcolor: alpha("#FFFFFF", 0.15),
                            borderWidth: 2,
                          },
                          "&:focus-visible": {
                            outline: "3px solid white",
                            outlineOffset: 2,
                          },
                        }}
                      >
                        View Announcements
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        variant="text"
                        size="large"
                        href="#about"
                        aria-label="Take a virtual tour of the school"
                        sx={{
                          color: "white",
                          fontWeight: 600,
                          borderRadius: 999,
                          px: 3,
                          py: 1.5,
                          "&:hover": {
                            bgcolor: alpha("#FFFFFF", 0.1),
                          },
                          "&:focus-visible": {
                            outline: "3px solid white",
                            outlineOffset: 2,
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        Take a Virtual Tour
                      </Button>
                    </motion.div>
                  </Box>
                </motion.div>
                </Box>
                
                {/* School Illustration - Second Column */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <SchoolIllustration />
                </Box>
                
                {/* Scroll Indicator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  sx={{
                    position: "absolute",
                    bottom: 30,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <KeyboardArrowDown sx={{ fontSize: 30, color: "white", opacity: 0.8 }} />
                  </motion.div>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "white",
                      opacity: 0.8,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontWeight: 500,
                    }}
                  >
                    Scroll to explore
                  </Typography>
                </motion.div>
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* Statistics Section */}
        <Box
          sx={{
            py: 12,
            px: 2,
            bgcolor: currentTheme.palette.mode === "dark" ? colors.graphite : colors.parchment,
          }}
        >
          <Container maxWidth="lg">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 4,
                }}
              >
                {[
                  { label: "Students Enrolled", value: statistics.students, icon: <People /> },
                  { label: "Teachers", value: statistics.teachers, icon: <School /> },
                  { label: "Years of Excellence", value: statistics.yearsOfExcellence, icon: <EmojiEvents /> },
                  { label: "Classes", value: statistics.classes, icon: <Assignment /> },
                ].map((stat, index) => {
                  const { count, ref } = useAnimatedCounter(stat.value, 2);
                  return (
                    <motion.div key={index} variants={scaleIn}>
                      <Card
                        sx={{
                          textAlign: "center",
                          py: 4,
                          px: 2,
                          background:
                            currentTheme.palette.mode === "dark"
                              ? `linear-gradient(160deg, ${alpha(
                                  colors.graphite,
                                  0.95
                                )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                              : `linear-gradient(160deg, ${alpha(
                                  colors.parchment,
                                  0.95
                                )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                          border: `1px solid ${alpha(
                            currentTheme.palette.primary.main,
                            0.15
                          )}`,
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Box sx={{ color: "primary.main", mb: 2, fontSize: 40 }}>
                            {stat.icon}
                          </Box>
                        </motion.div>
                        <Typography
                          variant="h3"
                          sx={{
                            fontWeight: 700,
                            color: "primary.main",
                            mb: 1,
                            fontSize: { xs: "2.5rem", md: "3rem" },
                          }}
                        >
                          <span ref={ref}>{count}</span>+
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {stat.label}
                        </Typography>
                      </Card>
                    </motion.div>
                  );
                })}
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* Animated Wave Divider */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "relative",
            height: 80,
            overflow: "hidden",
          }}
        >
          <svg
            viewBox="0 0 1440 80"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
            preserveAspectRatio="none"
          >
            <motion.path
              initial={{
                d: "M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
              }}
              animate={{
                d: [
                  "M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z",
                  "M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z",
                  "M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z",
                ],
              }}
              fill={currentTheme.palette.mode === "dark" ? colors.graphite : colors.eggshell}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
        </motion.div>

        <Box
          id="features"
          sx={{
            py: 10,
            px: 2,
            bgcolor: "background.paper",
            position: "relative",
          }}
        >
          <Container maxWidth="lg">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(4, 1fr)",
                  },
                  gap: 4,
                }}
              >
                {features.map((feature, index) => {
                  const animations = [fadeUp, fadeLeft, fadeRight, fadeDown];
                  const animation = animations[index % animations.length];
                  return (
                    <motion.div key={index} variants={animation}>
                      <motion.div
                        whileHover={{ 
                          scale: 1.05, 
                          rotateY: 5,
                          rotateX: 5,
                          boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <Card
                          sx={{
                            textAlign: "center",
                            py: 4,
                            px: 2,
                            border: `1px solid ${alpha(
                              currentTheme.palette.primary.main,
                              0.2
                            )}`,
                            background:
                              currentTheme.palette.mode === "dark"
                                ? `linear-gradient(160deg, ${alpha(
                                    colors.graphite,
                                    0.95
                                  )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                                : `linear-gradient(160deg, ${alpha(
                                    colors.parchment,
                                    0.95
                                  )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                            transition: "all 0.3s ease",
                          }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Box sx={{ color: "primary.main", mb: 2 }}>
                              {feature.icon}
                            </Box>
                          </motion.div>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {feature.desc}
                          </Typography>
                        </Card>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* Animated Wave Divider */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "relative",
            height: 80,
            overflow: "hidden",
            marginTop: -40,
          }}
        >
          <svg
            viewBox="0 0 1440 80"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
            preserveAspectRatio="none"
          >
            <motion.path
              d="M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z"
              fill={currentTheme.palette.mode === "dark" ? colors.midnight : colors.parchment}
              animate={{
                d: [
                  "M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z",
                  "M0,40 C360,80 1080,0 1440,40 L1440,0 L0,0 Z",
                  "M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z",
                ],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
        </motion.div>

        {/* Announcements Section */}
        <Container maxWidth="lg" sx={{ py: 10 }} id="announcements">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{ mb: 2, fontWeight: 700, color: "text.primary" }}
            >
              Announcements
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              Stay updated with the latest news, exam schedules, registration
              dates, and important notices.
            </Typography>
          </Box>
          <motion.div
            variants={staggerSlow}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {announcementsQuery.isLoading && (
              <motion.div variants={fadeUp}>
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  Loading announcements...
                </Typography>
              </motion.div>
            )}
            {!announcementsQuery.isLoading && announcements.length === 0 && (
              <motion.div variants={fadeUp}>
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  No announcements at the moment. Check back soon!
                </Typography>
              </motion.div>
            )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 4,
              }}
            >
              {announcements.map((announcement, index) => (
                <motion.div key={index} variants={scaleBounce}>
                  <motion.div
                    whileHover={{ 
                      scale: 1.03,
                      rotateY: 3,
                      boxShadow: "0 15px 35px rgba(0,0,0,0.15)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <Card
                      sx={{
                        height: "100%",
                        background:
                          currentTheme.palette.mode === "dark"
                            ? `linear-gradient(160deg, ${alpha(
                                colors.graphite,
                                0.95
                              )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                            : `linear-gradient(160deg, ${alpha(
                                colors.parchment,
                                0.95
                              )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                        transition: "all 0.3s ease",
                      }}
                    >
                    <CardContent>
                      <Chip
                        label={announcement.type || announcement.category || "General"}
                        color={
                          (announcement.type || announcement.category) === "Academic"
                            ? "primary"
                            : (announcement.type || announcement.category) === "Event"
                            ? "success"
                            : (announcement.priority === "High" || announcement.priority === "Urgent")
                            ? "error"
                            : "warning"
                        }
                        size="small"
                        sx={{ mb: 2 }}
                      />
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ mb: 1, color: "text.primary" }}
                      >
                        {announcement.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {announcement.content
                          ? announcement.content.length > 120
                            ? announcement.content.slice(0, 120) + "..."
                            : announcement.content
                          : announcement.description || ""}
                      </Typography>
                      <Divider sx={{ my: 1.5, borderColor: "divider" }} />
                      <Typography variant="caption" color="text.secondary">
                        Posted:{" "}
                        {announcement.createdAt
                          ? new Date(announcement.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                          : announcement.date || ""}
                      </Typography>
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        Posted by:{" "}
                        {announcement.createdBy
                          ? `${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`
                          : "Admin"}
                      </Typography>
                    </CardContent>
                  </Card>
                  </motion.div>
                </motion.div>
              ))}
            </Box>
          </motion.div>
          <Box sx={{ textAlign: "center", mt: 4 }}></Box>
        </Container>

        {/* About Section */}
        <Box
          id="about"
          sx={{
            py: 10,
            bgcolor:
              currentTheme.palette.mode === "dark"
                ? alpha(colors.graphite, 0.9)
                : colors.eggshell,
          }}
        >
          <Container maxWidth="md">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Box sx={{ textAlign: "center", mb: 6 }}>
                <Typography
                  variant="h3"
                  component="h2"
                  sx={{ mb: 2, fontWeight: 700, color: "text.primary" }}
                >
                  About Our School
                </Typography>
              </Box>
            </motion.div>
            <Typography
              variant="body1"
              sx={{
                mb: 6,
                textAlign: "center",
                lineHeight: 1.8,
                fontSize: "1.1rem",
                color: "text.primary",
              }}
            >
              <strong>Haramaya University Non-Boarding Secondary School</strong>{" "}
              is a government secondary school located on the Haramaya
              University campus. We serve students in{" "}
              <strong>Grades 9-12</strong>, committed to academic excellence and
              the Model School initiative. Our focus is on providing quality
              education that prepares students for higher learning and future
              success.
            </Typography>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                  gap: 4,
                  mb: 7,
                }}
              >
                {[
                  {
                    title: "Vision",
                    subtitle:
                      "To be a model secondary school that nurtures ethical, innovative, and academically excellent learners.",
                    image:
                      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
                  },
                  {
                    title: "Mission",
                    subtitle:
                      "Provide a supportive learning environment, modern pedagogy, and community partnership to raise future-ready graduates.",
                    image:
                      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
                  },
                  {
                    title: "Goals",
                    subtitle:
                      "Strengthen academic achievement, digital literacy, student wellbeing, and leadership development for all grades 9–12.",
                    image:
                      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
                  },
                ].map((item, index) => (
                  <motion.div key={index} variants={rotateIn}>
                    <motion.div
                      whileHover={{ 
                        scale: 1.03,
                        rotateY: 5,
                        rotateX: 5,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <Card
                        sx={{
                          textAlign: "left",
                          height: "100%",
                          py: 4,
                          px: 3.5,
                          background:
                            currentTheme.palette.mode === "dark"
                              ? `linear-gradient(160deg, ${alpha(
                                  colors.graphite,
                                  0.95
                                )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                              : `linear-gradient(160deg, ${alpha(
                                  colors.parchment,
                                  0.95
                                )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                          transition: "all 0.3s ease",
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Box
                            sx={{
                              height: 170,
                              borderRadius: 2.5,
                              mb: 2.5,
                              backgroundImage: `url('${item.image}')`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              boxShadow: "0 18px 35px rgba(0,0,0,0.2)",
                            }}
                          />
                        </motion.div>
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}
                        >
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.subtitle}
                        </Typography>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </Box>
            </motion.div>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                  gap: 3,
                }}
              >
                {[
                  { title: "Grades 9-12", subtitle: "Secondary Education" },
                  { title: "Model School", subtitle: "Excellence Initiative" },
                  { title: "University Campus", subtitle: "Prime Location" },
                ].map((item, index) => (
                  <motion.div key={index} variants={fadeUp}>
                    <Card
                      sx={{
                        textAlign: "center",
                        py: 3,
                        px: 2,
                        background:
                          currentTheme.palette.mode === "dark"
                            ? `linear-gradient(160deg, ${alpha(
                                colors.graphite,
                                0.95
                              )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                            : `linear-gradient(160deg, ${alpha(
                                colors.parchment,
                                0.95
                              )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                      }}
                    >
                      <EmojiEvents
                        sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
                      />
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.subtitle}
                      </Typography>
                    </Card>
                  </motion.div>
                ))}
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* FAQ Section */}
        <Box
          sx={{
            py: 10,
            px: 2,
            bgcolor: currentTheme.palette.mode === "dark" ? colors.graphite : colors.eggshell,
          }}
        >
          <Container maxWidth="lg">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <Box sx={{ textAlign: "center", mb: 6 }}>
                <Typography
                  variant="h3"
                  component="h2"
                  sx={{ mb: 2, fontWeight: 700, color: "text.primary" }}
                >
                  Frequently Asked Questions
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ maxWidth: 600, mx: "auto" }}
                >
                  Find answers to common questions about the Student Information Management System
                </Typography>
              </Box>
              <Box sx={{ maxWidth: 900, mx: "auto" }}>
                {[
                  {
                    question: "How do I register as a student?",
                    answer: "Students can register through the system by creating an account using their student ID. You'll need to provide personal information, contact details, and upload required documents. The registration process is verified by school administration.",
                  },
                  {
                    question: "Can parents access their child's academic records?",
                    answer: "Yes, parents can access their child's academic records, attendance, and grades through the parent portal. Each parent account is linked to their child's profile for secure access.",
                  },
                  {
                    question: "How do teachers submit grades?",
                    answer: "Teachers can submit grades through the teacher dashboard. The system allows for easy grade entry, automatic calculations, and grade report generation. All submissions are logged for audit purposes.",
                  },
                  {
                    question: "What if I forget my password?",
                    answer: "You can reset your password using the 'Forgot Password' link on the login page. You'll receive a password reset link via email. If you don't receive the email, please contact the school IT support.",
                  },
                  {
                    question: "Is the system secure?",
                    answer: "Yes, the system uses industry-standard encryption and security measures. All data is encrypted in transit and at rest. Regular security audits are conducted to ensure the safety of student and staff information.",
                  },
                  {
                    question: "How can I contact technical support?",
                    answer: "Technical support is available during school hours (8AM-5PM, Mon-Fri). You can reach us via the contact form on this page, email at support@school.edu, or visit the IT office in person.",
                  },
                ].map((faq, index) => (
                  <motion.div key={index} variants={fadeUp}>
                    <Accordion
                      sx={{
                        mb: 2,
                        background:
                          currentTheme.palette.mode === "dark"
                            ? `linear-gradient(160deg, ${alpha(
                                colors.graphite,
                                0.95
                              )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                            : `linear-gradient(160deg, ${alpha(
                                colors.parchment,
                                0.95
                              )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                        border: `1px solid ${alpha(
                          currentTheme.palette.primary.main,
                          0.15
                        )}`,
                        "&:before": {
                          display: "none",
                        },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography sx={{ fontWeight: 600, color: "text.primary" }}>
                          {faq.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                          {faq.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </motion.div>
                ))}
              </Box>
            </motion.div>
          </Container>
        </Box>

        {/* System Access Section */}
        <Container maxWidth="lg" sx={{ py: 10 }}>
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{ mb: 2, fontWeight: 700, color: "text.primary" }}
            >
              System Access
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              Different users have different access levels based on their role
              in the school community.
            </Typography>
          </Box>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                },
                gap: 3,
              }}
            >
              {roles.map((role, index) => (
                <motion.div key={index} variants={fadeLeft}>
                  <motion.div
                    whileHover={{ 
                      scale: 1.03,
                      rotateY: 5,
                      boxShadow: "0 15px 35px rgba(0,0,0,0.15)"
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <Card
                      sx={{
                        height: "100%",
                        background:
                          currentTheme.palette.mode === "dark"
                            ? `linear-gradient(160deg, ${alpha(
                                colors.graphite,
                                0.95
                              )} 0%, ${alpha(colors.midnight, 0.9)} 100%)`
                            : `linear-gradient(160deg, ${alpha(
                                colors.parchment,
                                0.95
                              )} 0%, ${alpha(colors.eggshell, 0.9)} 100%)`,
                        transition: "all 0.3s ease",
                      }}
                    >
                      <CardContent>
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Box
                            sx={{ display: "flex", alignItems: "center", mb: 2 }}
                          >
                            <People sx={{ color: "primary.main", mr: 1 }} />
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 600, color: "text.primary" }}
                            >
                              {role.title}
                            </Typography>
                          </Box>
                        </motion.div>
                        <Typography variant="body2" color="text.secondary">
                          {role.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </Box>
          </motion.div>
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <Box sx={{ textAlign: "center", mt: 6 }}>
              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  href="/login"
                  endIcon={<ArrowUpRight size={20} />}
                  sx={{
                    fontWeight: 600,
                    borderRadius: 999,
                    px: 4,
                    py: 1.5,
                    boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                    "&:hover": {
                      transform: "scale(1.05) translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                    },
                    "&:focus-visible": {
                      outline: "3px solid white",
                      outlineOffset: 2,
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Get Started
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        </Container>

        {/* Contact Section */}
        <Box
          id="contact"
          sx={{
            py: 10,
            color: "white",
            background:
              currentTheme.palette.mode === "dark"
                ? `linear-gradient(140deg, ${colors.graphite} 0%, ${colors.midnight} 60%)`
                : `linear-gradient(140deg, ${colors.charcoal} 0%, ${colors.forest} 60%)`,
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h3"
              component="h2"
              sx={{ mb: 6, textAlign: "center", color: "white" }}
            >
              Get In Touch
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
                gap: 4,
                mb: 6,
              }}
            >
              {/* Contact Information */}
              <motion.div
                variants={staggerSlow}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 3,
                  }}
                >
                  {["Address", "Contact", "Office Hours", "Support"].map((title, index) => {
                    const icons = [LocationOn, Phone, AccessTime, Email];
                    const Icon = icons[index];
                    const contents = [
                      "Haramaya University Campus<br />East Hararghe Zone<br />Oromia Region, Ethiopia",
                      "Phone: +251 XX XXX XXXX<br />Email: info@haramaya.edu.et",
                      "Mon-Fri: 8AM-5PM<br />Sat: 8AM-12PM",
                      "Technical: support@school.edu<br />Admissions: admissions@school.edu",
                    ];
                    return (
                      <motion.div key={index} variants={fadeRight}>
                        <motion.div
                          whileHover={{ 
                            scale: 1.03,
                            rotateY: 3,
                            boxShadow: "0 15px 35px rgba(0,0,0,0.2)"
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          style={{ transformStyle: "preserve-3d" }}
                        >
                          <Card
                            sx={{
                              bgcolor: alpha("#FFFFFF", 0.06),
                              border: `1px solid ${alpha("#FFFFFF", 0.12)}`,
                              transition: "all 0.3s ease",
                            }}
                          >
                            <CardContent>
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                              >
                                <Box
                                  sx={{ display: "flex", alignItems: "center", mb: 2 }}
                                >
                                  <Icon sx={{ color: colors.sageLight, mr: 1 }} />
                                  <Typography variant="h6" sx={{ color: "white" }}>
                                    {title}
                                  </Typography>
                                </Box>
                              </motion.div>
                              <Typography
                                variant="body2"
                                sx={{ color: "rgba(255,255,255,0.7)" }}
                                dangerouslySetInnerHTML={{ __html: contents[index] }}
                              />
                            </CardContent>
                          </Card>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </Box>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <motion.div
                  whileHover={{ 
                    scale: 1.01,
                    boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Card
                    sx={{
                      bgcolor: alpha("#FFFFFF", 0.06),
                      border: `1px solid ${alpha("#FFFFFF", 0.12)}`,
                      backdropFilter: "blur(10px)",
                      transition: "all 0.3s ease",
                    }}
                  >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h5"
                      sx={{ mb: 3, color: "white", fontWeight: 600 }}
                    >
                      Send us a Message
                    </Typography>
                    <Collapse in={submitSuccess}>
                      <Alert severity="success" sx={{ mb: 3 }}>
                        Thank you for your message! We will get back to you soon.
                      </Alert>
                    </Collapse>
                    <Collapse in={!!submitError}>
                      <Alert severity="error" sx={{ mb: 3 }}>
                        {submitError}
                      </Alert>
                    </Collapse>
                    <form onSubmit={handleContactSubmit}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}
                      >
                        <TextField
                          fullWidth
                          label="Your Name"
                          value={contactForm.name}
                          onChange={(e) =>
                            handleContactFormChange("name", e.target.value)
                          }
                          error={!!formErrors.name}
                          helperText={formErrors.name}
                          required
                          sx={{
                            "& .MuiInputLabel-root": {
                              color: "rgba(255,255,255,0.7)",
                            },
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: formErrors.name ? "#f44336" : "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: formErrors.name ? "#f44336" : "rgba(255,255,255,0.5)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: formErrors.name ? "#f44336" : colors.sageLight,
                              },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#f44336",
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person
                                  sx={{ color: "rgba(255,255,255,0.5)" }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          fullWidth
                          label="Email Address"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) =>
                            handleContactFormChange("email", e.target.value)
                          }
                          error={!!formErrors.email}
                          helperText={formErrors.email}
                          required
                          sx={{
                            "& .MuiInputLabel-root": {
                              color: "rgba(255,255,255,0.7)",
                            },
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: formErrors.email ? "#f44336" : "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: formErrors.email ? "#f44336" : "rgba(255,255,255,0.5)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: formErrors.email ? "#f44336" : colors.sageLight,
                              },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#f44336",
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email
                                  sx={{ color: "rgba(255,255,255,0.5)" }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          fullWidth
                          label="Subject"
                          value={contactForm.subject}
                          onChange={(e) =>
                            handleContactFormChange("subject", e.target.value)
                          }
                          error={!!formErrors.subject}
                          helperText={formErrors.subject}
                          required
                          sx={{
                            "& .MuiInputLabel-root": {
                              color: "rgba(255,255,255,0.7)",
                            },
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: formErrors.subject ? "#f44336" : "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: formErrors.subject ? "#f44336" : "rgba(255,255,255,0.5)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: formErrors.subject ? "#f44336" : colors.sageLight,
                              },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#f44336",
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Subject
                                  sx={{ color: "rgba(255,255,255,0.5)" }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          fullWidth
                          label="Message"
                          multiline
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) =>
                            handleContactFormChange("message", e.target.value)
                          }
                          error={!!formErrors.message}
                          helperText={formErrors.message}
                          required
                          sx={{
                            "& .MuiInputLabel-root": {
                              color: "rgba(255,255,255,0.7)",
                            },
                            "& .MuiOutlinedInput-root": {
                              color: "white",
                              "& fieldset": {
                                borderColor: formErrors.message ? "#f44336" : "rgba(255,255,255,0.3)",
                              },
                              "&:hover fieldset": {
                                borderColor: formErrors.message ? "#f44336" : "rgba(255,255,255,0.5)",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: formErrors.message ? "#f44336" : colors.sageLight,
                              },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#f44336",
                            },
                          }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment
                                position="start"
                                sx={{ alignSelf: "flex-start", mt: 2 }}
                              >
                                <Message
                                  sx={{ color: "rgba(255,255,255,0.5)" }}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={isSubmitting}
                          endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                          sx={{
                            py: 1.5,
                            borderRadius: 999,
                            fontSize: "1rem",
                            fontWeight: 600,
                            background: `linear-gradient(45deg, ${colors.sageLight}, ${colors.sage})`,
                            "&:hover": {
                              background: `linear-gradient(45deg, ${colors.sage}, ${colors.sageDark})`,
                              transform: "translateY(-2px)",
                              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                            },
                            "&:disabled": {
                              background: "rgba(255,255,255,0.3)",
                            },
                            transition: "all 0.3s ease",
                          }}
                        >
                          {isSubmitting ? "Sending..." : "Send Message"}
                        </Button>
                      </Box>
                    </form>
                  </CardContent>
                </Card>
                </motion.div>
              </motion.div>
            </Box>
          </Container>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 4,
            px: 2,
            bgcolor:
              currentTheme.palette.mode === "dark"
                ? colors.graphite
                : colors.charcoal,
            borderTop: `1px solid ${alpha(colors.sageDark, 0.4)}`,
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <School sx={{ mr: 1, color: colors.sageLight, fontSize: 28 }} />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    Haramaya University Non-Boarding Secondary School
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    Student Information Management System
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    "&:hover": { color: "white" },
                  }}
                >
                  Privacy Policy
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    "&:hover": { color: "white" },
                  }}
                >
                  Terms of Service
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    "&:hover": { color: "white" },
                  }}
                >
                  Contact
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.4)" }}
              >
                © 2026 SIMS - Student Information Management System. All rights
                reserved.
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
