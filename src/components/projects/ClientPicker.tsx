import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LeadOption { id: string; label: string; sub: string | null }

const toOption = (l: any): LeadOption => ({
  id: l.id,
  label: l.company_name || l.contact_name || "Cliente sem nome",
  sub: l.company_name && l.contact_name ? l.contact_name : l.email || null,
});

/** Busca clientes já cadastrados no CRM (o banco limita à conta do usuário). */
export function ClientPicker({
  value,
  initialLabel,
  onChange,
  disabled,
}: {
  value: string | null;
  initialLabel?: string | null;
  onChange: (id: string | null, label: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState<string | null>(initialLabel ?? null);

  useEffect(() => setLabel(initialLabel ?? null), [initialLabel]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      let q = supabase
        .from("leads")
        .select("id, contact_name, company_name, email")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(20);
      const term = search.trim().replace(/[%,()]/g, "");
      if (term) q = q.or(`contact_name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
      const { data } = await q;
      if (!cancelled) {
        setOptions((data || []).map(toOption));
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, search]);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" disabled={disabled} className="h-10 flex-1 justify-between font-normal">
            <span className={cn("truncate", !value && "text-muted-foreground")}>{value ? label || "Cliente selecionado" : "Selecionar cliente do CRM"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar por nome, empresa ou e-mail..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{loading ? "Buscando..." : "Nenhum cliente encontrado."}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.id}
                    onSelect={() => {
                      setLabel(o.label);
                      onChange(o.id, o.label);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{o.label}</p>
                      {o.sub && <p className="truncate text-xs text-muted-foreground">{o.sub}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" aria-label="Remover cliente" onClick={() => { setLabel(null); onChange(null, null); }}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
