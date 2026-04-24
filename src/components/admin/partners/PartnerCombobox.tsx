import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PartnerOption {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  partners: PartnerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

/**
 * Lightweight searchable partner selector — works well even with hundreds of partners.
 * Used for goals, links, manual sales, etc.
 */
export function PartnerCombobox({ partners, value, onChange, placeholder = "Selecione um parceiro...", className, allowClear }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = partners.find((p) => p.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return partners.slice(0, 50);
    const q = query.toLowerCase();
    return partners
      .filter((p) => p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
      .slice(0, 50);
  }, [partners, query]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-left text-sm flex items-center justify-between gap-2 hover:bg-accent/40 transition-colors"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? `${selected.full_name} · ${selected.email}` : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selected && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
            ><X size={12} /></span>
          )}
          <ChevronsUpDown size={14} className="text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum parceiro encontrado.</div>
            ) : filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors",
                  p.id === value && "bg-accent/60"
                )}
              >
                <Check size={13} className={cn("shrink-0", p.id === value ? "text-primary opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.full_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{p.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
