import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { SDRWizard } from "@/components/sdr/SDRWizard";
import { Loader2 } from "lucide-react";

export default function SDRWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("sdr_agents" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setEditing(data ?? null);
        setLoading(false);
      });
  }, [id]);

  const back = () => navigate("/oportunidades/sdr");

  return (
    <>
      <SEO
        title={id ? "Editar SDR | Wiize" : "Novo SDR Inteligente | Wiize"}
        description="Configure seu agente de IA para conduzir negociações no WhatsApp."
      />
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(40,30%,97%)]">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(220,12%,46%)]" />
        </div>
      ) : (
        <SDRWizard variant="page" open editing={editing} onClose={back} onCreated={back} />
      )}
    </>
  );
}
