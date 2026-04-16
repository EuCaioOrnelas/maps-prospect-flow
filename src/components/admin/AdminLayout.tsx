import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

export function AdminLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
      <BackgroundGlow />
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
