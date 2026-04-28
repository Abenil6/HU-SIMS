import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { apiGet } from "@/services/api";
import { announcementService } from "@/services/announcementService";
import absenceAlertService from "@/services/absenceAlertService";
import messageService from "@/services/messageService";
import notificationReadStateService, {
  type NotificationReadStateMap,
} from "@/services/notificationReadStateService";
import { timetableService } from "@/services/timetableService";
import { useInbox } from "@/hooks/messages/useMessages";
import { useAuthStore } from "@/stores/authStore";
import { queryKeys } from "@/lib/queryKeys";

export type NotificationKind =
  | "message"
  | "announcement"
  | "absence"
  | "grade"
  | "timetable"
  | "system";

export interface DashboardNotification {
  id: string;
  sourceId: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: string;
  unread: boolean;
  href: string;
  priority?: "normal" | "high";
}

const MAX_NOTIFICATIONS = 12;
const RECENT_DAYS = {
  grades: 30,
  timetable: 21,
  announcements: 21,
  absence: 30,
};

const toArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const getItemId = (item: any) => String(item?._id || item?.id || "");

const isRecent = (dateValue: string | undefined, days: number) => {
  if (!dateValue) return false;

  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
};

const getAnnouncementEndpoint = (role?: string) => {
  switch (role) {
    case "Teacher":
      return "/teachers/announcements";
    case "Student":
      return "/students/announcements";
    case "Parent":
      return "/parents/announcements";
    default:
      return "/announcements";
  }
};

const getBasePath = (role?: string) => {
  switch (role) {
    case "SystemAdmin":
      return "/admin";
    case "SchoolAdmin":
      return "/school-admin";
    case "Teacher":
      return "/teacher";
    case "Student":
      return "/student";
    case "Parent":
      return "/parent";
    default:
      return "/";
  }
};

const getRoleMessage = (role?: string) => {
  switch (role) {
    case "SystemAdmin":
      return "Recent school-wide updates and system notices";
    case "SchoolAdmin":
      return "Recent school-wide updates and operational alerts";
    case "Teacher":
      return "Recent messages, notices, class changes, and active alerts";
    case "Student":
      return "Recent messages, grade updates, announcements, and timetable changes";
    case "Parent":
      return "Recent messages, child updates, announcements, and absence alerts";
    default:
      return "Recent updates";
  }
};

const hasAnnouncementBeenRead = (
  announcement: any,
  userId?: string,
) =>
  toArray<any>(announcement?.readBy).some(
    (entry) => String(entry?.user?._id || entry?.user?.id || entry?.user || "") === String(userId || ""),
  );

export function useNotifications() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?._id || user?.id;
  const role = user?.role;
  const basePath = getBasePath(role);

  const { data: inboxData } = useInbox();

  const readStatesQuery = useQuery({
    queryKey: ["notifications", userId, "read-states"],
    queryFn: () => notificationReadStateService.getReadStates(),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });

  const announcementsQuery = useQuery({
    queryKey: ["notifications", role, "announcements"],
    queryFn: () => apiGet<any>(getAnnouncementEndpoint(role)),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const parentChildrenQuery = useQuery({
    queryKey: ["notifications", "parent", "children"],
    queryFn: () => apiGet<any>("/parents/children"),
    enabled: role === "Parent",
    staleTime: 5 * 60 * 1000,
  });

  const parentChildren: any[] = useMemo(() => {
    const rawChildren =
      parentChildrenQuery.data?.data?.children ||
      parentChildrenQuery.data?.children ||
      parentChildrenQuery.data?.data ||
      [];

    return toArray<any>(rawChildren);
  }, [parentChildrenQuery.data]);

  const activeChild = parentChildren[0];
  const activeChildId = activeChild?._id || activeChild?.id || "";

  const parentGradesQuery = useQuery({
    queryKey: ["notifications", "parent", "grades", activeChildId],
    queryFn: () => apiGet<any>(`/parents/children/${activeChildId}/grades`),
    enabled: role === "Parent" && Boolean(activeChildId),
    staleTime: 5 * 60 * 1000,
  });

  const studentGradesQuery = useQuery({
    queryKey: ["notifications", "student", "grades"],
    queryFn: () => apiGet<any>("/students/grades"),
    enabled: role === "Student",
    staleTime: 5 * 60 * 1000,
  });

  const parentAbsenceAlertsQuery = useQuery({
    queryKey: ["notifications", "parent", "absence-alerts"],
    queryFn: () => absenceAlertService.getParentAlerts(),
    enabled: role === "Parent",
    staleTime: 2 * 60 * 1000,
  });

  const studentAbsenceAlertsQuery = useQuery({
    queryKey: ["notifications", "student", "absence-alerts"],
    queryFn: () => absenceAlertService.getStudentAlerts(),
    enabled: role === "Student",
    staleTime: 2 * 60 * 1000,
  });

  const staffAbsenceAlertsQuery = useQuery({
    queryKey: ["notifications", role, "absence-alerts"],
    queryFn: () => absenceAlertService.getAlerts({ status: "Pending", limit: 20 }),
    enabled: role === "Teacher" || role === "SchoolAdmin",
    staleTime: 2 * 60 * 1000,
  });

  const studentScheduleQuery = useQuery({
    queryKey: ["notifications", "student", "schedule"],
    queryFn: () => apiGet<any>("/students/schedule"),
    enabled: role === "Student",
    staleTime: 5 * 60 * 1000,
  });

  const teacherTimetableQuery = useQuery({
    queryKey: ["notifications", "teacher", "timetables", userId],
    queryFn: () => timetableService.getTimetables({ teacherId: userId, limit: 20 }),
    enabled: role === "Teacher" && Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const adminTimetableQuery = useQuery({
    queryKey: ["notifications", role, "timetables"],
    queryFn: () => timetableService.getTimetables({ limit: 20 }),
    enabled: role === "SchoolAdmin" || role === "SystemAdmin",
    staleTime: 5 * 60 * 1000,
  });

  const announcements = useMemo(
    () =>
      toArray<any>(
        announcementsQuery.data?.data || announcementsQuery.data,
      ),
    [announcementsQuery.data],
  );

  const messages = useMemo(
    () => toArray<any>((inboxData as any)?.data || inboxData),
    [inboxData],
  );

  const parentAbsenceAlerts = useMemo(
    () =>
      toArray<any>(
        parentAbsenceAlertsQuery.data?.data || parentAbsenceAlertsQuery.data,
      ),
    [parentAbsenceAlertsQuery.data],
  );

  const studentAbsenceAlerts = useMemo(
    () => toArray<any>(studentAbsenceAlertsQuery.data),
    [studentAbsenceAlertsQuery.data],
  );

  const staffAbsenceAlerts = useMemo(
    () =>
      toArray<any>(
        staffAbsenceAlertsQuery.data?.data || staffAbsenceAlertsQuery.data,
      ),
    [staffAbsenceAlertsQuery.data],
  );

  const studentGrades = useMemo(
    () =>
      toArray<any>(
        studentGradesQuery.data?.data || studentGradesQuery.data,
      ),
    [studentGradesQuery.data],
  );

  const parentGrades = useMemo(
    () => toArray<any>(parentGradesQuery.data?.data?.grades),
    [parentGradesQuery.data],
  );

  const studentTimetables = useMemo(
    () =>
      toArray<any>(
        studentScheduleQuery.data?.data?.timetables ||
          studentScheduleQuery.data?.timetables,
      ),
    [studentScheduleQuery.data],
  );

  const teacherTimetables = useMemo(
    () =>
      toArray<any>(
        teacherTimetableQuery.data?.data || teacherTimetableQuery.data,
      ),
    [teacherTimetableQuery.data],
  );

  const adminTimetables = useMemo(
    () =>
      toArray<any>(
        adminTimetableQuery.data?.data || adminTimetableQuery.data,
      ),
    [adminTimetableQuery.data],
  );

  const persistedReadMap = useMemo<NotificationReadStateMap>(
    () => readStatesQuery.data || {},
    [readStatesQuery.data],
  );

  const allNotifications = useMemo<DashboardNotification[]>(() => {
    const items: DashboardNotification[] = [];

    for (const message of messages) {
      const messageId = getItemId(message);
      if (!messageId || message?.isRead) continue;

      items.push({
        id: `message:${messageId}`,
        sourceId: messageId,
        kind: "message",
        title: message?.subject || `New message from ${message?.senderName || "sender"}`,
        description: message?.content || "You have a new unread message.",
        createdAt: message?.createdAt || new Date().toISOString(),
        unread: true,
        href: `${basePath}/messages`,
        priority: message?.category === "Emergency" ? "high" : "normal",
      });
    }

    for (const announcement of announcements) {
      const announcementId = getItemId(announcement);
      const createdAt = announcement?.createdAt || announcement?.updatedAt;
      if (!announcementId || !isRecent(createdAt, RECENT_DAYS.announcements)) continue;

      const notificationId = `announcement:${announcementId}`;
      const urgent =
        String(announcement?.priority || "").toLowerCase() === "urgent" ||
        String(announcement?.type || "").toLowerCase() === "emergency";

      items.push({
        id: notificationId,
        sourceId: announcementId,
        kind: urgent && (role === "SchoolAdmin" || role === "SystemAdmin")
          ? "system"
          : "announcement",
        title:
          urgent && (role === "SchoolAdmin" || role === "SystemAdmin")
            ? `System notice: ${announcement?.title || "Announcement"}`
            : announcement?.title || "New announcement",
        description: announcement?.content || "A school announcement is available.",
        createdAt: createdAt || new Date().toISOString(),
        unread: !hasAnnouncementBeenRead(announcement, userId),
        href: `${basePath}/announcements`,
        priority: urgent ? "high" : "normal",
      });
    }

    for (const alert of parentAbsenceAlerts) {
      const alertId = getItemId(alert);
      if (!alertId || !isRecent(alert?.createdAt, RECENT_DAYS.absence)) continue;

      const parentStatus = toArray<any>(alert?.parents).find(
        (entry) => entry?.parent === userId,
      )?.status;

      items.push({
        id: `absence:${alertId}`,
        sourceId: alertId,
        kind: "absence",
        title: "Absence alert",
        description: `${alert?.student?.firstName || "Student"} ${
          alert?.student?.lastName || ""
        } was marked absent on ${alert?.date || "a recent date"}.`.trim(),
        createdAt: alert?.createdAt || new Date().toISOString(),
        unread: parentStatus !== "Read",
        href: `${basePath}/alerts`,
        priority: "high",
      });
    }

    for (const alert of studentAbsenceAlerts) {
      const alertId = getItemId(alert);
      if (!alertId || !isRecent(alert?.createdAt, RECENT_DAYS.absence)) continue;

      const notificationId = `absence:${alertId}`;
      items.push({
        id: notificationId,
        sourceId: alertId,
        kind: "absence",
        title: "Attendance notice",
        description: alert?.reason || "A new attendance notice was posted for you.",
        createdAt: alert?.createdAt || new Date().toISOString(),
        unread: !persistedReadMap[notificationId],
        href: `${basePath}/attendance`,
        priority: "high",
      });
    }

    for (const alert of staffAbsenceAlerts) {
      const alertId = getItemId(alert);
      if (!alertId || !isRecent(alert?.createdAt, RECENT_DAYS.absence)) continue;

      const notificationId = `absence:${alertId}`;
      items.push({
        id: notificationId,
        sourceId: alertId,
        kind: "absence",
        title: "Active absence alert",
        description: `${alert?.student?.firstName || "Student"} ${
          alert?.student?.lastName || ""
        } has an unresolved absence alert.`.trim(),
        createdAt: alert?.createdAt || new Date().toISOString(),
        unread: !persistedReadMap[notificationId],
        href: `${basePath}/attendance`,
        priority: "high",
      });
    }

    const relevantGrades = role === "Parent" ? parentGrades : studentGrades;
    for (const gradeRecord of relevantGrades) {
      const gradeId = getItemId(gradeRecord);
      const createdAt = gradeRecord?.createdAt || gradeRecord?.updatedAt;
      if (!gradeId || !isRecent(createdAt, RECENT_DAYS.grades)) continue;

      const notificationId = `grade:${gradeId}`;
      const percentage =
        gradeRecord?.percentage ??
        gradeRecord?.totalMarks ??
        gradeRecord?.average ??
        gradeRecord?.marks?.finalExam;

      items.push({
        id: notificationId,
        sourceId: gradeId,
        kind: "grade",
        title: `Grade update${gradeRecord?.subject ? `: ${gradeRecord.subject}` : ""}`,
        description:
          percentage !== undefined
            ? `A new recorded score is available${gradeRecord?.studentName ? ` for ${gradeRecord.studentName}` : ""}. Score: ${percentage}.`
            : "A new grade record is available.",
        createdAt: createdAt || new Date().toISOString(),
        unread: !persistedReadMap[notificationId],
        href: `${basePath}/grades`,
        priority: "normal",
      });
    }

    const relevantTimetables =
      role === "Student"
        ? studentTimetables
        : role === "Teacher"
          ? teacherTimetables
          : adminTimetables;

    for (const timetable of relevantTimetables) {
      const timetableId = getItemId(timetable);
      const changedAt = timetable?.updatedAt || timetable?.createdAt;
      if (!timetableId || !isRecent(changedAt, RECENT_DAYS.timetable)) continue;

      const notificationId = `timetable:${timetableId}`;
      const classLabel = timetable?.class ? `Grade ${timetable.class}` : "your class";
      const sectionLabel = timetable?.section ? ` ${timetable.section}` : "";

      items.push({
        id: notificationId,
        sourceId: timetableId,
        kind: "timetable",
        title: "Timetable update",
        description: `A timetable change was published for ${classLabel}${sectionLabel}.`,
        createdAt: changedAt || new Date().toISOString(),
        unread: !persistedReadMap[notificationId],
        href: `${basePath}/timetable`,
        priority: timetable?.status === "Published" ? "high" : "normal",
      });
    }

    return items.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [
    adminTimetables,
    announcements,
    basePath,
    messages,
    parentAbsenceAlerts,
    parentGrades,
    persistedReadMap,
    role,
    staffAbsenceAlerts,
    studentAbsenceAlerts,
    studentGrades,
    studentTimetables,
    teacherTimetables,
    userId,
  ]);

  const notifications = useMemo(
    () => allNotifications.slice(0, MAX_NOTIFICATIONS),
    [allNotifications],
  );

  const unreadCount = allNotifications.filter((item) => item.unread).length;

  const markNotificationAsRead = async (notification: DashboardNotification) => {
    try {
      if (notification.kind === "message") {
        await messageService.markAsRead(notification.sourceId);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.messages.scope(userId),
        });
      } else if (notification.kind === "announcement" || notification.kind === "system") {
        await announcementService.markAsRead(notification.sourceId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      } else if (notification.kind === "absence" && role === "Parent") {
        await absenceAlertService.markAsRead(notification.sourceId);
        await queryClient.invalidateQueries({
          queryKey: ["notifications", "parent", "absence-alerts"],
        });
      } else {
        await notificationReadStateService.markAsRead(notification.id);
        await queryClient.invalidateQueries({
          queryKey: ["notifications", userId, "read-states"],
        });
      }
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = allNotifications.filter((item) => item.unread);
    if (unreadNotifications.length === 0) return;

    const persistedKeys = unreadNotifications
      .filter((notification) => {
        if (notification.kind === "message") return false;
        if (notification.kind === "announcement" || notification.kind === "system") return false;
        if (notification.kind === "absence" && role === "Parent") return false;
        return true;
      })
      .map((notification) => notification.id);

    const requests: Promise<unknown>[] = [];

    for (const notification of unreadNotifications) {
      if (notification.kind === "message") {
        requests.push(messageService.markAsRead(notification.sourceId));
        continue;
      }

      if (notification.kind === "announcement" || notification.kind === "system") {
        requests.push(announcementService.markAsRead(notification.sourceId));
        continue;
      }

      if (notification.kind === "absence" && role === "Parent") {
        requests.push(absenceAlertService.markAsRead(notification.sourceId));
      }
    }

    if (persistedKeys.length > 0) {
      requests.push(notificationReadStateService.markManyAsRead(persistedKeys));
    }

    const results = await Promise.allSettled(requests);

    const failedCount = results.filter((result) => result.status === "rejected").length;

    await Promise.allSettled([
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.scope(userId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all }),
      queryClient.invalidateQueries({
        queryKey: ["notifications", "parent", "absence-alerts"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["notifications", userId, "read-states"],
      }),
    ]);

    if (failedCount > 0) {
      toast.error("Some notifications could not be marked as read");
      return;
    }

    toast.success("All notifications marked as read");
  };

  return {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    summary: getRoleMessage(role),
    isLoading:
      announcementsQuery.isLoading ||
      parentChildrenQuery.isLoading ||
      parentGradesQuery.isLoading ||
      studentGradesQuery.isLoading ||
      parentAbsenceAlertsQuery.isLoading ||
      studentAbsenceAlertsQuery.isLoading ||
      staffAbsenceAlertsQuery.isLoading ||
      studentScheduleQuery.isLoading ||
      teacherTimetableQuery.isLoading ||
      adminTimetableQuery.isLoading ||
      readStatesQuery.isLoading,
  };
}
