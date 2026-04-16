import { Outlet, useLocation } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { DashboardThemeProvider } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

function AdminLayoutInner() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
      <BackgroundGlow />
      <AdminSidebar />
      {/* Offset for collapsed sidebar width */}
      <main className="flex-1 min-w-0 overflow-auto ml-[72px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export function AdminLayout() {
  return (
    <DashboardThemeProvider>
      <AdminLayoutInner />
    </DashboardThemeProvider>
  );
}
