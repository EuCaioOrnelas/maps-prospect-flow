import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatLogoProps {
  unreadCount?: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export const ChatLogo = ({ 
  unreadCount = 0, 
  size = "md", 
  showText = true,
  className 
}: ChatLogoProps) => {
  const sizes = {
    sm: { icon: "w-5 h-5", padding: "p-1.5", text: "text-lg", badge: "text-[8px] min-w-[14px] h-[14px]" },
    md: { icon: "w-7 h-7", padding: "p-2", text: "text-2xl", badge: "text-[10px] min-w-[18px] h-[18px]" },
    lg: { icon: "w-9 h-9", padding: "p-2", text: "text-3xl", badge: "text-xs min-w-[20px] h-[20px]" },
  };

  const effectiveSize = sizes[size];
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
        <div className={cn("relative bg-primary rounded-xl shadow-button", effectiveSize.padding)}>
          <MessageCircle className={cn("text-primary-foreground", effectiveSize.icon)} />
          
          {/* Badge for unread count */}
          {unreadCount > 0 && (
            <div className={cn(
              "absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center font-bold",
              effectiveSize.badge
            )}>
              {displayCount}
            </div>
          )}
        </div>
      </div>
      
      {showText && (
        <span className={cn("font-display font-bold text-foreground", effectiveSize.text)}>
          WiizeProspect
        </span>
      )}
    </div>
  );
};
