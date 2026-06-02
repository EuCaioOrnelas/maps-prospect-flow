import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { Loader2, CheckCircle2, Star } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function SupportRating() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<{ ticket_number: string; name: string | null; category: string | null } | null>(null);
  const [helpful, setHelpful] = useState<number | null>(null);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("support-rating-info", {
          body: { token },
        });
        if (error) throw error;
        setTicket(data?.ticket || null);
      } catch (e: any) {
        setError("Esta avaliação não está mais disponível.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async () => {
    if (helpful == null || recommend == null) {
      setError("Por favor, responda as duas perguntas antes de enviar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.functions.invoke("support-rating-submit", {
        body: { token, nps_score: helpful, nps_recommend: recommend, nps_comment: comment },
      });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      setError("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  const Scale = ({ value, onChange }: { value: number | null; onChange: (v: number) => void }) => (
    <div className="grid grid-cols-11 gap-1.5 mt-2">
      {Array.from({ length: 11 }, (_, i) => i).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-10 rounded-md text-sm font-medium border transition-all ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow"
                : "bg-card text-foreground border-border hover:border-primary/40"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <SEO title="Avaliar atendimento Wiize" description="Conta pra gente como foi seu atendimento na Wiize." />
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="mb-6"><Logo size="md" /></div>
        <Card className="w-full max-w-2xl p-6 sm:p-8">
          {loading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : done ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-3" />
              <h1 className="text-2xl font-bold mb-2">Obrigado pelo feedback! 💚</h1>
              <p className="text-muted-foreground">Sua opinião ajuda a Wiize a melhorar todos os dias.</p>
            </div>
          ) : error && !ticket ? (
            <div className="text-center py-10">
              <h1 className="text-xl font-semibold mb-2">Ops…</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : ticket ? (
            <>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Star className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wide font-semibold">Avalie seu atendimento</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">Olá{ticket.name ? `, ${ticket.name.split(" ")[0]}` : ""}! 👋</h1>
              <p className="text-muted-foreground mb-6">
                Sua opinião sobre o ticket <span className="font-mono text-primary">#{ticket.ticket_number}</span>
                {ticket.category ? <> (<span>{ticket.category}</span>)</> : null} ajuda muito o time.
              </p>

              <div className="space-y-6">
                <div>
                  <p className="font-medium">De 0 a 10, o quanto isso te ajudou?</p>
                  <Scale value={helpful} onChange={setHelpful} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Não ajudou</span><span>Resolveu tudo</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium">De 0 a 10, você indicaria a Wiize para um amigo ou parceiro?</p>
                  <Scale value={recommend} onChange={setRecommend} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Não indicaria</span><span>Com certeza indicaria</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2">Quer deixar um comentário? <span className="text-xs text-muted-foreground">(opcional)</span></p>
                  <Textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="O que poderíamos melhorar?"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button size="lg" className="w-full" disabled={submitting} onClick={submit}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar avaliação
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </>
  );
}
