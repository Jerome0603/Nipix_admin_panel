import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Students from "./pages/Students";
import Instructors from "./pages/Instructors";
import Certificates from "./pages/Certificates";
import Payments from "./pages/Payments";
import Internships from "./pages/Internships";
import Events from "./pages/Events";
import Seminars from "./pages/Seminars";
import Workshops from "./pages/Workshops";
import VACPrograms from "./pages/VACPrograms";
import Registrations from "./pages/Registrations";
import ContactMessages from "./pages/ContactMessages";
import Blogs from "./pages/Blogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/admin">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected Admin Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/internships" element={<Internships />} />
              <Route path="/events" element={<Events />} />
              <Route path="/seminars" element={<Seminars />} />
              <Route path="/workshops" element={<Workshops />} />
              <Route path="/vac-programs" element={<VACPrograms />} />
              <Route path="/students" element={<Students />} />
              <Route path="/instructors" element={<Instructors />} />
              <Route path="/registrations" element={<Registrations />} />
              <Route path="/contact-messages" element={<ContactMessages />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/blogs" element={<Blogs />} />
              <Route path="/payments" element={<Payments />} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
