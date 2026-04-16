import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Box, Typography, Chip, alpha, useTheme } from "@mui/material";
import { Home, ChevronRight } from "@mui/icons-material";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Determine the correct dashboard route based on user role
  const getDashboardPath = () => {
    switch (user?.role) {
      case "SystemAdmin":
        return "/admin";
      case "SchoolAdmin":
        return "/school-admin";
      case "Teacher":
        return "/teacher";
      case "Student":
        return "/student";
      case "Parent":
        return "/parent";
      default:
        return "/"; // Fallback to landing page
    }
  };

  const allItems = showHome
    ? [{ label: "Home", path: getDashboardPath() }, ...items]
    : items;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 3,
      }}
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;

        return (
          <React.Fragment key={item.path || index}>
            {index > 0 && (
              <ChevronRight
                sx={{
                  fontSize: 18,
                  color: theme.palette.text.secondary,
                }}
              />
            )}
            {isLast ? (
              <Chip
                label={item.label}
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                }}
              />
            ) : (
              <Typography
                variant="body2"
                onClick={() => item.path && navigate(item.path)}
                sx={{
                  color: theme.palette.text.secondary,
                  cursor: item.path ? "pointer" : "default",
                  "&:hover": {
                    color: item.path ? theme.palette.primary.main : undefined,
                  },
                }}
              >
                {index === 0 && showHome && (
                  <Home
                    sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-bottom" }}
                  />
                )}
                {item.label}
              </Typography>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        mb: 3,
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            fontFamily: '"Playfair Display", serif',
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
