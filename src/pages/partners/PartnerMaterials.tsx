import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Copy, Check, Download, Megaphone, MessageSquare, Mail, Share2, FileImage,
  Palette, Sparkles, Video, FileText, Lightbulb, Search, ExternalLink, Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";
import { ReferralLinksCard } from "@/components/partners/ReferralLinksCard";
import wiizeLogoColor from "@/assets/logos/wiize-logo.png";
import wiizeLogoWhite from "@/assets/logos/wiize-logo-white.png";
import wiizeIcon from "@/assets/logo-icon-new.png";

interface Material {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  content_text: string | null;
  asset_url: string | null;
  preview_url: string | null;
  format: string | null;
  dimensions: string | null;
  tags: string[] | null;
  meta: any;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  copy:     { label: "Mensagens",  icon: MessageSquare, color: "text-blue-500" },
  social:   { label: "Redes sociais", icon: Share2,    color: "text-pink-500" },
  email:    { label: "E-mails",    icon: Mail,         color: "text-amber-500" },
  banner:   { label: "Banners",    icon: FileImage,    color: "text-purple-500" },
  video:    { label: "Vídeos",     icon: Video,        color: "text-red-500" },
  document: { label: "Documentos", icon: FileText,     color: "text-emerald-500" },
  ideas:    { label: "Ideias que vendem", icon: Lightbulb, color: "text-yellow-500" },
};

const brandColors = [
  { name: "Wiize Green", hex: "#1AAB6B" },
  { name: "Wiize Green Hover", hex: "#15945C" },
  { name: "Wiize Dark", hex: "#0A0F14" },
  { name: "Wiize Surface", hex: "#0F141B" },
  { name: "Wiize Foreground", hex: "#F8FAFC" },
];

const logoAssets = [
  { id: "color", label: "Logo colorido (PNG)", src: wiizeLogoColor, bg: "bg-white", filename: "wiize-logo-color.png" },
  { id: "white", label: "Logo branco (PNG)",   src: wiizeLogoWhite, bg: "bg-gradient-to-br from-slate-800 to-slate-950", filename: "wiize-logo-white.png" },
  { id: "icon",  label: "Ícone (PNG)",          src: wiizeIcon,      bg: "bg-gradient-to-br from-slate-50 to-slate-100", filename: "wiize-icon.png" },
];

export default function PartnerMaterials() {
  const { partner } = useOutletContext<any>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [videoOpen, setVideoOpen] = useState<{ src: string; title: string } | null>(null);
  const { toast } = useToast();

  const refLink = `${window.location.origin}/?ref=${partner.referral_code}`;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_materials")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setMaterials((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const replaceVars = (text: string) =>
    text
      .split("{{LINK}}").join(refLink)
      .split("{{NOME}}").join("[Nome do contato]")
      .split("{{SEU_NOME}}").join(partner.full_name.split(" ")[0]);

  const copyContent = async (m: Material) => {
    if (!m.content_text) return;
    await navigator.clipboard.writeText(replaceVars(m.content_text));
    setCopiedId(m.id);
    toast({ title: "Copiado!", description: "O texto já está pronto para colar." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyColor = async (hex: string) => {
    await navigator.clipboard.writeText(hex);
    toast({ title: `${hex} copiado` });
  };

  const downloadAsset = (src: string, filename: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtros
  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (tab !== "all" && m.category !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [m.title, m.description, m.subcategory, ...(m.tags || [])]
          .filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [materials, tab, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: materials.length };
    Object.keys(CATEGORY_META).forEach((k) => { c[k] = 0; });
    materials.forEach((m) => { c[m.category] = (c[m.category] || 0) + 1; });
    return c;
  }, [materials]);

  // Agrupar por subcategoria dentro do filtro
  const grouped = useMemo(() => {
    const g: Record<string, Material[]> = {};
    filtered.forEach((m) => {
      const key = m.subcategory || "Geral";
      (g[key] = g[key] || []).push(m);
    });
    return g;
  }, [filtered]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Central de divulgação"
        subtitle="Tudo o que você precisa para vender: marca, copy, vídeos e materiais profissionais"
        icon={Megaphone}
      />

      <ReferralLinksCard partner={partner} />

      {/* Brand kit: Logos */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">Marca Wiize</div>
              <div className="text-xs text-muted-foreground">Use os logos oficiais — não altere cores ou proporções</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {logoAssets.map((l) => (
              <div key={l.id} className="rounded-xl border border-border/60 overflow-hidden">
                <div className={`${l.bg} h-32 flex items-center justify-center p-6`}>
                  <img src={l.src} alt={l.label} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{l.label}</span>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => downloadAsset(l.src, l.filename)}>
                    <Download size={12} /> Baixar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Brand kit: Colors */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
              <Palette size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">Paleta de cores</div>
              <div className="text-xs text-muted-foreground">Clique para copiar o código HEX</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {brandColors.map((c) => (
              <button
                key={c.hex}
                onClick={() => copyColor(c.hex)}
                className="text-left rounded-xl border border-border/60 overflow-hidden group hover:shadow-md transition-shadow"
              >
                <div style={{ background: c.hex }} className="h-20 group-hover:brightness-105 transition-all" />
                <div className="p-2.5">
                  <div className="text-xs font-semibold">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{c.hex}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Biblioteca de materiais */}
      <Card className="border-border/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                <Megaphone size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold">Biblioteca de materiais</div>
                <div className="text-xs text-muted-foreground">Copy, vídeos, banners e ideias prontas para postar</div>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar material..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Tabs por categoria */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto bg-muted/50">
              <TabsTrigger value="all" className="gap-1.5">
                Todos <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts.all || 0}</Badge>
              </TabsTrigger>
              {Object.entries(CATEGORY_META).map(([k, meta]) => {
                if (!counts[k]) return null;
                const Icon = meta.icon;
                return (
                  <TabsTrigger key={k} value={k} className="gap-1.5">
                    <Icon size={13} className={meta.color} />
                    {meta.label}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{counts[k]}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={tab} className="mt-5">
              {loading ? (
                <div className="p-10 text-center">
                  <div className="h-6 w-6 mx-auto rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              ) : Object.keys(grouped).length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  {search ? "Nenhum material encontrado para sua busca." : "Nenhum material disponível ainda nesta categoria."}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped).map(([subcat, items]) => (
                    <div key={subcat}>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                        {subcat} <span className="text-muted-foreground/60">· {items.length}</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        {items.map((m) => (
                          <MaterialCard
                            key={m.id}
                            material={m}
                            copiedId={copiedId}
                            onCopy={copyContent}
                            onPlayVideo={(src, title) => setVideoOpen({ src, title })}
                            replaceVars={replaceVars}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-dashed border-border/60 bg-card/50">
        <CardContent className="p-5 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">Dica:</strong> os textos com <code className="bg-muted px-1.5 py-0.5 rounded">{`{{LINK}}`}</code> são preenchidos automaticamente com o seu link de indicação ao copiar.
        </CardContent>
      </Card>

      {/* Modal vídeo */}
      {videoOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setVideoOpen(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-border/60">
              <div className="text-sm font-medium">{videoOpen.title}</div>
              <Button variant="ghost" size="sm" onClick={() => setVideoOpen(null)}>Fechar</Button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={videoOpen.src}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={videoOpen.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialCard({
  material, copiedId, onCopy, onPlayVideo, replaceVars,
}: {
  material: Material;
  copiedId: string | null;
  onCopy: (m: Material) => void;
  onPlayVideo: (src: string, title: string) => void;
  replaceVars: (s: string) => string;
}) {
  const meta = CATEGORY_META[material.category] || { label: material.category, icon: FileText, color: "text-muted-foreground" };
  const Icon = meta.icon;
  const driveId: string | null = material.meta?.drive_id || null;
  const drivePreview = driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w800` : null;
  const driveEmbed = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;

  return (
    <Card className="border-border/60 hover:border-primary/40 transition-colors overflow-hidden">
      <CardContent className="p-0">
        {/* Visual: vídeo do Drive, preview, ou ícone */}
        {driveId ? (
          <button
            onClick={() => onPlayVideo(driveEmbed!, material.title)}
            className="w-full aspect-video bg-black relative group overflow-hidden"
          >
            {drivePreview && (
              <img
                src={drivePreview}
                alt={material.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play size={22} fill="currentColor" />
              </div>
            </div>
          </button>
        ) : material.preview_url ? (
          <img
            src={material.preview_url}
            alt={material.title}
            className="w-full aspect-video object-cover border-b border-border/40"
          />
        ) : null}

        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-tight">{material.title}</h3>
              <Icon size={14} className={`${meta.color} shrink-0 mt-0.5`} />
            </div>
            {material.description && (
              <p className="text-xs text-muted-foreground">{material.description}</p>
            )}
          </div>

          {(material.tags?.length || material.format || material.dimensions) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {material.format && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{material.format}</Badge>
              )}
              {material.dimensions && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{material.dimensions}</Badge>
              )}
              {material.tags?.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1.5">#{t}</Badge>
              ))}
            </div>
          )}

          {material.content_text && (
            <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
                {replaceVars(material.content_text)}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {material.content_text && (
              <Button size="sm" variant="outline" className="flex-1 gap-2 h-8" onClick={() => onCopy(material)}>
                {copiedId === material.id ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                {copiedId === material.id ? "Copiado" : "Copiar"}
              </Button>
            )}
            {driveId && (
              <a
                href={`https://drive.google.com/uc?export=download&id=${driveId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button size="sm" variant="outline" className="w-full gap-2 h-8">
                  <Download size={13} /> Baixar vídeo
                </Button>
              </a>
            )}
            {material.asset_url && !driveId && (
              <a href={material.asset_url} target="_blank" rel="noopener noreferrer" download className="flex-1">
                <Button size="sm" variant="outline" className="w-full gap-2 h-8">
                  <Download size={13} /> Baixar
                </Button>
              </a>
            )}
            {material.asset_url && (material.content_text || driveId) && (
              <a href={material.asset_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Abrir externamente">
                  <ExternalLink size={13} />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
