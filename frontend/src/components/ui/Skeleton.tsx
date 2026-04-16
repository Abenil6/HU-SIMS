import { Box, Skeleton } from '@mui/material';

interface SkeletonCardProps {
  width?: number | string;
  height?: number | string;
}

/**
 * Skeleton Card Component
 * 
 * Placeholder for card components during loading state.
 */
export function SkeletonCard({ width = '100%', height = 120 }: SkeletonCardProps) {
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Skeleton
        variant="rectangular"
        width="100%"
        height="100%"
        animation="wave"
        sx={{ borderRadius: 3 }}
      />
    </Box>
  );
}

/**
 * Stats Card Skeleton
 * 
 * Placeholder for statistics cards during loading.
 */
export function SkeletonStatsCard() {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Skeleton variant="circular" width={48} height={48} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" />
      </Box>
    </Box>
  );
}

/**
 * Table Skeleton
 * 
 * Placeholder for data tables during loading.
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Skeleton variant="text" width="30%" height={40} />
        <Skeleton variant="text" width="20%" height={40} />
        <Skeleton variant="text" width="20%" height={40} />
      </Box>
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            gap: 2,
            mb: 1,
            p: 2,
            borderRadius: 2,
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </Box>
          <Skeleton variant="text" width="20%" />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Dashboard Skeleton
 * 
 * Placeholder for entire dashboard during initial load.
 */
export function SkeletonDashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width="40%" height={60} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStatsCard key={index} />
        ))}
      </Box>

      <Box sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Box>
    </Box>
  );
}

/**
 * List Item Skeleton
 * 
 * Placeholder for list items during loading.
 */
export function SkeletonListItem({ avatar = true }: { avatar?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 2,
      }}
    >
      {avatar && <Skeleton variant="circular" width={40} height={40} />}
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="30%" />
      </Box>
      <Skeleton variant="text" width={60} />
    </Box>
  );
}

/**
 * Form Skeleton
 * 
 * Placeholder for form fields during loading.
 */
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <Box sx={{ p: 3 }}>
      {Array.from({ length: fields }).map((_, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Skeleton variant="text" width="30%" sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={40} />
        </Box>
      ))}
      <Skeleton variant="rectangular" width={120} height={36} />
    </Box>
  );
}
