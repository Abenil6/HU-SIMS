import { Box, Typography, Chip } from "@mui/material";

export interface HonorRollBadgeProps {
  honorRoll: boolean;
  honorRollType: string | null;
  size?: "small" | "medium" | "large";
  showDetails?: boolean;
}

const getHonorRollColor = (type: string | null): string => {
  switch (type) {
    case "First Class":
      return "#FFD700"; // Gold
    case "Second Class Upper":
      return "#C0C0C0"; // Silver
    case "Second Class Lower":
      return "#CD7F32"; // Bronze
    case "Third Class":
      return "#4169E1"; // Royal Blue
    default:
      return "#808080"; // Gray
  }
};

const getHonorRollIcon = (type: string | null): string => {
  switch (type) {
    case "First Class":
      return "🏆"; // Trophy
    case "Second Class Upper":
      return "⭐"; // Star
    case "Second Class Lower":
      return "🎖️"; // Medal
    case "Third Class":
      return "📜"; // Scroll/Certificate
    default:
      return "🎓"; // Graduate
  }
};

export function HonorRollBadge({
  honorRoll,
  honorRollType,
  size = "medium",
  showDetails = true,
}: HonorRollBadgeProps) {
  if (!honorRoll) {
    return null;
  }

  const colors = {
    backgroundColor: `${getHonorRollColor(honorRollType)}20`,
    borderColor: getHonorRollColor(honorRollType),
    color: getHonorRollColor(honorRollType),
  };

  const fontSizes = {
    small: { icon: 16, text: "0.75rem" },
    medium: { icon: 24, text: "0.875rem" },
    large: { icon: 32, text: "1rem" },
  };

  const { icon, text } = fontSizes[size];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: colors.backgroundColor,
        border: `1px solid ${colors.borderColor}`,
      }}
    >
      <span style={{ fontSize: icon }}>{getHonorRollIcon(honorRollType)}</span>
      {showDetails && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography
            variant="body2"
            sx={{
              color: colors.color,
              fontWeight: 600,
              fontSize: text,
              lineHeight: 1.2,
            }}
          >
            Honor Roll
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: colors.color,
              fontSize: "0.7rem",
              opacity: 0.8,
            }}
          >
            {honorRollType}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default HonorRollBadge;
