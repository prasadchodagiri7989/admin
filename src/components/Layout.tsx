import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import GlobalSearch from "./GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { Menu } from "lucide-react";

export default function Layout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar (hidden on mobile until toggled) */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="flex lg:hidden items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-gray-800 text-sm">
            SkyLearn Admin
          </span>
          <div className="ml-auto"><GlobalSearch /></div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 py-3 shrink-0">
          <GlobalSearch />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
