import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { useAuth } from "@/contexts/AuthContext";

export function WorkforcePageLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-background flex w-full">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col lg:ml-[72px]">
        <AppHeader profile={profile} />
        <MobileNav profile={profile} />
        <BackgroundGlow />
        <main className={`flex-1 p-4 md:p-6 ${wide ? "max-w-[1600px]" : "max-w-6xl"} mx-auto w-full`}>
          {children}
        </main>
      </div>
    </div>
  );
}
