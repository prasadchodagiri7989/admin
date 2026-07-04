import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Courses from './pages/Courses';
import CourseManage from './pages/CourseManage';
import Activity from './pages/Activity';
import SuspiciousActivity from './pages/SuspiciousActivity';
import LoginSessions from '@/pages/LoginSessions'; // Audit face capture logs
import Announcements from './pages/Announcements';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function ProtectedRoute() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3 p-8">
          <div className="text-5xl">🚫</div>
          <p className="text-xl font-semibold text-gray-800">Access Denied</p>
          <p className="text-gray-500">Admin role required to view this page.</p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard"           element={<Dashboard />} />
                <Route path="/users"               element={<Users />} />
                <Route path="/courses"             element={<Courses />} />
                <Route path="/courses/:id/manage"  element={<CourseManage />} />
                <Route path="/announcements"       element={<Announcements />} />
                <Route path="/activity"            element={<Activity />} />
                <Route path="/suspicious"          element={<SuspiciousActivity />} />
                <Route path="/sessions"            element={<LoginSessions />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
