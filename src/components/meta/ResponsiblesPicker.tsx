import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((o) => !o); setQuery(""); } }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 text-left text-sm shadow-sm transition-colors",
          "hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
          open && "border-primary/50 ring-2 ring-primary/10"
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

      {open && (
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-md overflow-hidden">
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
          <div className="max-h-56 overflow-y-auto overscroll-contain py-1">
            {members.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum colaborador disponível na sua equipe.</p>
            )}
            {members.length > 0 && filtered.length === 0 && (
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
                  <Avatar className="h-7 w-7 shrink-0 rounded-[28%]">
                    <AvatarImage className="rounded-[28%]" src={m.avatar_url || undefined} alt={label} />
                    <AvatarFallback className="text-[10px] rounded-[28%]">{initialsOf(label)}</AvatarFallback>
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
        </div>
      )}


      {/* Selecionados aparecem abaixo do input */}
      <div className="min-h-[44px] rounded-lg border border-border bg-card px-2.5 py-2 flex flex-wrap items-center gap-1.5 shadow-sm">
        {value.length === 0 ? (
          <span className="px-1 text-xs text-muted-foreground">Nenhum responsável selecionado ainda</span>
        ) : (
          value.map((id) => {
            const m = byId[id];
            const label = labelOf(m, id.slice(0, 8));
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 py-1 pl-1 pr-1.5 text-xs font-medium transition-colors hover:border-primary/30"
              >
                <Avatar className="h-5 w-5 rounded-[4px]">
                  <AvatarImage className="rounded-[4px] object-cover" src={m?.avatar_url || undefined} alt={label} />
                  <AvatarFallback className="rounded-[4px] bg-primary/10 text-[9px] text-primary">{initialsOf(label)}</AvatarFallback>
                </Avatar>
                <span className="max-w-[140px] truncate">{label}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="rounded-[3px] p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          <Avatar key={id} className="h-6 w-6 rounded-[28%] border-2 border-background" title={label}>
            <AvatarImage className="rounded-[28%]" src={m?.avatar_url || undefined} alt={label} />
            <AvatarFallback className="text-[9px] rounded-[28%]">{initialsOf(label)}</AvatarFallback>
          </Avatar>
        );
      })}
      {userIds.length > max && (
        <span className="ml-3 text-[10px] text-muted-foreground">+{userIds.length - max}</span>
      )}
    </div>
  );
}

/**
 * Pilha animada de responsáveis: avatares sobrepostos que se afastam,
 * crescem e revelam nome/e-mail ao passar o mouse.
 */
export function ResponsiblesStack({
  userIds,
  members,
  max = 5,
}: { userIds: string[]; members: ResponsibleOption[]; max?: number }) {
  if (!userIds.length) return null;
  const byId: Record<string, ResponsibleOption> = {};
  members.forEach((m) => { byId[m.user_id] = m; });
  const shown = userIds.slice(0, max);
  return (
    <TooltipProvider delayDuration={120}>
      <div className="group/stack flex items-center">
        {shown.map((id, idx) => {
          const m = byId[id];
          const label = m?.name || m?.email || id.slice(0, 8);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "relative cursor-default transition-all duration-300 ease-out",
                    idx > 0 && "-ml-2 group-hover/stack:ml-0.5",
                    "hover:z-20 hover:!ml-2 hover:mr-2 hover:scale-125 hover:-translate-y-1"
                  )}
                >
                  <Avatar className="h-7 w-7 rounded-sm border-2 border-background shadow-sm ring-1 ring-border/40 transition-shadow duration-300 hover:shadow-md [&>img]:rounded-sm">
                    <AvatarImage className="rounded-sm object-cover" src={m?.avatar_url || undefined} alt={label} />
                    <AvatarFallback className="text-[10px] rounded-sm bg-primary/10 text-primary font-medium">
                      {initialsOf(label)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="text-xs font-medium">{label}</p>
                {m?.email && m?.name && (
                  <p className="text-[10px] text-muted-foreground">{m.email}</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {userIds.length > max && (
          <span className="ml-2 text-[10px] font-medium text-muted-foreground transition-transform duration-300 group-hover/stack:translate-x-0.5">
            +{userIds.length - max}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
