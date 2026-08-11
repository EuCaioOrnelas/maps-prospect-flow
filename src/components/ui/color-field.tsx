import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#3daa57",
  "#16a34a",
  "#0ea5e9",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#db2777",
  "#e11d48",
  "#ea580c",
  "#f59e0b",
  "#0f766e",
  "#18181b",
  "#3f3f46",
  "#71717a",
  "#a1a1aa",
  "#ffffff",
];

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fallback?: string;
  icon?: typeof Palette;
}

/**
 * Campo de cor no padrão Wiize: swatch quadrado com bordas levemente arredondadas,
 * preenchido inteiramente pela cor, e seletor profissional (paleta + hex + picker nativo).
 */
export function ColorField({ label, value, onChange, fallback = "#3daa57", icon: Icon = Palette }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const safe = isHex(value) ? value : fallback;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" /> {label}
      </Label>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label}
              className="h-10 w-10 shrink-0 rounded-xl border border-border/60 overflow-hidden transition-shadow hover:ring-2 hover:ring-primary/25 focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{ background: safe }}
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 rounded-2xl p-3 space-y-3">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2">Cores sugeridas</p>
              <div className="grid grid-cols-8 gap-1.5">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange(c)}
                    aria-label={c}
                    className={cn(
                      "h-6 w-6 rounded-lg border border-border/60 flex items-center justify-center transition-transform hover:scale-110",
                      safe.toLowerCase() === c.toLowerCase() && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    )}
                    style={{ background: c }}
                  >
                    {safe.toLowerCase() === c.toLowerCase() && (
                      <Check className={cn("w-3 h-3", c === "#ffffff" ? "text-zinc-800" : "text-white")} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Cor personalizada</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={safe}
                  onChange={(e) => onChange(e.target.value)}
                  aria-label={`${label} personalizada`}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-border/60 bg-transparent p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch-wrapper]:p-0.5"
                />
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-9 rounded-xl font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl font-mono text-xs uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export default ColorField;
