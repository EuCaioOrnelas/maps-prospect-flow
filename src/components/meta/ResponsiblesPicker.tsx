import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
      <Popover open={open} onOpenChange={(o) => { if (!disabled) { setOpen(o); if (!o) setQuery(""); } }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm transition-colors",
              "min-h-10 hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
              {value.length === 0 ? (
                <span className="text-muted-foreground flex items-center gap-2">
                  <UserPlus size={14} /> Adicionar responsáveis
                </span>
              ) : (
                value.map((id) => {
                  const m = byId[id];
                  const label = labelOf(m, id.slice(0, 8));
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-0.5 pl-0.5 pr-1.5 text-xs"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m?.avatar_url || undefined} alt={label} />
                        <AvatarFallback className="text-[9px]">{initialsOf(label)}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate">{label}</span>
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); toggle(id); }}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <X size={11} />
                      </span>
                    </span>
                  );
                })
              )}
            </div>
            <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
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
          <div className="max-h-64 overflow-y-auto py-1">
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
                    blocked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
                  )}
                >
                  <Avatar className="h-7 w-7">
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
          {value.length > 0 && (
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => onChange([])}>
                Limpar seleção
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
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
