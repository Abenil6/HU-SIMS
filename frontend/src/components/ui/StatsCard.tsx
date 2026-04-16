import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { TrendingUp, TrendingDown } from "@mui/icons-material";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "primary",
}: StatsCardProps) {
  const theme = useTheme();

  const colorMap: Record<string, { main: string; light: string }> = {
    primary: {
      main: theme.palette.primary.main,
      light: theme.palette.primary.light,
    },
    secondary: {
      main: theme.palette.secondary.main,
      light: theme.palette.secondary.light,
    },
    success: {
      main: theme.palette.success.main,
      light: theme.palette.success.light,
    },
    warning: {
      main: theme.palette.warning.main,
      light: theme.palette.warning.light,
    },
    error: { main: theme.palette.error.main, light: theme.palette.error.light },
    info: { main: theme.palette.info.main, light: theme.palette.info.light },
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 3,
        border: `1px solid ${alpha(colors.main, 0.1)}`,
        boxShadow: "none",
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(135deg, ${alpha(colors.main, 0.1)} 0%, ${alpha(theme.palette.background.paper as string, 1)} 100%)`
            : `linear-gradient(135deg, ${alpha(colors.main, 0.05)} 0%, ${alpha(theme.palette.background.paper as string, 1)} 100%)`,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 25px ${alpha(colors.main, 0.15)}`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 500,
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                fontFamily: '"Playfair Display", serif',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                sx={{ color: theme.palette.text.secondary, mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 1,
                  color: trend.value >= 0 ? "success.main" : "error.main",
                }}
              >
                {trend.value >= 0 ? (
                  <TrendingUp fontSize="small" />
                ) : (
                  <TrendingDown fontSize="small" />
                )}
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}% {trend.label}
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(colors.main, 0.1),
                color: colors.main,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
