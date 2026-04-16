import {
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  useMutation,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook for mutations with built-in toast notifications
 *
 * @param options - Mutation options
 * @param successMessage - Toast message on success
 * @param errorMessage - Toast message on error (default: 'Operation failed')
 * @returns UseMutationResult
 */
export function useMutationWithToast<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
  successMessage?: string,
  errorMessage: string = 'Operation failed',
): UseMutationResult<TData, TError, TVariables, TContext> {
  return useMutation({
    ...options,
    onSuccess: (data, variables, onMutateResult, context) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      options.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      const message = error instanceof Error ? error.message : errorMessage;
      toast.error(message);
      options.onError?.(error, variables, onMutateResult, context);
    },
  });
}

/**
 * Custom hook for queries with built-in error handling
 *
 * @param options - Query options
 * @param errorMessage - Toast message on error (default: 'Failed to load data')
 * @returns UseQueryResult
 */
export function useQueryWithErrorHandling<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  errorMessage: string = 'Failed to load data',
): UseQueryResult<TData, TError> {
  const query = useQuery({
    ...options,
  });

  useEffect(() => {
    if (!query.error) {
      return;
    }

    const message =
      query.error instanceof Error ? query.error.message : errorMessage;
    toast.error(message);
  }, [errorMessage, query.error]);

  return query;
}
