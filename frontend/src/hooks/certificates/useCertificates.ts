import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { certificateService, type Certificate, type GenerateCertificateData } from '@/services/certificateService';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';

/**
 * Hook to fetch certificates with filters
 */
export function useCertificates(params?: {
  studentId?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.certificates.list(params || {}),
    queryFn: () => certificateService.getCertificates(params),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single certificate by ID
 */
export function useCertificate(id: string) {
  return useQuery({
    queryKey: queryKeys.certificates.detail(id),
    queryFn: () => certificateService.getCertificate(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch student certificates
 */
export function useStudentCertificates(studentId: string) {
  return useQuery({
    queryKey: queryKeys.certificates.byStudent(studentId),
    queryFn: () => certificateService.getStudentCertificates(studentId),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to generate a certificate
 */
export function useGenerateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateCertificateData) => certificateService.generateCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      toast.success('Certificate generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate certificate');
    },
  });
}

/**
 * Hook to download certificate as PDF
 */
export function useDownloadCertificate() {
  return useMutation({
    mutationFn: (id: string) => certificateService.downloadCertificate(id),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to download certificate');
    },
  });
}

/**
 * Hook to verify a certificate
 */
export function useVerifyCertificate() {
  return useMutation({
    mutationFn: (certificateNumber: string) => certificateService.verifyCertificate(certificateNumber),
    onSuccess: () => {
      toast.success('Certificate verified');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Invalid certificate');
    },
  });
}

/**
 * Hook to create a certificate manually
 */
export function useCreateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateCertificateData) => certificateService.createCertificate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      toast.success('Certificate created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create certificate');
    },
  });
}

/**
 * Hook to update a certificate
 */
export function useUpdateCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Certificate> }) =>
      certificateService.updateCertificate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      toast.success('Certificate updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update certificate');
    },
  });
}

/**
 * Hook to delete a certificate
 */
export function useDeleteCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificateService.deleteCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates.all });
      toast.success('Certificate deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete certificate');
    },
  });
}
