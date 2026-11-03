import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";

/** Moldura padrão do painel (mesma usada na lista de fluxos). */
export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col lg:ml-[72px]">
        <AppHeader profile={profile} />
        <MobileNav profile={profile} />
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}
