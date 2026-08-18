import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TeacherProvider } from "./contexts/TeacherContext";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminClassesPage from "./pages/admin/AdminClassesPage";
import AdminSubjectsPage from "./pages/admin/AdminSubjectsPage";
import PlaceholderPage from "./components/PlaceholderPage";
import AdminTeachersPage from "./pages/admin/AdminTeachersPage";
import AdminNoticesPage from "@/pages/admin/AdminNoticesPage";
import AdminAttendancePage from "@/pages/admin/AdminAttendancePage";
import AdminTimetablePage from "@/pages/admin/AdminTimetablePage";
import AdminFeesPage from "@/pages/admin/AdminFeesPage";
import AdminResultsPage from "@/pages/admin/AdminResultsPage"; // Path check kar lijiyega
import AdminExpensesPage from "@/pages/admin/AdminExpensesPage";
import TeacherAttendancePage from "./pages/teacher/TeacherAttendancePage";
import TeacherResultsPage from "@/pages/teacher/TeacherResultsPage";
import TeacherNoticesPage from "@/pages/teacher/TeacherNoticesPage";
import MyStudentsPage from "@/pages/teacher/MyStudentsPage";
import TeacherTimetablePage from "./pages/teacher/TeacherTimetablePage";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Banknote, Trash2, Phone, Briefcase, Loader2, Search } from "lucide-react";


import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) => {
  const { isLoggedIn, isLoading, role } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-bar" />
      </div>
    );
  }
  
  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (role !== allowedRole) return <Navigate to={role ? `/${role}` : "/"} replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudentsPage />} />
             <Route path="teachers" element={<AdminTeachersPage />} />
              <Route path="classes" element={<AdminClassesPage />} />
              <Route path="subjects" element={<AdminSubjectsPage />} />
              <Route path="timetable" element={<AdminTimetablePage />} />
             <Route path="attendance" element={<AdminAttendancePage />} />
              <Route path="results" element={<AdminResultsPage />} />
              <Route path="fees" element={<AdminFeesPage />} />
              <Route path="notices" element={<AdminNoticesPage />} />
              <Route path="expenses" element={<AdminExpensesPage />} />
              
            </Route>

            {/* Teacher Routes */}
             {/* Teacher Routes */}
{/* Teacher Routes */}
                      {/* Teacher Routes */}
<Route path="/teacher" element={
  <ProtectedRoute allowedRole="teacher">
    <TeacherProvider>
      <DashboardLayout />
    </TeacherProvider>
  </ProtectedRoute>
}>
  <Route index element={<TeacherDashboard />} />
  <Route path="students" element={<MyStudentsPage />} />
  <Route path="timetable" element={<TeacherTimetablePage />} />
  <Route path="attendance" element={<TeacherAttendancePage />} />
  <Route path="results" element={<TeacherResultsPage />} />
  <Route path="notices" element={<TeacherNoticesPage />} />
</Route>
  
            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute allowedRole="student"><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="subjects" element={<PlaceholderPage title="My Subjects" />} />
              <Route path="timetable" element={<PlaceholderPage title="My Timetable" />} />
              <Route path="results" element={<PlaceholderPage title="My Results" />} />
             <Route path="attendance" element={<TeacherAttendancePage />} />
              <Route path="assignments" element={<PlaceholderPage title="Assignments" />} />
              <Route path="notes" element={<PlaceholderPage title="Download Notes" />} />
              <Route path="fees" element={<PlaceholderPage title="Fee Status" />} />
              <Route path="notices" element={<PlaceholderPage title="School Notices" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
