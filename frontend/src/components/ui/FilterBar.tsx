import {
  Box,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  alpha,
  useTheme,
} from "@mui/material";
import { Search, Add, FileDownload } from "@mui/icons-material";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    name: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }>;
  onAdd?: () => void;
  onExport?: () => void;
  addText?: string;
  showExport?: boolean;
  showAdd?: boolean;
  exporting?: boolean;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onAdd,
  onExport,
  addText = "Add New",
  showExport = false,
  showAdd = true,
  exporting = false,
}: FilterBarProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        mb: 3,
      }}
    >
      {/* Search Field */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
          px: 2,
          py: 0.5,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          flex: 1,
          minWidth: 250,
          maxWidth: 400,
        }}
      >
        <Search sx={{ color: theme.palette.text.secondary, mr: 1 }} />
        <TextField
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          variant="standard"
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            flex: 1,
            "& .MuiInputBase-input": {
              fontSize: "0.875rem",
              color: theme.palette.text.primary,
            },
          }}
        />
      </Box>

      {/* Filters */}
      {filters.map((filter) => (
        <FormControl
          key={filter.name}
          size="small"
          sx={{
            minWidth: 150,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              "& fieldset": {
                borderColor: alpha(theme.palette.primary.main, 0.15),
              },
              "&:hover fieldset": {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
              },
            },
          }}
        >
          <InputLabel sx={{ color: theme.palette.text.secondary }}>
            {filter.label}
          </InputLabel>
          <Select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            label={filter.label}
          >
            <MenuItem value="">All</MenuItem>
            {filter.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ))}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {showExport && onExport && (
          <Button
            variant="outlined"
            onClick={onExport}
            startIcon={<FileDownload />}
            disabled={exporting}
            sx={{
              borderColor: alpha(theme.palette.primary.main, 0.3),
              color: theme.palette.text.primary,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            {exporting ? "Exporting..." : "Export"}
          </Button>
        )}

        {showAdd && onAdd && (
          <Button
            variant="contained"
            onClick={onAdd}
            startIcon={<Add />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              "&:hover": {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              },
            }}
          >
            {addText}
          </Button>
        )}
      </Box>
    </Box>
  );
}
