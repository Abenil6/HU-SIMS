import { QueryClient } from '@tanstack/react-query';

/**
 * Query Client Configuration
 * 
 * Global settings for TanStack Query:
 * - staleTime: 5 minutes (data is fresh for 5 min)
 * - retry: 1 (retry failed requests once)
 * - refetchOnWindowFocus: false (don't refetch when window regains focus)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
    },
  },
});
