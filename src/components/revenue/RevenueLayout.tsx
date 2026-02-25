import { Outlet } from "react-router-dom";
import { RevenueSidebar } from "./RevenueSidebar";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export const RevenueLayout = () => {
  const { isAdmin, loading } = useAdminCheck();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background w-full">
      <RevenueSidebar onCollapsedChange={setSidebarCollapsed} />
      <main
        className="flex-1 overflow-auto transition-[margin-left] duration-300 ease-out"
        style={{ marginLeft: sidebarCollapsed ? 68 : 224 }}
      >
        <Outlet />
      </main>
    </div>
  );
};
