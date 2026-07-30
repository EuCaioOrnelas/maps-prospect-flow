import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Lightbulb, Send, CheckCircle2, Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_IMPORTANCE,
  SUGGESTION_TITLE_MAX,
  SUGGESTION_DESCRIPTION_MAX,
} from "@/lib/suggestions";

export default function Suggestions() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [importance, setImportance] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setCompanyName((data as any)?.company_name ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const canSubmit =
    title.trim().length > 0 &&
    category !== "" &&
    importance !== "" &&
    description.trim().length > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      const { error } = await supabase.from("suggestions").insert({
        user_id: user.id,
        account_owner_id: (profile as any)?.parent_owner_id ?? user.id,
        company_name: companyName,
        user_name: (profile as any)?.name ?? null,
        user_email: (profile as any)?.email ?? user.email ?? null,
        category,
        title: title.trim().slice(0, SUGGESTION_TITLE_MAX),
        description: description.trim().slice(0, SUGGESTION_DESCRIPTION_MAX),
        importance,
        status: "recebida",
      } as any);
      if (error) throw error;
      setTitle("");
      setCategory("");
      setImportance("");
      setDescription("");
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({
        title: "Não foi possível enviar",
        description: err?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sugestões de Melhorias · Wiize</title>
        <meta
          name="description"
          content="Envie sugestões de melhorias para a Wiize. Analisamos todas as ideias enviadas pelos nossos clientes."
        />
      </Helmet>
      <div className="min-h-screen bg-background relative">
        <BackgroundGlow />
        <AppSidebar profile={profile as any} />
        <div className="lg:pl-[72px]">
          <div className="lg:hidden">
            <AppHeader profile={profile as any} />
          </div>
          <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Cabeçalho */}
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Lightbulb size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Sugestões de Melhorias</h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Sua opinião é extremamente importante para a evolução da Wiize. Sempre analisamos
                  todas as sugestões recebidas e priorizamos melhorias que geram maior impacto para
                  nossos clientes. Obrigado por contribuir com o crescimento da plataforma.
                </p>
              </div>
            </div>

            {success && (
              <Alert className="border-primary/30 bg-primary/5 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertTitle className="text-foreground">Obrigado!</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Recebemos sua sugestão e ela será analisada pela nossa equipe. Sua contribuição
                  ajuda a tornar a Wiize cada vez melhor.
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-border/60">
              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="suggestion-title">Título da sugestão</Label>
                    <Input
                      id="suggestion-title"
                      value={title}
                      maxLength={SUGGESTION_TITLE_MAX}
                      required
                      placeholder="Ex.: Gostaria de importar contatos por Excel"
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground text-right">
                      {title.length}/{SUGGESTION_TITLE_MAX}
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUGGESTION_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Importância</Label>
                      <Select value={importance} onValueChange={setImportance}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a importância" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUGGESTION_IMPORTANCE.map((i) => (
                            <SelectItem key={i.value} value={i.value}>
                              {i.emoji} {i.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suggestion-description">Descrição</Label>
                    <Textarea
                      id="suggestion-description"
                      value={description}
                      required
                      rows={6}
                      maxLength={SUGGESTION_DESCRIPTION_MAX}
                      placeholder={"Explique detalhadamente sua sugestão.\nConte como ela ajudaria sua empresa."}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none"
                    />
                    <p className="text-[11px] text-muted-foreground text-right">
                      {description.length}/{SUGGESTION_DESCRIPTION_MAX}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                      {submitting ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Send size={16} className="mr-2" />
                      )}
                      Enviar sugestão
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
