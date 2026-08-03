import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface PickedLead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  origin: string | null;
}

interface Props {
  onSelect: (lead: PickedLead) => void;
  selectedLabel?: string | null;
}

/** Busca leads do CRM / Oportunidades para preencher o compromisso comercial. */
export function LeadPicker({ onSelect, selectedLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<PickedLead[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      let query = supabase
        .from("leads")
        .select("id, company_name, contact_name, email, phone, origin")
        .order("created_at", { ascending: false })
        .limit(20);
      const search = term.trim();
      if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
      }
      const { data } = await query;
      if (!active) return;
      setLeads((data || []) as unknown as PickedLead[]);
      setLoading(false);
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal">
          <Search className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">
            {selectedLabel || "Buscar lead no CRM ou Oportunidades"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] border border-border bg-popover p-0 shadow-lg"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput value={term} onValueChange={setTerm} placeholder="Empresa ou contato" />
          <CommandList className="max-h-64">
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>}
            {!loading && leads.length > 0 && (
              <CommandGroup>
                {leads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={lead.id}
                    onSelect={() => {
                      onSelect(lead);
                      setOpen(false);
                    }}
                    className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {lead.company_name || lead.contact_name || "Lead sem nome"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[lead.contact_name, lead.phone].filter(Boolean).join(" · ") || "Sem contato"}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
