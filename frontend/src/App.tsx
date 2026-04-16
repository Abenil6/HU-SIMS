import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ToasterProvider } from "@/components/ui/Toast";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const LandingPage = lazy(() =>
  import("@/pages/landing/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/auth/VerifyEmailPage").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ErrorPage = lazy(() =>
  import("@/pages/ErrorPage").then((module) => ({ default: module.ErrorPage })),
);

const SchoolAdminDashboard = lazy(() =>
  import("@/pages/dashboard/SchoolAdminDashboard").then((module) => ({
    default: module.SchoolAdminDashboard,
  })),
);
const SystemAdminDashboard = lazy(() =>
  import("@/pages/dashboard/SystemAdminDashboard").then((module) => ({
    default: module.SystemAdminDashboard,
  })),
);
const TeacherDashboard = lazy(() =>
  import("@/pages/dashboard/TeacherDashboard").then((module) => ({
    default: module.TeacherDashboard,
  })),
);
const StudentDashboard = lazy(() =>
  import("@/pages/dashboard/StudentDashboard").then((module) => ({
    default: module.StudentDashboard,
  })),
);
const ParentDashboard = lazy(() =>
  import("@/pages/dashboard/ParentDashboard").then((module) => ({
    default: module.ParentDashboard,
  })),
);
const UserListPage = lazy(() =>
  import("@/pages/dashboard/users/UserListPage").then((module) => ({
    default: module.UserListPage,
  })),
);
const StudentListPage = lazy(() =>
  import("@/pages/dashboard/students/StudentListPage").then((module) => ({
    default: module.StudentListPage,
  })),
);
const TeacherListPage = lazy(() =>
  import("@/pages/dashboard/teachers/TeacherListPage").then((module) => ({
    default: module.TeacherListPage,
  })),
);
const ParentListPage = lazy(() =>
  import("@/pages/dashboard/parents/ParentListPage").then((module) => ({
    default: module.ParentListPage,
  })),
);
const AttendanceMarkingPage = lazy(() =>
  import("@/pages/dashboard/attendance/AttendanceMarkingPage").then((module) => ({
    default: module.AttendanceMarkingPage,
  })),
);
const StudentAttendancePage = lazy(() =>
  import("@/pages/dashboard/attendance/StudentAttendancePage").then((module) => ({
    default: module.StudentAttendancePage,
  })),
);
const GradesPage = lazy(() =>
  import("@/pages/dashboard/academic/GradesPage").then((module) => ({
    default: module.GradesPage,
  })),
);
const SchoolAdminGradesPage = lazy(() =>
  import("@/pages/dashboard/academic/SchoolAdminGradesPage").then((module) => ({
    default: module.SchoolAdminGradesPage,
  })),
);
const StudentGradesPage = lazy(() =>
  import("@/pages/dashboard/academic/StudentGradesPage").then((module) => ({
    default: module.StudentGradesPage,
  })),
);
const TimetablePage = lazy(() =>
  import("@/pages/dashboard/timetable/TimetablePage").then((module) => ({
    default: module.TimetablePage,
  })),
);
const MessagesPage = lazy(() =>
  import("@/pages/dashboard/messages/MessagesPage").then((module) => ({
    default: module.MessagesPage,
  })),
);
const AnnouncementsPage = lazy(() =>
  import("@/pages/dashboard/announcements/AnnouncementsPage").then((module) => ({
    default: module.AnnouncementsPage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/pages/dashboard/reports/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/dashboard/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/pages/dashboard/profile/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const ClassesPage = lazy(() =>
  import("@/pages/dashboard/classes/ClassesPage").then((module) => ({
    default: module.ClassesPage,
  })),
);
const BulkUploadPage = lazy(() =>
  import("@/pages/dashboard/students/BulkUploadPage").then((module) => ({
    default: module.BulkUploadPage,
  })),
);
const MaterialsPage = lazy(() =>
  import("@/pages/dashboard/materials/MaterialsPage").then((module) => ({
    default: module.MaterialsPage,
  })),
);
const ParentAlertsPage = lazy(() =>
  import("@/pages/dashboard/alerts/ParentAlertsPage").then((module) => ({
    default: module.ParentAlertsPage,
  })),
);
const ParentChildGradesPage = lazy(() =>
  import("@/pages/dashboard/parents/ParentChildGradesPage").then((module) => ({
    default: module.ParentChildGradesPage,
  })),
);
const ParentChildAttendancePage = lazy(() =>
  import("@/pages/dashboard/parents/ParentChildAttendancePage").then((module) => ({
    default: module.ParentChildAttendancePage,
  })),
);
const ExamSchedulePage = lazy(() =>
  import("@/pages/dashboard/academic/ExamSchedulePage").then((module) => ({
    default: module.ExamSchedulePage,
  })),
);
const SystemLogsPage = lazy(() =>
  import("@/pages/dashboard/system/SystemLogsPage").then((module) => ({
    default: module.SystemLogsPage,
  })),
);
const SecurityPage = lazy(() =>
  import("@/pages/dashboard/system/SecurityPage").then((module) => ({
    default: module.SecurityPage,
  })),
);
const RolesPage = lazy(() =>
  import("@/pages/dashboard/system/RolesPage").then((module) => ({
    default: module.RolesPage,
  })),
);

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: string[];
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role))
    return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ToasterProvider />
      <Suspense fallback={null}>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        {/* SystemAdmin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["SystemAdmin"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SystemAdminDashboard />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="logs" element={<SystemLogsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* SchoolAdmin Routes */}
        <Route
          path="/school-admin"
          element={
            <ProtectedRoute allowedRoles={["SchoolAdmin"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SchoolAdminDashboard />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="students/upload" element={<BulkUploadPage />} />
          <Route path="teachers" element={<TeacherListPage />} />
          <Route path="parents" element={<ParentListPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="attendance" element={<AttendanceMarkingPage />} />
          <Route path="grades" element={<SchoolAdminGradesPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="exam-schedule" element={<ExamSchedulePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["Teacher"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="attendance" element={<AttendanceMarkingPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="exam-schedule" element={<ExamSchedulePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["Student"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="grades" element={<StudentGradesPage />} />
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Parent Routes */}
        <Route
          path="/parent"
          element={
            <ProtectedRoute allowedRoles={["Parent"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ParentDashboard />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="attendance" element={<AttendanceMarkingPage />} />
          <Route path="children/:childId/grades" element={<ParentChildGradesPage />} />
          <Route path="children/:childId/attendance" element={<ParentChildAttendancePage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="alerts" element={<ParentAlertsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route
          path="/unauthorized"
          element={
            <ErrorPage
              statusCode={403}
              message="You don't have permission to access this page."
            />
          }
        />
        <Route
          path="*"
          element={
            <ErrorPage
              statusCode={404}
              message="The page you're looking for doesn't exist."
            />
          }
        />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
