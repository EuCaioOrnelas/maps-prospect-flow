import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Check, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResponsibleMember {
  user_id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  responsibleId: string | null | undefined;
  members: ResponsibleMember[];
  onChange?: (userId: string | null) => Promise<void> | void;
  canEdit?: boolean;
  size?: "sm" | "md";
}

const initials = (m?: ResponsibleMember | null) => {
  const s = (m?.name || m?.email || "?").trim();
  return s.charAt(0).toUpperCase();
};

export function ResponsibleAvatar({ responsibleId, members, onChange, canEdit = true, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const current = members.find((m) => m.user_id === responsibleId) || null;
  const label = current ? current.name || current.email || "Sem nome" : "Sem responsável";

  const dim = size === "sm" ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-xs";

  const trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (canEdit) setOpen(true);
      }}
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 border border-border/60",
        current ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        dim,
        canEdit && "hover:ring-2 hover:ring-primary/30 transition"
      )}
      aria-label={`Responsável: ${label}`}
    >
      {current ? initials(current) : <UserIcon className="w-3 h-3" />}
    </button>
  );

  const wrapped = (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="left">Responsável: {label}</TooltipContent>
    </Tooltip>
  );

  if (!canEdit) return wrapped;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{wrapped}</PopoverTrigger>
      <PopoverContent className="w-60 p-1" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          Trocar responsável
        </div>
        <button
          className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-muted"
          onClick={async (e) => {
            e.stopPropagation();
            await onChange?.(null);
            setOpen(false);
          }}
        >
          <span className="text-muted-foreground">Sem responsável</span>
          {!responsibleId && <Check className="w-3.5 h-3.5" />}
        </button>
        <div className="max-h-56 overflow-y-auto">
          {members.map((m) => (
            <button
              key={m.user_id}
              className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-muted"
              onClick={async (e) => {
                e.stopPropagation();
                await onChange?.(m.user_id);
                setOpen(false);
              }}
            >
              <span className="truncate">{m.name || m.email || m.user_id.slice(0, 8)}</span>
              {responsibleId === m.user_id && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
