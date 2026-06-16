import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ExternalLink, Info, ChevronDown, Sparkles } from "lucide-react";
import { AI_PROVIDERS, ProviderId } from "@/lib/aiProviders";
import { cn } from "@/lib/utils";

type Props = {
  enabled: Record<ProviderId, boolean>;
  setEnabled: (v: Record<ProviderId, boolean>) => void;
  keys: Record<ProviderId, string>;
  setKeys: (v: Record<ProviderId, string>) => void;
  savedProviders: Set<string>;
  collapsible?: boolean;
};

export function AIProvidersConnector({
  enabled, setEnabled, keys, setKeys, savedProviders, collapsible = true,
}: Props) {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<ProviderId>("openai");
  const cur = AI_PROVIDERS.find((p) => p.id === active)!;
  const isOn = enabled[active];
  const hasSaved = savedProviders.has(active);

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold">Conectar IAs</p>
            <p className="text-[11px] text-muted-foreground">
              Selecione e conecte os provedores que esse colaborador poderá usar.
            </p>
          </div>
        </div>
        {collapsible && (
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <div className="border-t bg-muted/10">
          {/* Pill-style provider toggle bar (like Dashboard / Contatos / Ranking pills) */}
          <div className="px-3 pt-3">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-muted/60 p-1 ring-1 ring-border/60">
              {AI_PROVIDERS.map((p) => {
                const isActive = active === p.id;
                const connected = savedProviders.has(p.id) || (enabled[p.id] && keys[p.id]?.trim());
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActive(p.id);
                      // Click already activates the IA — no separate switch needed.
                      if (!enabled[p.id]) setEnabled({ ...enabled, [p.id]: true });
                    }}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:text-foreground",
                      enabled[p.id] && !isActive && "text-foreground",
                    )}
                  >
                    <img src={p.logo} alt="" className="size-4 object-contain" />
                    <span>{p.shortName}</span>
                    {connected && (
                      <span className="ml-0.5 size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active provider config */}
          <div className="px-5 pb-5 pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <img src={cur.logo} alt={cur.name} className="size-9 object-contain shrink-0" />
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
              {isOn && (
                <button
                  type="button"
                  onClick={() => setEnabled({ ...enabled, [cur.id]: false })}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  Desativar
                </button>
              )}
            </div>

            {isOn && (
              <>
                {/* Discrete payment notice — appears only when activated */}
                <div className="flex items-start gap-2 text-[11px] rounded-lg px-3 py-2 bg-amber-500/5 text-amber-700 ring-1 ring-amber-500/20">
                  <Info className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    A <strong>{cur.name}</strong> cobra direto de você — o plano e o pagamento da API são feitos na conta do provedor.
                    Mantenha-o ativo para que seu colaborador continue funcionando na Wiize.
                  </span>
                </div>

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
