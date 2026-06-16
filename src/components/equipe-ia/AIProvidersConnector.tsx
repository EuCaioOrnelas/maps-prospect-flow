import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { AI_PROVIDERS, ProviderId } from "@/lib/aiProviders";
import { cn } from "@/lib/utils";

type Props = {
  enabled: Record<ProviderId, boolean>;
  setEnabled: (v: Record<ProviderId, boolean>) => void;
  keys: Record<ProviderId, string>;
  setKeys: (v: Record<ProviderId, string>) => void;
  savedProviders: Set<string>;
};

export function AIProvidersConnector({ enabled, setEnabled, keys, setKeys, savedProviders }: Props) {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<ProviderId>("openai");
  const cur = AI_PROVIDERS.find((p) => p.id === active)!;
  const isOn = enabled[active];
  const hasSaved = savedProviders.has(active);

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold">Conectar IAs</p>
            <p className="text-[11px] text-muted-foreground">
              Conecte os provedores que esse colaborador poderá usar.
            </p>
          </div>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t bg-muted/10">
          {/* Provider tabs */}
          <div className="flex gap-2 px-5 pt-4 pb-3 overflow-x-auto">
            {AI_PROVIDERS.map((p) => {
              const isActive = active === p.id;
              const connected = savedProviders.has(p.id) || (enabled[p.id] && keys[p.id]?.trim());
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border bg-card px-3 py-2.5 min-w-[78px] transition-all",
                    isActive
                      ? "border-primary ring-2 ring-primary/20 shadow-sm"
                      : "hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <img src={p.logo} alt={p.name} className="size-7 object-contain" />
                  <span className="text-[11px] font-medium leading-none">{p.shortName}</span>
                  {connected && (
                    <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full size-4 flex items-center justify-center ring-2 ring-card">
                      <CheckCircle2 className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active provider config */}
          <div className="px-5 pb-5 pt-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src={cur.logo} alt={cur.name} className="size-10 object-contain shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{cur.name}</p>
                  {hasSaved && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded ring-1 ring-emerald-500/20">
                      <CheckCircle2 className="size-3" /> conectado
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{cur.helper}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer shrink-0">
                <span>Ativar</span>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={isOn}
                  onChange={(e) => setEnabled({ ...enabled, [cur.id]: e.target.checked })}
                />
              </label>
            </div>

            {isOn && (
              <>
                <div className="rounded-xl border bg-card/60 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Como conectar
                  </p>
                  <ol className="space-y-1.5">
                    {cur.steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="size-4 rounded-full bg-primary/15 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  <a
                    href={cur.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2.5"
                  >
                    Abrir página oficial <ExternalLink className="size-3" />
                  </a>
                </div>

                <Input
                  type="password"
                  placeholder={hasSaved ? "•••••• (chave salva — preencha para substituir)" : cur.placeholder}
                  value={keys[cur.id]}
                  onChange={(e) => setKeys({ ...keys, [cur.id]: e.target.value })}
                />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
