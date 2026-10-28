import { ArrowDown, ArrowUp, Lock, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { useColumnPrefs } from "@/hooks/useColumnPrefs";

interface Props {
  prefs: ReturnType<typeof useColumnPrefs>;
  labels: Record<string, string>;
}

/** Botão que abre a configuração de ordem e visibilidade das colunas. */
export function ColumnsConfig({ prefs, labels }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Colunas</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold">Configurar colunas</p>
          <p className="text-xs text-muted-foreground">Escolha a ordem e quais colunas aparecem.</p>
        </div>
        <ul className="max-h-80 space-y-0.5 overflow-y-auto p-2">
          {prefs.order.map((k, i) => {
            const locked = prefs.locked.includes(k);
            return (
              <li key={k} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                {locked ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Checkbox checked={!prefs.hidden.includes(k)} onCheckedChange={() => prefs.toggle(k)} aria-label={`Mostrar ${labels[k]}`} />
                )}
                <span className="flex-1 truncate text-sm">{labels[k]}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => prefs.move(k, -1)} aria-label="Subir">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === prefs.order.length - 1} onClick={() => prefs.move(k, 1)} aria-label="Descer">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border/60 p-2">
          <Button variant="ghost" size="sm" className="h-8 w-full gap-1.5 text-xs" onClick={prefs.reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
