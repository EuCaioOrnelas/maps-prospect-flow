import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Download, Megaphone, MessageSquare, Mail, Share2, FileImage, Palette, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";
import { ReferralLinksCard } from "@/components/partners/ReferralLinksCard";
import wiizeLogoColor from "@/assets/logos/wiize-logo.png";
import wiizeLogoWhite from "@/assets/logos/wiize-logo-white.png";
import wiizeIcon from "@/assets/logo-icon-new.png";

interface Material {
  id: string;
  category: string;
  title: string;
  description: string | null;
  content_text: string | null;
  asset_url: string | null;
  preview_url: string | null;
  format: string | null;
  dimensions: string | null;
}

const categoryLabels: Record<string, { label: string; icon: any }> = {
  copy: { label: "Mensagens prontas", icon: MessageSquare },
  social: { label: "Redes sociais", icon: Share2 },
  email: { label: "E-mails", icon: Mail },
  banner: { label: "Banners", icon: FileImage },
  video: { label: "Vídeos", icon: Megaphone },
};

const brandColors = [
  { name: "Wiize Green", hex: "#10b981", hsl: "158 64% 52%" },
  { name: "Wiize Dark", hex: "#0f172a", hsl: "222 47% 11%" },
  { name: "Wiize Surface", hex: "#f8fafc", hsl: "210 40% 98%" },
  { name: "Wiize Accent", hex: "#3b82f6", hsl: "217 91% 60%" },
  { name: "Wiize Warning", hex: "#f59e0b", hsl: "38 92% 50%" },
];

const logoAssets = [
  { id: "color", label: "Logo colorido (PNG)", src: wiizeLogoColor, bg: "bg-white", filename: "wiize-logo-color.png" },
  { id: "white", label: "Logo branco (PNG)", src: wiizeLogoWhite, bg: "bg-slate-900", filename: "wiize-logo-white.png" },
  { id: "icon", label: "Ícone (PNG)", src: wiizeIcon, bg: "bg-white", filename: "wiize-icon.png" },
];

export default function PartnerMaterials() {
  const { partner } = useOutletContext<any>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const grouped = materials.reduce((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {} as Record<string, Material[]>);
  const categories = Object.keys(grouped);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Materiais de divulgação" subtitle="Logos, paleta de cores, copy e assets prontos para usar" icon={Megaphone} />

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

      {/* Editorial copy / banners */}
      {loading ? (
        <Card><CardContent className="p-10 text-center"><div className="h-6 w-6 mx-auto rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></CardContent></Card>
      ) : categories.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum material editorial disponível ainda.</CardContent></Card>
      ) : (
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {categories.map((c) => {
              const meta = categoryLabels[c] || { label: c, icon: FileImage };
              return (
                <TabsTrigger key={c} value={c} className="gap-2">
                  <meta.icon size={14} /> {meta.label} <span className="text-xs text-muted-foreground">({grouped[c].length})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((c) => (
            <TabsContent key={c} value={c} className="mt-5 grid md:grid-cols-2 gap-4">
              {grouped[c].map((m) => (
                <Card key={m.id} className="border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold">{m.title}</h3>
                        {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                      </div>
                    </div>
                    {m.content_text && (
                      <div className="mt-3 bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">{replaceVars(m.content_text)}</pre>
                      </div>
                    )}
                    {m.preview_url && (
                      <img src={m.preview_url} alt={m.title} className="mt-3 rounded-lg w-full border border-border/50" />
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      {m.content_text && (
                        <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => copyContent(m)}>
                          {copiedId === m.id ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                          {copiedId === m.id ? "Copiado" : "Copiar texto"}
                        </Button>
                      )}
                      {m.asset_url && (
                        <a href={m.asset_url} target="_blank" rel="noopener noreferrer" download className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-2"><Download size={14} /> Baixar</Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Card className="border-dashed border-border/60 bg-card/50">
        <CardContent className="p-5 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">Dica:</strong> os textos com <code className="bg-muted px-1.5 py-0.5 rounded">{`{{LINK}}`}</code> são preenchidos automaticamente com o seu link de indicação ao copiar.
        </CardContent>
      </Card>
    </div>
  );
}
