export type UserRole = 'SystemAdmin' | 'SchoolAdmin' | 'Teacher' | 'Student' | 'Parent';

export type UserStatus = 'Active' | 'Inactive' | 'Pending';

export interface AppearanceSettings {
  darkMode: boolean;
  colorTheme: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'slate';
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
  density: 'compact' | 'comfortable' | 'spacious';
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  sidebarCollapsed: boolean;
  showAnimations: boolean;
}

export interface User {
  _id: string;
  id?: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  mustSetPassword: boolean;
  permissions?: string[];
  profileImage?: string;
  signature?: string;
  appearanceSettings?: AppearanceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
}
