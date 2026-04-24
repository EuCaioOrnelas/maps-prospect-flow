import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, MousePointerClick, UserPlus, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReferralLink {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  is_active: boolean;
  total_clicks: number;
  total_leads: number;
  total_paid_clients: number;
}

interface Props {
  partner: { id: string; referral_code: string };
  onSelectFilter?: (linkId: string | null) => void;
  selectedLinkId?: string | null;
  showFilters?: boolean;
}

export function ReferralLinksCard({ partner, onSelectFilter, selectedLinkId, showFilters }: Props) {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const { data } = await supabase
        .from("partner_referral_links")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: true });
      setLinks((data as any) || []);
    })();
  }, [partner?.id]);

  const baseLink = `${window.location.origin}/?ref=${partner.referral_code}`;
  const buildSlugLink = (slug: string) => `${window.location.origin}/r/${slug}`;

  const copy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <Link2 size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">Seus links de indicação</div>
            <div className="text-xs text-muted-foreground">A atribuição é vitalícia — comissão até o cliente cancelar.</div>
          </div>
        </div>

        {/* Default link */}
        <LinkRow
          id="default"
          label="Link principal"
          description="Use em qualquer canal"
          url={baseLink}
          stats={null}
          onCopy={() => copy("default", baseLink)}
          copied={copiedId === "default"}
          highlighted={!selectedLinkId && !!showFilters}
          onSelect={showFilters ? () => onSelectFilter?.(null) : undefined}
          selected={showFilters && !selectedLinkId}
        />

        {links.map((l) => (
          <LinkRow
            key={l.id}
            id={l.id}
            label={l.label}
            description={l.description || `Campanha personalizada · /r/${l.slug}`}
            url={buildSlugLink(l.slug)}
            stats={{ clicks: l.total_clicks, leads: l.total_leads, paid: l.total_paid_clients }}
            onCopy={() => copy(l.id, buildSlugLink(l.slug))}
            copied={copiedId === l.id}
            disabled={!l.is_active}
            onSelect={showFilters ? () => onSelectFilter?.(l.id) : undefined}
            selected={showFilters && selectedLinkId === l.id}
          />
        ))}

        {links.length === 0 && (
          <div className="text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg p-3 text-center">
            Os links de campanha personalizados criados pelo admin aparecerão aqui.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinkRow({
  label, description, url, stats, onCopy, copied, disabled, highlighted, onSelect, selected,
}: {
  id: string;
  label: string;
  description: string;
  url: string;
  stats: { clicks: number; leads: number; paid: number } | null;
  onCopy: () => void;
  copied: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        selected
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : highlighted
          ? "border-primary/30 bg-primary/[0.04]"
          : "border-border/60 bg-card/60",
        disabled && "opacity-60",
        onSelect && !selected && "cursor-pointer hover:border-primary/40",
      )}
      onClick={onSelect && !selected ? onSelect : undefined}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-medium flex items-center gap-2">
            {label}
            {disabled && <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground rounded px-1.5 py-0.5">Inativo</span>}
            {selected && <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5">Filtrando</span>}
          </div>
          <div className="text-[11px] text-muted-foreground">{description}</div>
        </div>
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCopy(); }} className="gap-1.5 h-8" disabled={disabled}>
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <code className="text-[11px] font-mono text-muted-foreground/90 truncate block mt-1">{url}</code>
      {stats && (
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MousePointerClick size={12} /> {stats.clicks} cliques</span>
          <span className="inline-flex items-center gap-1"><UserPlus size={12} /> {stats.leads} leads</span>
          <span className="inline-flex items-center gap-1"><DollarSign size={12} /> {stats.paid} pagos</span>
        </div>
      )}
    </div>
  );
}
