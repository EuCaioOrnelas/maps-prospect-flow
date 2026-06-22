import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  accountOwnerId: string | null | undefined;
  onEditProfile: () => void;
}

const FORA_PUBLICO_PATTERNS = [
  "NÃO faz parte da sua persona ideal",
  "fora da persona ideal",
];

/**
 * Banner que aparece quando >50% dos leads analisados nos últimos 30 dias
 * vieram diagnosticados como "fora da persona ideal". Sinaliza que o perfil
 * da empresa pode estar mal configurado ou que a segmentação da prospecção
 * está desalinhada com o produto vendido.
 */
export function IdealAudienceMismatchBanner({ accountOwnerId, onEditProfile }: Props) {
  const [counts, setCounts] = useState<{ analyzed: number; foraPublico: number }>({
    analyzed: 0,
    foraPublico: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!accountOwnerId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("leads")
        .select("ai_diagnosis")
        .eq("owner_user_id", accountOwnerId)
        .in("origin", ["oportunidades", "prospeccao"])
        .gte("created_at", since)
        .not("ai_diagnosis", "is", null)
        .limit(500);
      if (cancelled || error) return;
      const analyzed = data?.length ?? 0;
      const foraPublico = (data ?? []).filter((row) => {
        const diag = String(row.ai_diagnosis ?? "");
        return FORA_PUBLICO_PATTERNS.some((p) => diag.includes(p));
      }).length;
      setCounts({ analyzed, foraPublico });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [accountOwnerId]);

  const ratio = useMemo(
    () => (counts.analyzed > 0 ? counts.foraPublico / counts.analyzed : 0),
    [counts],
  );

  // Só exibe se houver >=5 análises e mais de 50% fora do público
  if (!loaded || dismissed || counts.analyzed < 5 || ratio < 0.5) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {Math.round(ratio * 100)}% dos seus leads recentes foram marcados como "fora do público ideal"
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts.foraPublico} de {counts.analyzed} análises nos últimos 30 dias. Revise o perfil da empresa (produtos e público-alvo) ou ajuste a segmentação da prospecção.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => setDismissed(true)}>
          Ignorar
        </Button>
        <Button size="sm" onClick={onEditProfile} className="gap-2">
          <Settings size={14} />
          Editar Perfil
        </Button>
      </div>
    </div>
  );
}
