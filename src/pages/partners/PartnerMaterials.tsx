import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Download, Megaphone, MessageSquare, Mail, Share2, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const replaceVars = (text: string) => {
    return text
      .replaceAll("{{LINK}}", refLink)
      .replaceAll("{{NOME}}", "[Nome do contato]")
      .replaceAll("{{SEU_NOME}}", partner.full_name.split(" ")[0]);
  };

  const copyContent = async (m: Material) => {
    if (!m.content_text) return;
    await navigator.clipboard.writeText(replaceVars(m.content_text));
    setCopiedId(m.id);
    toast({ title: "Copiado!", description: "O texto já está pronto para colar." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const grouped = materials.reduce((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {} as Record<string, Material[]>);

  const categories = Object.keys(grouped);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mt-12" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Materiais de divulgação</h1>
        <p className="text-sm text-muted-foreground mt-1">Use, copie, adapte. Tudo pronto para você compartilhar agora.</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Seu link</p>
            <code className="text-sm font-mono truncate block">{refLink}</code>
          </div>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(refLink); toast({ title: "Link copiado" }); }}>
            <Copy size={14} className="mr-2" /> Copiar
          </Button>
        </CardContent>
      </Card>

      {categories.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum material disponível ainda.</CardContent></Card>
      ) : (
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList>
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
                        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
                          {replaceVars(m.content_text)}
                        </pre>
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
          <strong className="text-foreground">Dica:</strong> os textos com <code className="bg-muted px-1.5 py-0.5 rounded">{`{{LINK}}`}</code> já são preenchidos automaticamente com o seu link de indicação ao copiar.
        </CardContent>
      </Card>
    </div>
  );
}
