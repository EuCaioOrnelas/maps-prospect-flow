import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  config: any;
  updateConfig: (k: string, v: any) => void;
  entryConfig: any;
}

/**
 * Reusable HSM template selector for "out-of-window" (24h) Meta delivery.
 * Stores: out_of_window_template_name / _language / _category in the node config.
 * Only renders for Meta-connected entries; for Evolution, it's a no-op (returns null).
 */
export function OutOfWindowTemplateSection({ config, updateConfig, entryConfig }: Props) {
  const isMeta = entryConfig?.api_type === "meta";
  const wabaId = entryConfig?.waba_connection_id ? null : null; // unused, kept for clarity
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expired, setExpired] = useState(false);

  // We need the waba connection's access_token + waba_id. Fetch by id if present.
  useEffect(() => {
    if (!isMeta || !entryConfig?.waba_connection_id) {
      setTemplates([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setExpired(false);
      try {
        const { data: conn } = await supabase
          .from("user_waba_connections")
          .select("waba_id, access_token, status")
          .eq("id", entryConfig.waba_connection_id)
          .maybeSingle();
        if (!conn || conn.status !== "active") {
          if (!cancelled) setExpired(true);
          return;
        }
        const { data, error } = await supabase.functions.invoke("meta-fetch-templates", {
          body: { waba_id: conn.waba_id, access_token: conn.access_token },
        });
        if (cancelled) return;
        if (error || data?.error) {
          const details = (data as any)?.details?.error;
          if (details?.code === 190 || details?.error_subcode === 463) setExpired(true);
          return;
        }
        if (data?.templates) {
          setTemplates(data.templates.filter((t: any) => t.status === "APPROVED"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [entryConfig?.waba_connection_id, isMeta]);

  if (!isMeta) return null;

  const filtered = templates.filter((t: any) =>
    t.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-2">
        <Info size={13} className="text-primary shrink-0 mt-0.5" />
        <div>
          <Label className="text-xs font-medium text-primary">Fora da janela de 24h</Label>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
            Se este bloco for executado mais de 24h após a última mensagem do lead, o WhatsApp exige um template HSM
            aprovado. Selecione qual template usar nesse caso.
          </p>
        </div>
      </div>

      {expired ? (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive">
            Token da Meta expirado. Reconecte o número em <span className="font-semibold">Números → API Oficial</span>.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 size={14} className="animate-spin" /> Carregando templates...
        </div>
      ) : (
        <>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar template..."
            className="h-8 text-xs"
          />
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-2 text-center">
                {search ? "Nenhum template encontrado" : "Nenhum template aprovado disponível"}
              </p>
            )}
            {filtered.map((t: any) => (
              <button
                key={t.name}
                onClick={() => {
                  updateConfig("out_of_window_template_name", t.name);
                  updateConfig("out_of_window_template_language", t.language);
                  updateConfig("out_of_window_template_category", t.category);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors",
                  config.out_of_window_template_name === t.name
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/40 bg-card hover:border-primary/30 text-muted-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <Badge variant="secondary" className="text-[8px] h-4">{t.category}</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{t.language}</p>
              </button>
            ))}
          </div>
          {config.out_of_window_template_name && (
            <div className="flex items-center gap-2 mt-1 p-2 rounded bg-primary/10 border border-primary/20">
              <CheckCircle2 size={12} className="text-primary shrink-0" />
              <span className="text-[10px] text-foreground font-medium truncate">
                {config.out_of_window_template_name}
              </span>
              <button
                onClick={() => {
                  updateConfig("out_of_window_template_name", "");
                  updateConfig("out_of_window_template_language", "");
                  updateConfig("out_of_window_template_category", "");
                }}
                className="ml-auto"
              >
                <X size={12} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
