import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Home, Refresh } from '@mui/icons-material';

interface ErrorPageProps {
  error?: Error;
  statusCode?: number;
  message?: string;
}

/**
 * Error Page Component
 * 
 * Displayed when an error occurs or when accessing unauthorized pages.
 * Can be used for 404, 500, or general error pages.
 */
export function ErrorPage({ error, statusCode, message }: ErrorPageProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 3,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: 'center',
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(244, 67, 54, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <ErrorIcon sx={{ fontSize: 50, color: 'error.main' }} />
        </Box>

        {statusCode && (
          <Typography variant="h1" fontWeight={900} color="error.main" sx={{ fontSize: 72, lineHeight: 1 }}>
            {statusCode}
          </Typography>
        )}

        <Typography variant="h5" fontWeight={700} gutterBottom>
          {statusCode === 404 ? 'Page Not Found' : statusCode === 403 ? 'Access Denied' : 'Something Went Wrong'}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {message || (
            statusCode === 404
              ? "The page you're looking for doesn't exist."
              : statusCode === 403
              ? "You don't have permission to access this page."
              : "We're sorry for the inconvenience. Please try again later."
          )}
        </Typography>

        {error && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              textAlign: 'left',
              background: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 2,
              fontSize: '0.875rem',
            }}
          >
            <Typography variant="caption" fontWeight={600} color="error">
              Technical Details:
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, wordBreak: 'break-word' }}
            >
              {error.toString()}
            </Typography>
          </Paper>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={handleGoHome}
            size="large"
          >
            Go Home
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleReload}
            size="large"
          >
            Reload Page
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default ErrorPage;
