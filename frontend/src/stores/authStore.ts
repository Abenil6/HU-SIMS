import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type User } from '@/types/user';
import {
  captureAnalyticsEvent,
  identifyAnalyticsUser,
  resetAnalytics,
} from '@/lib/analytics';

const normalizeAuthUser = (user: User): User => ({
  ...user,
  _id: user._id || user.id || '',
  id: user.id || user._id,
});

interface AuthState {
  user: User | null;
  token: string | null;
  pendingTwoFactorToken: string | null;
  pendingTwoFactorEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedChildId: string | null;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean; message?: string }>;
  verifyTwoFactor: (code: string) => Promise<void>;
  clearTwoFactorChallenge: () => void;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  updateUser: (user: Partial<User>) => void;
  setSelectedChildId: (childId: string | null) => void;
  demoLogin: (role: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      pendingTwoFactorToken: null,
      pendingTwoFactorEmail: null,
      isAuthenticated: false,
      isLoading: false,
      selectedChildId: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/login`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
          }

          const data = await response.json();
          if (data.requiresTwoFactor) {
            set({
              pendingTwoFactorToken: data.challengeToken,
              pendingTwoFactorEmail: email,
              isLoading: false,
            });
            return { requiresTwoFactor: true, message: data.message };
          }

          // Fetch full profile to ensure latest fields (e.g. profileImage)
          const meResponse = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            }
          );
          const meJson = meResponse.ok ? await meResponse.json() : null;
          const fullUser = normalizeAuthUser(meJson?.data || meJson?.user || data.user);
          set({
            user: fullUser,
            token: data.token,
            pendingTwoFactorToken: null,
            pendingTwoFactorEmail: null,
            isAuthenticated: true,
            isLoading: false,
          });
          // Keep compatibility with modules that still read localStorage token directly.
          localStorage.setItem('token', data.token);
          identifyAnalyticsUser({
            id: fullUser.id || fullUser._id,
            email: fullUser.email,
            role: fullUser.role,
            firstName: fullUser.firstName,
            lastName: fullUser.lastName,
          });
          captureAnalyticsEvent('auth_login_success', {
            role: fullUser.role,
            two_factor: false,
          });
          return {};
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyTwoFactor: async (code: string) => {
        set({ isLoading: true });
        try {
          const challengeToken = get().pendingTwoFactorToken;
          if (!challengeToken) {
            throw new Error('No verification challenge found');
          }

          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/verify-2fa`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ challengeToken, code }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Verification failed');
          }

          const data = await response.json();
          const meResponse = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            }
          );
          const meJson = meResponse.ok ? await meResponse.json() : null;
          const fullUser = normalizeAuthUser(meJson?.data || meJson?.user || data.user);

          set({
            user: fullUser,
            token: data.token,
            pendingTwoFactorToken: null,
            pendingTwoFactorEmail: null,
            isAuthenticated: true,
            isLoading: false,
          });
          localStorage.setItem('token', data.token);
          identifyAnalyticsUser({
            id: fullUser.id || fullUser._id,
            email: fullUser.email,
            role: fullUser.role,
            firstName: fullUser.firstName,
            lastName: fullUser.lastName,
          });
          captureAnalyticsEvent('auth_login_success', {
            role: fullUser.role,
            two_factor: true,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      clearTwoFactorChallenge: () => {
        set({
          pendingTwoFactorToken: null,
          pendingTwoFactorEmail: null,
        });
      },

      logout: () => {
        const currentUser = get().user;
        captureAnalyticsEvent('auth_logout', {
          role: currentUser?.role,
        });
        resetAnalytics();
        set({
          user: null,
          token: null,
          pendingTwoFactorToken: null,
          pendingTwoFactorEmail: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
      },

      setUser: (user: User) => {
        set({ user: normalizeAuthUser(user) });
      },

      setToken: (token: string) => {
        localStorage.setItem('token', token);
        set({ token, isAuthenticated: true });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: normalizeAuthUser({ ...currentUser, ...userData } as User) });
        }
      },

      setSelectedChildId: (childId: string | null) => {
        set({ selectedChildId: childId });
      },

      // Demo login for testing without backend
      demoLogin: (role: string) => {
        const demoUsers: Record<string, User> = {
          SystemAdmin: {
            _id: 'demo-superadmin',
            id: 'demo-superadmin',
            email: 'admin@school.com',
            username: 'admin',
            firstName: 'System',
            lastName: 'Admin',
            role: 'SystemAdmin',
            status: 'Active',
            isVerified: true,
            mustSetPassword: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          SchoolAdmin: {
            _id: 'demo-schooladmin',
            id: 'demo-schooladmin',
            email: 'schooladmin@school.com',
            username: 'schooladmin',
            firstName: 'School',
            lastName: 'Admin',
            role: 'SchoolAdmin',
            status: 'Active',
            isVerified: true,
            mustSetPassword: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          Teacher: {
            _id: 'demo-teacher',
            id: 'demo-teacher',
            email: 'teacher@school.com',
            username: 'teacher',
            firstName: 'John',
            lastName: 'Teacher',
            role: 'Teacher',
            status: 'Active',
            isVerified: true,
            mustSetPassword: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          Student: {
            _id: 'demo-student',
            id: 'demo-student',
            email: 'student@school.com',
            username: 'student',
            firstName: 'Jane',
            lastName: 'Student',
            role: 'Student',
            status: 'Active',
            isVerified: true,
            mustSetPassword: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          Parent: {
            _id: 'demo-parent',
            id: 'demo-parent',
            email: 'parent@school.com',
            username: 'parent',
            firstName: 'Parent',
            lastName: 'User',
            role: 'Parent',
            status: 'Active',
            isVerified: true,
            mustSetPassword: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        const user = demoUsers[role];
        if (user) {
          set({
            user,
            token: 'demo-token',
            isAuthenticated: true,
          });
          identifyAnalyticsUser({
            id: user.id || user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          });
          captureAnalyticsEvent('auth_login_success', {
            role: user.role,
            demo: true,
            two_factor: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        selectedChildId: state.selectedChildId,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep legacy localStorage token in sync after reload
        const token = state?.token;
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      },
    }
  )
);

// Role hierarchy for permission checking
export const roleHierarchy: Record<string, number> = {
  SystemAdmin: 5,
  SchoolAdmin: 4,
  Teacher: 3,
  Parent: 2,
  Student: 1,
};

export const hasPermission = (user: User | null, requiredRoles: string[]): boolean => {
  if (!user) return false;
  if (requiredRoles.length === 0) return true;
  const userRoleLevel = roleHierarchy[user.role] || 0;
  return requiredRoles.some((role) => (roleHierarchy[role] || 0) <= userRoleLevel);
};
