import { apiGet, apiPost } from "./api";
import { debug } from "@/lib/debug";
const MAX_ALERTS_LIMIT = 200;
const DEFAULT_ALERTS_LIMIT = 20;

const resolveAlertsLimit = (limit?: number) => {
  if (!Number.isFinite(limit)) return DEFAULT_ALERTS_LIMIT;
  return Math.min(Math.max(1, Number(limit)), MAX_ALERTS_LIMIT);
};

// Absence alert types
export interface AbsenceAlert {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    studentProfile?: {
      grade: string;
      section: string;
    };
  };
  academicYear: string;
  grade: string;
  section: string;
  date: string;
  period: string;
  subject?: string;
  teacher?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  reason?: string;
  alertType: 'FirstAbsence' | 'ConsecutiveAbsence' | 'ThresholdReached' | 'PatternDetected';
  consecutiveCount: number;
  notificationStatus: 'Pending' | 'Sent' | 'Failed' | 'Read';
  parents: {
    parent: string;
    status: 'Pending' | 'Sent' | 'Read';
    sentAt?: string;
    readAt?: string;
  }[];
  parentResponse?: {
    responded: boolean;
    response: 'Acknowledged' | 'Excused' | 'Unexcused' | null;
    responseDate?: string;
    responseNote?: string;
  };
  status: 'Active' | 'Resolved' | 'Dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceAlertStats {
  totalAlerts: number;
  unresolvedAlerts: number;
  sentNotifications: number;
  alertsByGrade: { _id: string; count: number }[];
  alertsByType: { _id: string; count: number }[];
}

// API Service
export const absenceAlertService = {
  // ============ PARENT ============

  // Get parent alerts
  getParentAlerts: async () => {
    debug.absenceAlert('Fetching parent alerts');
    const response = await apiGet<{ data: AbsenceAlert[]; unreadCount: number }>("/absence-alerts/parent");
    debug.absenceAlert('Parent alerts response:', response);
    return response;
  },

  // Mark alert as read
  markAsRead: async (id: string) => {
    debug.absenceAlert('Marking alert as read:', id);
    const response = await apiPost<AbsenceAlert>(`/absence-alerts/${id}/read`);
    debug.absenceAlert('Marked as read:', response);
    return response;
  },

  // Respond to alert
  respondToAlert: async (id: string, data: {
    response: 'Acknowledged' | 'Excused' | 'Unexcused';
    responseNote?: string;
  }) => {
    debug.absenceAlert('Responding to alert:', id, data);
    const response = await apiPost<AbsenceAlert>(`/absence-alerts/${id}/respond`, data);
    debug.absenceAlert('Response:', response);
    return response;
  },

  // ============ STUDENT ============

  // Get student alerts
  getStudentAlerts: async () => {
    debug.absenceAlert('Fetching student alerts');
    const response = await apiGet<AbsenceAlert[]>("/absence-alerts/student");
    debug.absenceAlert('Student alerts:', response);
    return response;
  },

  // ============ ADMIN/TEACHER ============

  // Get all alerts
  getAlerts: async (params?: {
    academicYear?: string;
    grade?: string;
    section?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    debug.absenceAlert('Fetching all alerts with params:', params);
    const response = await apiGet<{ data: AbsenceAlert[]; pagination: any }>("/absence-alerts", { ...params, limit: resolveAlertsLimit(params?.limit) });
    debug.absenceAlert('All alerts:', response);
    return response;
  },

  // Create alert from attendance
  createAlert: async (attendanceId: string) => {
    debug.absenceAlert('Creating alert from attendance:', attendanceId);
    const response = await apiPost<AbsenceAlert>(`/absence-alerts/attendance/${attendanceId}`);
    debug.absenceAlert('Created alert:', response);
    return response;
  },

  // Batch create alerts
  batchCreateAlerts: async (data: {
    academicYear: string;
    date: string;
    grade?: string;
    section?: string;
  }) => {
    debug.absenceAlert('Batch creating alerts:', data);
    const response = await apiPost<{ created: number; errors: number; errorDetails: any[] }>("/absence-alerts/batch", data);
    debug.absenceAlert('Batch result:', response);
    return response;
  },

  // Send notification
  sendNotification: async (id: string, method: 'SMS' | 'Email' | 'Push' | 'InApp') => {
    debug.absenceAlert('Sending notification:', id, method);
    const response = await apiPost<AbsenceAlert>(`/absence-alerts/${id}/notify`, { method });
    debug.absenceAlert('Notification sent:', response);
    return response;
  },

  // Resolve alert
  resolveAlert: async (id: string) => {
    debug.absenceAlert('Resolving alert:', id);
    const response = await apiPost<AbsenceAlert>(`/absence-alerts/${id}/resolve`);
    debug.absenceAlert('Resolved:', response);
    return response;
  },

  // Get alert statistics
  getStats: async (academicYear?: string) => {
    debug.absenceAlert('Fetching alert stats:', academicYear);
    const response = await apiGet<AbsenceAlertStats>("/absence-alerts/stats", { academicYear });
    debug.absenceAlert('Stats:', response);
    return response;
  },
};

export default absenceAlertService;
