import React, { useState, type ReactNode } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
} from "@mui/material";
import { MoreVert, Edit, Delete, Visibility } from "@mui/icons-material";

export interface Column<T> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: "left" | "right" | "center";
  format?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onSort?: (orderBy: string, order: "asc" | "desc") => void;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  onExport?: () => void;
  orderBy?: string;
  order?: "asc" | "desc";
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (selected: string[]) => void;
  actions?: (row: T) => ReactNode;
  menuItems?: (row: T) => ReactNode;
  menuAnchor?: Record<string, HTMLElement | null>;
  onMenuClose?: (id: string) => void;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  loading = false,
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  onRowClick,
  onEdit,
  onDelete,
  onView,
  orderBy = "",
  order = "asc",
  selectable = false,
  selected = [],
  onSelectionChange,
  actions,
  menuItems,
  menuAnchor,
  onMenuClose,
}: DataTableProps<T>) {
  const theme = useTheme();
  const [orderByState, setOrderByState] = useState<string>(orderBy);
  const [orderState, setOrderState] = useState<"asc" | "desc">(order);
  const [internalAnchor, setInternalAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [activeRow, setActiveRow] = useState<T | null>(null);

  const handleSort = (columnId: string) => {
    const isAsc = orderByState === columnId && orderState === "asc";
    setOrderState(isAsc ? "desc" : "asc");
    setOrderByState(columnId);
    onSort?.(columnId, isAsc ? "desc" : "asc");
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(rows.map((row) => String(row.id)));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    onSelectionChange?.(newSelected);
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, row: T) => {
    event.stopPropagation();
    setActiveRow(row);
    if (menuAnchor === undefined || onMenuClose === undefined) {
      setInternalAnchor(event.currentTarget);
    }
  };

  const handleActionClose = () => {
    if (menuAnchor === undefined || onMenuClose === undefined) {
      setInternalAnchor(null);
      setActiveRow(null);
    }
  };

  const getAnchorEl = (rowId: string) => {
    if (menuAnchor !== undefined) {
      return menuAnchor[rowId] || null;
    }
    return activeRow && String(activeRow.id) === rowId ? internalAnchor : null;
  };

  const isActiveRow = (rowId: string) => {
    if (menuAnchor !== undefined) {
      return Boolean(menuAnchor[rowId]);
    }
    return activeRow && String(activeRow.id) === rowId;
  };

  const isSelected = (id: string) => selected.includes(id);

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        boxShadow: "none",
      }}
    >
      {/* Table */}
      <TableContainer sx={{ maxHeight: "calc(100vh - 300px)" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selected.length > 0 && selected.length < rows.length
                    }
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={handleSelectAll}
                    sx={{
                      color: alpha(theme.palette.primary.main, 0.4),
                      "&.Mui-checked": {
                        color: theme.palette.primary.main,
                      },
                    }}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderByState === String(column.id)}
                      direction={
                        orderByState === String(column.id) ? orderState : "asc"
                      }
                      onClick={() => handleSort(String(column.id))}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {(onEdit || onDelete || onView || actions) && (
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Loading...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No data available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const isItemSelected = isSelected(String(row.id));
                return (
                  <TableRow
                    hover
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    selected={isItemSelected}
                    sx={{
                      cursor: onRowClick ? "pointer" : "default",
                      backgroundColor: isItemSelected
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "transparent",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.08,
                        ),
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(String(row.id));
                          }}
                          sx={{
                            color: alpha(theme.palette.primary.main, 0.4),
                            "&.Mui-checked": {
                              color: theme.palette.primary.main,
                            },
                          }}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = (row as any)[column.id];
                      return (
                        <TableCell
                          key={String(column.id)}
                          align={column.align}
                          sx={{
                            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.06)}`,
                          }}
                        >
                          {column.format ? column.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                    {(onEdit || onDelete || onView || actions) && (
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionClick(e, row)}
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {(onPageChange || onRowsPerPageChange) && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={totalCount || rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => onPageChange?.(newPage)}
          onRowsPerPageChange={(e) =>
            onRowsPerPageChange?.(parseInt(e.target.value, 10))
          }
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            "& .MuiTablePagination-actions": {
              color: theme.palette.text.secondary,
            },
          }}
        />
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={activeRow ? getAnchorEl(String(activeRow.id)) : null}
        open={Boolean(activeRow && isActiveRow(String(activeRow.id)))}
        onClose={handleActionClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {onView && activeRow && (
          <MenuItem
            onClick={() => {
              onView(activeRow);
              handleActionClose();
            }}
          >
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>
        )}
        {onEdit && activeRow && (
          <MenuItem
            onClick={() => {
              onEdit(activeRow);
              handleActionClose();
            }}
          >
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {onDelete && activeRow && (
          <MenuItem
            onClick={() => {
              onDelete(activeRow);
              handleActionClose();
            }}
            sx={{ color: theme.palette.error.main }}
          >
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
        {menuItems && activeRow && (
          <>
            {menuItems(activeRow)}
          </>
        )}
      </Menu>
    </Paper>
  );
}
