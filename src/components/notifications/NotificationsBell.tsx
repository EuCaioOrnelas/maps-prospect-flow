import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { AnnouncementsDialog } from "./AnnouncementsDialog";

/** Sino de avisos com o circulo de nao lidos, usado no cabecalho do dashboard. */
export function NotificationsBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const {
    unreadCount: connectionAlerts,
    disconnectedNumbers,
    dismissDisconnectionAlert,
  } = useUnreadAnnouncements();
  const notifications = useUserNotifications();
  const unread = connectionAlerts + notifications.unreadCount;
  const hasDisconnection = disconnectedNumbers.length > 0;

  return (
    <div className={cn("relative shrink-0", className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => setOpen(true)}
        title="Avisos"
        aria-label={unread > 0 ? `Avisos, ${unread} nao lidos` : "Avisos"}
      >
        <Bell className="h-4 w-4" />
      </Button>
      {unread > 0 && (
        <span
          className={cn(
            "pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1",
            "text-[9px] font-bold leading-none tabular-nums ring-2 ring-background shadow-sm",
            hasDisconnection ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground",
          )}
        >
          {unread > 99 ? "+99" : unread}
        </span>
      )}
      <AnnouncementsDialog
        notifications={notifications}
        open={open}
        onOpenChange={setOpen}
        disconnectedNumbers={disconnectedNumbers}
        onDismissDisconnection={dismissDisconnectionAlert}
      />
    </div>
  );
}
