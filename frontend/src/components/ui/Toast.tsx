import { Toaster, toast } from "react-hot-toast";

/**
 * Toast Provider Component
 * 
 * Global toast notification configuration.
 * Provides success, error, warning, info, and loading toasts.
 */
export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      containerStyle={{ margin: '8px' }}
      toastOptions={{
        duration: 2000,
        style: {
          background: '#363636',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        success: {
          duration: 1800,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            background: '#10b981',
          },
        },
        error: {
          duration: 2500,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            background: '#ef4444',
          },
        },
        loading: {
          duration: Infinity,
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#fff',
          },
          style: {
            background: '#3b82f6',
          },
        },
      }}
    />
  );
}

/**
 * Toast Hook
 * 
 * Provides easy access to toast notification functions.
 * Use throughout the app for consistent user feedback.
 */
export const useToast = () => {
  return {
    /** Success toast - green, 3s duration */
    success: (message: string) => toast.success(message),
    
    /** Error toast - red, 5s duration */
    error: (message: string) => toast.error(message),
    
    /** Warning toast - orange, 4s duration */
    warning: (message: string) => toast(message, {
      duration: 2000,
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    }),
    
    /** Info toast - blue, 4s duration */
    info: (message: string) => toast(message, {
      duration: 2000,
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
      },
    }),
    
    /** Loading toast - blue, infinite duration (must be dismissed manually) */
    loading: (message: string) => toast.loading(message),
    
    /** Dismiss toast programmatically */
    dismiss: (toastId?: string) => toast.dismiss(toastId),
    
    /** Custom toast with full control */
    custom: (message: string, options?: any) => toast(message, options),
  };
};

export { toast };
