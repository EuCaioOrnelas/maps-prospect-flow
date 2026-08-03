import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountMember } from "@/hooks/useAccountMembers";

interface Props {
  members: AccountMember[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const initials = (label: string) =>
  label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

/** Seleção de participantes com busca (multi-select). */
export function MemberPicker({ members, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => members.filter((m) => value.includes(m.user_id)),
    [members, value],
  );

  const toggle = (userId: string) =>
    onChange(
      value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId],
    );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selected.length
                  ? `${selected.length} participante${selected.length > 1 ? "s" : ""}`
                  : placeholder || "Buscar e selecionar participantes"}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] border border-border bg-popover p-0 shadow-lg"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Pesquisar por nome ou e-mail" />
            <CommandList className="max-h-64">
              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
              <CommandGroup>
                {members.map((m) => {
                  const label = m.name || m.email || "Usuário";
                  const checked = value.includes(m.user_id);
                  return (
                    <CommandItem
                      key={m.user_id}
                      value={`${label} ${m.email || ""}`}
                      onSelect={() => toggle(m.user_id)}
                      className="cursor-pointer gap-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Avatar className="h-7 w-7 rounded-md">
                        <AvatarImage src={m.avatar_url || undefined} alt={label} />
                        <AvatarFallback className="rounded-md text-[10px]">
                          {initials(label)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{label}</p>
                        {m.email && (
                          <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 text-primary",
                          checked ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((m) => {
            const label = m.name || m.email || "Usuário";
            return (
              <Badge key={m.user_id} variant="secondary" className="gap-1 pr-1 font-normal">
                <span className="max-w-[150px] truncate">{label}</span>
                <button
                  type="button"
                  onClick={() => toggle(m.user_id)}
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Remover ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
