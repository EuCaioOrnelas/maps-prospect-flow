import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, User as UserIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ResponsibleMember {
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url?: string | null;
}

interface Props {
  responsibleId: string | null | undefined;
  members: ResponsibleMember[];
  onChange?: (userId: string | null) => Promise<void> | void;
  canEdit?: boolean;
  size?: "sm" | "md" | "lg";
}

const initials = (m?: ResponsibleMember | null) => {
  const s = (m?.name || m?.email || "?").trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
};

const Avatar = ({ member, dim }: { member: ResponsibleMember | null; dim: string }) => {
  if (member?.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name || member.email || "Responsável"}
        className={cn("rounded-full object-cover shrink-0 border border-border/60", dim)}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return null;
};

export function ResponsibleAvatar({ responsibleId, members, onChange, canEdit = true, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = members.find((m) => m.user_id === responsibleId) || null;
  const label = current ? current.name || current.email || "Sem nome" : "Sem responsável";

  const dim = size === "lg" ? "w-9 h-9 text-sm" : size === "md" ? "w-7 h-7 text-xs" : "w-6 h-6 text-[10px]";

  const filtered = members.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
  });

  const trigger = (
    <span className="inline-flex p-1 -m-1 rounded-full overflow-visible shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit) setOpen((o) => !o);
        }}
        title={`Responsável: ${label}${canEdit ? " — clique para alterar" : ""}`}
        className={cn(
          "relative rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden border border-border/60 transition-transform duration-200 ease-out will-change-transform",
          current ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          dim,
          canEdit && "hover:ring-2 hover:ring-primary/50 hover:border-primary/50 hover:scale-105 cursor-pointer"
        )}
        aria-label={`Responsável: ${label}`}
      >
        {current?.avatar_url ? (
          <Avatar member={current} dim="w-full h-full" />
        ) : current ? (
          <span>{initials(current)}</span>
        ) : (
          <UserIcon className="w-1/2 h-1/2" />
        )}
      </button>
    </span>
  );

  if (!canEdit) return trigger;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 overflow-hidden"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2.5 border-b border-border/60">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Responsável
          </div>
          <div className="text-sm font-medium text-foreground mt-0.5 truncate">{label}</div>
        </div>

        {members.length > 5 && (
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar membro..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto py-1">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-none hover:bg-muted transition-colors"
            onClick={async (e) => {
              e.stopPropagation();
              await onChange?.(null);
              setOpen(false);
            }}
          >
            <div className={cn("rounded-full bg-muted text-muted-foreground flex items-center justify-center border border-border/60", "w-7 h-7")}>
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <span className="flex-1 text-left text-muted-foreground">Sem responsável</span>
            {!responsibleId && <Check className="w-4 h-4 text-primary" />}
          </button>
          {filtered.map((m) => (
            <button
              key={m.user_id}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={async (e) => {
                e.stopPropagation();
                await onChange?.(m.user_id);
                setOpen(false);
              }}
            >
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-border/60 shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-[11px] font-semibold flex items-center justify-center border border-border/60 shrink-0">
                  {initials(m)}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <div className="truncate text-foreground">{m.name || m.email || m.user_id.slice(0, 8)}</div>
                {m.name && m.email && (
                  <div className="truncate text-[11px] text-muted-foreground">{m.email}</div>
                )}
              </div>
              {responsibleId === m.user_id && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum membro encontrado.</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
