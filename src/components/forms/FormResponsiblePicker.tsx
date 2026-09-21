import { Check, ChevronsUpDown, Search, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Member {
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Props {
  members: Member[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}

const initials = (member?: Member) =>
  (member?.name || member?.email || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function FormResponsiblePicker({ members, value, onChange, multiple = false, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = members.filter((member) => value.includes(member.user_id));
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter((member) => `${member.name || ""} ${member.email || ""}`.toLowerCase().includes(normalized));
  }, [members, query]);

  const toggle = (id: string) => {
    if (!multiple) {
      onChange(value.includes(id) ? [] : [id]);
      setOpen(false);
      return;
    }
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm transition-colors",
          "hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary/50 ring-2 ring-primary/10",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !selected.length && "text-muted-foreground")}>
            {!selected.length
              ? multiple ? "Selecionar vendedores" : "Selecionar responsável"
              : selected.length === 1 ? selected[0].name || selected[0].email : `${selected.length} vendedores selecionados`}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((member) => {
              const label = member.name || member.email || "Membro da equipe";
              const active = value.includes(member.user_id);
              return (
                <button key={member.user_id} type="button" onClick={() => toggle(member.user_id)} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60", active && "bg-primary/10")}>
                  <Avatar className="h-8 w-8 rounded-md border border-border">
                    <AvatarImage src={member.avatar_url || undefined} alt={label} className="object-cover" />
                    <AvatarFallback className="rounded-md bg-primary/10 text-[10px] font-semibold text-primary">{initials(member)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{label}</span>
                    {member.email && member.name && <span className="block truncate text-xs text-muted-foreground">{member.email}</span>}
                  </span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
            {!filtered.length && <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum vendedor encontrado.</p>}
          </div>
        </div>
      )}

      {!!selected.length && (
        <div className="flex flex-wrap gap-2">
          {selected.map((member) => (
            <span key={member.user_id} className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
              <Avatar className="h-5 w-5 rounded-sm"><AvatarImage src={member.avatar_url || undefined} /><AvatarFallback className="rounded-sm text-[8px]">{initials(member)}</AvatarFallback></Avatar>
              <span className="max-w-40 truncate">{member.name || member.email}</span>
              <button type="button" aria-label="Remover responsável" onClick={() => toggle(member.user_id)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}