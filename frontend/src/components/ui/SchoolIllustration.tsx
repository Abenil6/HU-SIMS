import { Box, useTheme } from "@mui/material";
import { motion } from "framer-motion";

export function SchoolIllustration() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      component={motion.svg}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      viewBox="0 0 400 300"
      sx={{
        width: "100%",
        maxWidth: 500,
        height: "auto",
        display: { xs: "none", md: "block" },
      }}
    >
      {/* Background circle */}
      <circle
        cx="200"
        cy="150"
        r="140"
        fill={isDark ? "rgba(143, 169, 152, 0.1)" : "rgba(26, 74, 58, 0.08)"}
      />
      
      {/* School building base */}
      <rect
        x="100"
        y="140"
        width="200"
        height="120"
        fill={isDark ? "#8FA998" : "#1A4A3A"}
        rx="4"
      />
      
      {/* Roof */}
      <polygon
        points="80,140 200,60 320,140"
        fill={isDark ? "#6B8A78" : "#0F3D2E"}
      />
      
      {/* Door */}
      <rect
        x="175"
        y="180"
        width="50"
        height="80"
        fill={isDark ? "#FDFBF7" : "#2D6B54"}
        rx="2"
      />
      <circle
        cx="215"
        cy="220"
        r="4"
        fill={isDark ? "#1A4A3A" : "#FDFBF7"}
      />
      
      {/* Windows */}
      <rect
        x="120"
        y="160"
        width="40"
        height="40"
        fill={isDark ? "#A8C4B5" : "#2D6B54"}
        rx="2"
      />
      <rect
        x="240"
        y="160"
        width="40"
        height="40"
        fill={isDark ? "#A8C4B5" : "#2D6B54"}
        rx="2"
      />
      
      {/* Window crosses */}
      <line
        x1="140"
        y1="160"
        x2="140"
        y2="200"
        stroke={isDark ? "#6B8A78" : "#1A4A3A"}
        strokeWidth="2"
      />
      <line
        x1="120"
        y1="180"
        x2="160"
        y2="180"
        stroke={isDark ? "#6B8A78" : "#1A4A3A"}
        strokeWidth="2"
      />
      <line
        x1="260"
        y1="160"
        x2="260"
        y2="200"
        stroke={isDark ? "#6B8A78" : "#1A4A3A"}
        strokeWidth="2"
      />
      <line
        x1="240"
        y1="180"
        x2="280"
        y2="180"
        stroke={isDark ? "#6B8A78" : "#1A4A3A"}
        strokeWidth="2"
      />
      
      {/* Flag pole */}
      <line
        x1="200"
        y1="60"
        x2="200"
        y2="30"
        stroke={isDark ? "#FDFBF7" : "#1A4A3A"}
        strokeWidth="3"
      />
      
      {/* Flag */}
      <rect
        x="200"
        y="30"
        width="30"
        height="20"
        fill={isDark ? "#A8C4B5" : "#8FA998"}
      />
      
      {/* Ground */}
      <rect
        x="60"
        y="260"
        width="280"
        height="10"
        fill={isDark ? "#6B8A78" : "#2D6B54"}
        rx="2"
      />
      
      {/* Decorative elements */}
      <circle
        cx="90"
        cy="200"
        r="8"
        fill={isDark ? "rgba(168, 196, 181, 0.5)" : "rgba(143, 169, 152, 0.3)"}
      />
      <circle
        cx="310"
        cy="190"
        r="6"
        fill={isDark ? "rgba(168, 196, 181, 0.5)" : "rgba(143, 169, 152, 0.3)"}
      />
      <circle
        cx="330"
        cy="230"
        r="5"
        fill={isDark ? "rgba(168, 196, 181, 0.5)" : "rgba(143, 169, 152, 0.3)"}
      />
    </Box>
  );
}
