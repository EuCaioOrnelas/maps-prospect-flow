import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function PartnersStubPage({ title, description }: Props) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      <Card>
        <CardContent className="py-16 text-center">
          <Construction className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">Em construção — Fase 2 do programa de parceiros.</p>
          <p className="text-xs text-muted-foreground mt-2">O backend e as tabelas já estão prontos. Esta tela será conectada na próxima entrega.</p>
        </CardContent>
      </Card>
    </div>
  );
}
