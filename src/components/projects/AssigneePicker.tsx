import { useState } from "react";
import { Check, ChevronsUpDown, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { AccountMember } from "@/hooks/useAccountMembers";

const initials = (label: string) =>
  label.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";

export function MemberAvatar({ member, className }: { member?: AccountMember | null; className?: string }) {
  const label = member?.name || member?.email || "Usuário";
  return (
    <Avatar className={cn("h-6 w-6 rounded-full", className)}>
      <AvatarImage src={member?.avatar_url || undefined} alt={label} />
      <AvatarFallback className="text-[10px]">{initials(label)}</AvatarFallback>
    </Avatar>
  );
}

/** Nome + foto do membro, para células de tabela. */
export function MemberCell({ members, userId }: { members: AccountMember[]; userId: string | null }) {
  if (!userId) return <span className="text-muted-foreground">—</span>;
  const m = members.find((x) => x.user_id === userId);
  return (
    <span className="inline-flex max-w-[180px] items-center gap-2">
      <MemberAvatar member={m} />
      <span className="truncate">{m?.name || m?.email || "Usuário"}</span>
    </span>
  );
}

interface Props {
  members: AccountMember[];
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}

/** Seleção de um responsável com foto, nome, e-mail e pesquisa. */
export function AssigneePicker({ members, value, onChange, placeholder = "Selecionar responsável" }: Props) {
  const [open, setOpen] = useState(false);
  const active = members.filter((m) => m.status === "active" || m.user_id === value);
  const selected = members.find((m) => m.user_id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="h-10 w-full justify-between font-normal">
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <MemberAvatar member={selected} />
                <span className="truncate">{selected.name || selected.email}</span>
              </>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar por nome ou e-mail" />
          <CommandList className="max-h-64">
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none sem responsavel" onSelect={() => { onChange(null); setOpen(false); }} className="cursor-pointer gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted"><UserX className="h-3.5 w-3.5 text-muted-foreground" /></span>
                <span className="flex-1 text-sm">Sem responsável</span>
                <Check className={cn("h-4 w-4 text-primary", !value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
              {active.map((m) => {
                const label = m.name || m.email || "Usuário";
                return (
                  <CommandItem key={m.user_id} value={`${label} ${m.email || ""}`} onSelect={() => { onChange(m.user_id); setOpen(false); }} className="cursor-pointer gap-2">
                    <MemberAvatar member={m} className="h-7 w-7" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{label}</p>
                      {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                    </div>
                    <Check className={cn("h-4 w-4 text-primary", value === m.user_id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Filtro por responsável: "all", "none" ou id do membro, com foto e pesquisa. */
export function MemberFilterPicker({ members, value, onChange, className, allLabel = "Todos os responsáveis" }: { members: AccountMember[]; value: string; onChange: (v: string) => void; className?: string; allLabel?: string }) {
  const [open, setOpen] = useState(false);
  const selected = members.find((m) => m.user_id === value) || null;
  const pick = (v: string) => { onChange(v); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className={cn("h-9 w-full justify-between font-normal", className)}>
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (<><MemberAvatar member={selected} className="h-5 w-5" /><span className="truncate">{selected.name || selected.email}</span></>)
              : <span className="truncate">{value === "none" ? "Sem responsável" : allLabel}</span>}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar por nome ou e-mail" />
          <CommandList className="max-h-64">
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all todos" onSelect={() => pick("all")} className="cursor-pointer gap-2">
                <span className="flex-1 text-sm">{allLabel}</span>
                <Check className={cn("h-4 w-4 text-primary", value === "all" ? "opacity-100" : "opacity-0")} />
              </CommandItem>
              <CommandItem value="__none sem responsavel" onSelect={() => pick("none")} className="cursor-pointer gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted"><UserX className="h-3.5 w-3.5 text-muted-foreground" /></span>
                <span className="flex-1 text-sm">Sem responsável</span>
                <Check className={cn("h-4 w-4 text-primary", value === "none" ? "opacity-100" : "opacity-0")} />
              </CommandItem>
              {members.map((m) => {
                const label = m.name || m.email || "Usuário";
                return (
                  <CommandItem key={m.user_id} value={`${label} ${m.email || ""}`} onSelect={() => pick(m.user_id)} className="cursor-pointer gap-2">
                    <MemberAvatar member={m} className="h-7 w-7" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{label}</p>
                      {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                    </div>
                    <Check className={cn("h-4 w-4 text-primary", value === m.user_id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
