import React from "react";
import { Box, Typography, Button, alpha, useTheme } from "@mui/material";
import { Add, SearchOff } from "@mui/icons-material";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  searchQuery?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  searchQuery,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          mb: 3,
        }}
      >
        {icon || (
          <SearchOff sx={{ fontSize: 40, color: theme.palette.primary.main }} />
        )}
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: theme.palette.text.primary,
          mb: 1,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            maxWidth: 400,
            mb: 3,
          }}
        >
          {description}
        </Typography>
      )}

      {searchQuery && (
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            mb: 2,
          }}
        >
          No results found for "{searchQuery}"
        </Typography>
      )}

      {action && (
        <Button
          variant="contained"
          onClick={action.onClick}
          startIcon={<Add />}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            "&:hover": {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
            },
          }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}

export function TableEmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <EmptyState
      title="No data available"
      description={
        searchQuery
          ? "Try adjusting your search criteria"
          : "There are no records to display"
      }
      searchQuery={searchQuery}
    />
  );
}
