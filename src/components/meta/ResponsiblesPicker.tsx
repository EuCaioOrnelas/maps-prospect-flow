import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ResponsibleOption {
  user_id: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface ResponsiblesPickerProps {
  members: ResponsibleOption[];
  value: string[];
  onChange: (userIds: string[]) => void;
  /** userId -> connectionId já atribuído (para bloquear) */
  assignmentByUser?: Record<string, string>;
  /** conexão atual (assignments desta conexão não bloqueiam) */
  currentConnectionId?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

const initialsOf = (label: string) =>
  label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

export function ResponsiblesPicker({
  members,
  value,
  onChange,
  assignmentByUser = {},
  currentConnectionId = null,
  disabled,
  placeholder = "Buscar colaborador por nome ou e-mail...",
}: ResponsiblesPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byId = useMemo(() => {
    const map: Record<string, ResponsibleOption> = {};
    members.forEach((m) => { map[m.user_id] = m; });
    return map;
  }, [members]);

  const labelOf = (m?: ResponsibleOption, fallback = "") =>
    m?.name || m?.email || fallback || "Colaborador";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q)
    );
  }, [members, query]);

  const toggle = (userId: string) => {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  };

  return (
    <div className="space-y-2">
      <Popover modal open={open} onOpenChange={(o) => { if (!disabled) { setOpen(o); if (!o) setQuery(""); } }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm transition-colors",
              "hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <UserPlus size={14} className="text-muted-foreground shrink-0" />
              <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
                {value.length === 0
                  ? "Selecionar responsáveis..."
                  : value.length === 1
                    ? labelOf(byId[value[0]], value[0].slice(0, 8))
                    : `${value.length} responsáveis selecionados`}
              </span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] p-0 bg-popover text-popover-foreground border-border shadow-lg z-50"
          align="start"
          collisionPadding={16}
          avoidCollisions
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[min(16rem,var(--radix-popover-content-available-height,16rem))] overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum colaborador encontrado.</p>
            )}
            {filtered.map((m) => {
              const assignedTo = assignmentByUser[m.user_id];
              const blocked = !!assignedTo && assignedTo !== currentConnectionId;
              const selected = value.includes(m.user_id);
              const label = labelOf(m, m.user_id.slice(0, 8));
              return (
                <button
                  key={m.user_id}
                  type="button"
                  disabled={blocked}
                  onClick={() => toggle(m.user_id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                    blocked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
                    selected && "bg-primary/10"
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={m.avatar_url || undefined} alt={label} />
                    <AvatarFallback className="text-[10px]">{initialsOf(label)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{label}</span>
                    {m.email && m.name && (
                      <span className="block truncate text-[11px] text-muted-foreground">{m.email}</span>
                    )}
                    {blocked && (
                      <span className="block text-[10px] text-muted-foreground">já é responsável por outro número</span>
                    )}
                  </span>
                  {selected && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selecionados aparecem abaixo do input */}
      <div className="min-h-[38px] rounded-lg border border-dashed border-border/70 bg-muted/30 px-2 py-1.5 flex flex-wrap items-center gap-2">
        {value.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhum responsável selecionado ainda</span>
        ) : (
          value.map((id) => {
            const m = byId[id];
            const label = labelOf(m, id.slice(0, 8));
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pl-0.5 pr-1.5 text-xs"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={m?.avatar_url || undefined} alt={label} />
                  <AvatarFallback className="text-[9px]">{initialsOf(label)}</AvatarFallback>
                </Avatar>
                <span className="max-w-[140px] truncate">{label}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ResponsibleAvatars({
  userIds,
  members,
  max = 4,
}: { userIds: string[]; members: ResponsibleOption[]; max?: number }) {
  if (!userIds.length) return null;
  const byId: Record<string, ResponsibleOption> = {};
  members.forEach((m) => { byId[m.user_id] = m; });
  const shown = userIds.slice(0, max);
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((id) => {
        const m = byId[id];
        const label = m?.name || m?.email || id.slice(0, 8);
        return (
          <Avatar key={id} className="h-6 w-6 border-2 border-background" title={label}>
            <AvatarImage src={m?.avatar_url || undefined} alt={label} />
            <AvatarFallback className="text-[9px]">{initialsOf(label)}</AvatarFallback>
          </Avatar>
        );
      })}
      {userIds.length > max && (
        <span className="ml-3 text-[10px] text-muted-foreground">+{userIds.length - max}</span>
      )}
    </div>
  );
}
