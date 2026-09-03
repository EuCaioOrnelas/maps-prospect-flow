import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Boxes, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/wiize-api/WiizeApiUI";
import { mockApiCatalog } from "@/data/wiizeApiMocks";

export default function ApiCatalog() {
  return (
    <>
      <Helmet>
        <title>APIs — Wiize API</title>
        <meta name="description" content="Catálogo de APIs da Wiize: prospecção, engajamento e agentes comerciais." />
      </Helmet>

      <PageHeader
        title="APIs"
        description="Catálogo de inteligência comercial disponível para integração."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {mockApiCatalog.map((api) => {
          const available = api.status === "available";
          return (
            <Card key={api.id} className="border-border/70 shadow-none">
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <Boxes size={18} className="text-muted-foreground" strokeWidth={1.75} />
                  </div>
                  {available ? (
                    <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Disponível</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
                      <Clock size={10} /> Em breve
                    </Badge>
                  )}
                </div>

                <h2 className="mt-4 text-base font-semibold tracking-tight">{api.name}</h2>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{api.description}</p>

                <div className="mt-5">
                  {available ? (
                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                      <Link to={`/api/apis/${api.slug}`}>
                        Ver API <ArrowRight size={14} />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Em breve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
