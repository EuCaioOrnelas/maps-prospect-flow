import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Handshake, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getManualReferralCode,
  getStoredReferral,
  normalizeReferralCode,
  setManualReferralCode,
} from "@/hooks/usePartnerTracking";

interface Props {
  /** Called whenever a valid code is applied or removed. */
  onChange?: (code: string | null, partnerName?: string | null) => void;
  className?: string;
  /** Renders without the outer card (for use inside an existing card). */
  bare?: boolean;
}

/**
 * Optional "Tem um código de indicação?" field.
 * Validates server-side (validate_partner_referral_code) and persists the code
 * so it can be attached to the trial / checkout attribution.
 */
export function PartnerCodeField({ onChange, className, bare }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; partnerName: string | null } | null>(null);

  // Restore a previously typed code, or pre-fill from an active ?ref= link.
  useEffect(() => {
    const stored = getManualReferralCode();
    if (stored) {
      setApplied({ code: stored.toUpperCase(), partnerName: null });
      setOpen(true);
      onChange?.(stored, null);
      return;
    }
    const linkRef = getStoredReferral();
    if (linkRef?.code) {
      setCode(linkRef.code.toUpperCase());
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = async () => {
    const normalized = normalizeReferralCode(code);
    if (!normalized) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc("validate_partner_referral_code", {
        _code: normalized,
      });
      if (rpcError) {
        setError("Não foi possível validar o código agora. Tente novamente.");
        return;
      }
      if (!data?.valid) {
        setError(
          data?.status === "inactive"
            ? "Este código de indicação não está mais ativo."
            : "Código de indicação não encontrado.",
        );
        return;
      }
      setManualReferralCode(normalized);
      setApplied({ code: data.code || normalized.toUpperCase(), partnerName: data.partner_name ?? null });
      onChange?.(normalized, data.partner_name ?? null);

      // Already signed in (checkout / upgrade): attribute right away so the
      // sale is credited even without a new signup event.
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData?.user;
      if (user) {
        await (supabase as any).rpc("attribute_partner_lead", {
          p_user_id: user.id,
          p_email: user.email,
          p_name: (user.user_metadata as any)?.name ?? null,
          p_referral_code: normalized,
          p_click_id: null,
          p_partner_id: null,
          p_referral_link_id: null,
          p_source: "referral_code",
        });
      }
    } finally {
      setLoading(false);
    }

  };

  const remove = () => {
    setManualReferralCode(null);
    setApplied(null);
    setCode("");
    setError(null);
    onChange?.(null, null);
  };

  const content = applied ? (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-7 w-7 shrink-0 rounded-[9px] bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
          <Check size={14} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold font-mono truncate">{applied.code}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {applied.partnerName ? `Indicado por ${applied.partnerName}` : "Código de indicação aplicado"}
          </div>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={remove}>
        <X size={13} /> Remover
      </Button>
    </div>
  ) : (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validate(); } }}
          placeholder="Ex.: JOAOSILVA"
          maxLength={30}
          className="h-10 font-mono uppercase"
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={validate}
          disabled={loading || !normalizeReferralCode(code)}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );

  const inner = (
    <div className={cn("space-y-3", className)}>
      {!applied && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="h-7 w-7 rounded-[9px] bg-primary/10 text-primary flex items-center justify-center">
            <Handshake size={14} />
          </span>
          <span className="font-medium">Tem um código de indicação?</span>
          <ChevronDown size={14} className={cn("ml-auto transition-transform", open && "rotate-180")} />
        </button>
      )}
      {(open || applied) && content}
    </div>
  );

  if (bare) return inner;

  return <div className="rounded-2xl border border-border/60 bg-card p-4">{inner}</div>;
}
