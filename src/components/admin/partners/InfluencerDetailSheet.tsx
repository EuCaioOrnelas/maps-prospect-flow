import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Loader2, Youtube } from "lucide-react";
import { PROSPECT_STATUSES, fitBadgeVariant, fmtNum } from "@/lib/influencerProspecting";

interface Props {
  prospect: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
}

const DIMENSIONS = [
  { key: "content_fit_score", max: 30, label: "Content Fit", reason: "content_fit_reason" },
  { key: "audience_fit_score", max: 25, label: "Audience Fit", reason: "audience_fit_reason" },
  { key: "reach_score", max: 20, label: "Reach & Engajamento", reason: "reach_reason" },
  { key: "commercial_score", max: 15, label: "Potencial Comercial", reason: "commercial_reason" },
  { key: "quality_score", max: 10, label: "Qualidade & Consistência", reason: "quality_reason" },
];

export function InfluencerDetailSheet({ prospect, open, onOpenChange, onStatusChange }: Props) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !prospect?.id) return;
    if (prospect.videos?.length) {
      setVideos(prospect.videos);
      return;
    }
    setLoading(true);
    (supabase as any)
      .from("influencer_videos")
      .select("*")
      .eq("prospect_id", prospect.id)
      .order("published_at", { ascending: false })
      .then(({ data }: any) => {
        setVideos(data ?? []);
        setLoading(false);
      });
  }, [open, prospect]);

  if (!prospect) return null;
  const ai = prospect.ai_reasoning || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-start gap-3">
            {prospect.thumbnail_url ? (
              <img src={prospect.thumbnail_url} alt={prospect.channel_name} className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Youtube size={20} className="text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <SheetTitle className="truncate">{prospect.channel_name}</SheetTitle>
              <p className="text-sm text-muted-foreground truncate">
                {prospect.channel_handle || "Handle não informado"} · {fmtNum(prospect.subscriber_count)} inscritos
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={fitBadgeVariant(prospect.fit_score)}>{prospect.fit_score ?? 0}/100 · {prospect.fit_category}</Badge>
                {prospect.channel_url && (
                  <a href={prospect.channel_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                    Abrir no YouTube <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Por que este canal é relevante?</h3>
            <p className="text-sm text-muted-foreground">{prospect.ai_summary || "Não informado"}</p>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-2">Contato encontrado</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-muted-foreground shrink-0" />
                {prospect.contact_email ? (
                  <a href={`mailto:${prospect.contact_email}`} className="text-primary break-all">{prospect.contact_email}</a>
                ) : (
                  <span className="text-muted-foreground">E-mail não informado publicamente</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Instagram size={14} className="text-muted-foreground shrink-0" />
                {prospect.instagram_url ? (
                  <a href={prospect.instagram_url} target="_blank" rel="noreferrer" className="text-primary break-all">{prospect.instagram_url.replace("https://instagram.com/", "@")}</a>
                ) : (
                  <span className="text-muted-foreground">Instagram não informado</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-muted-foreground shrink-0" />
                {prospect.website_url ? (
                  <a href={prospect.website_url} target="_blank" rel="noreferrer" className="text-primary break-all">{prospect.website_url}</a>
                ) : (
                  <span className="text-muted-foreground">Site não informado</span>
                )}
              </div>
            </div>
            {Array.isArray(prospect.contact_links) && prospect.contact_links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {prospect.contact_links.slice(0, 8).map((l: string) => (
                  <a key={l} href={l} target="_blank" rel="noreferrer" className="text-[11px] rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-primary truncate max-w-[220px]">
                    {l.replace(/^https?:\/\//, "")}
                  </a>
                ))}
              </div>
            )}
          </section>

          <Separator />


          <section>
            <h3 className="text-sm font-semibold mb-3">Análise de Fit</h3>
            <div className="space-y-3">
              {DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{d.label}</span>
                    <span className="text-muted-foreground">{prospect[d.key] ?? 0}/{d.max}</span>
                  </div>
                  <Progress value={((prospect[d.key] ?? 0) / d.max) * 100} className="h-1.5 mt-1" />
                  {ai[d.reason] && <p className="text-xs text-muted-foreground mt-1">{ai[d.reason]}</p>}
                </div>
              ))}
            </div>
          </section>

          {(ai.strengths?.length || ai.weaknesses?.length) && (
            <>
              <Separator />
              <section className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Pontos fortes</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {(ai.strengths ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Pontos de atenção</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {(ai.weaknesses ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </section>
            </>
          )}

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-3">Conteúdo analisado</h3>
            {loading ? (
              <Loader2 className="animate-spin text-muted-foreground" size={16} />
            ) : videos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum vídeo recente identificado.</p>
            ) : (
              <ul className="space-y-2">
                {videos.map((v) => (
                  <li key={v.youtube_video_id} className="rounded-xl border border-border p-3">
                    <a href={v.video_url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-primary line-clamp-2">
                      {v.title || "Não informado"}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.published_at ? new Date(v.published_at).toLocaleDateString("pt-BR") : "Não informado"} · {fmtNum(v.view_count)} views
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-2">Recomendação</h3>
            <Badge variant={prospect.ai_recommendation === "Abordar" ? "default" : "secondary"}>
              {prospect.ai_recommendation || "Não informado"}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">{ai.recommendation_reason || "Não informado"}</p>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-2">Status do prospect</h3>
            <div className="flex flex-wrap gap-2">
              {PROSPECT_STATUSES.map((s) => (
                <Button
                  key={s.value}
                  size="sm"
                  variant={prospect.status === s.value ? "default" : "outline"}
                  onClick={() => onStatusChange(prospect.id, s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
