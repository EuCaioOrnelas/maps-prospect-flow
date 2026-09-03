import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { KeyRound, Copy, Eye, EyeOff, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, EmptyState, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import { mockApiKeys, mockApiCatalog, type MockApiKey } from "@/data/wiizeApiMocks";

export default function ApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<MockApiKey[]>(mockApiKeys);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ api: "prospecting", name: "", env: "production" });

  const createKey = () => {
    // Interface apenas — nenhuma chave real é gerada nesta etapa.
    toast({
      title: "Interface de demonstração",
      description: "A geração real de API Keys será habilitada na implementação do backend.",
    });
    setOpen(false);
  };

  const revoke = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k)));
    toast({ title: "Chave revogada", description: "Ação simulada nesta versão de interface." });
  };

  return (
    <>
      <Helmet>
        <title>API Keys — Wiize API</title>
        <meta name="description" content="Gerencie as credenciais usadas para conectar seus sistemas às APIs da Wiize." />
      </Helmet>

      <PageHeader
        title="API Keys"
        description="Gerencie as credenciais usadas para conectar seus sistemas às APIs da Wiize."
        actions={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus size={16} /> Gerar nova API Key
          </Button>
        }
      />

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
        Cada API possui sua própria chave. Guarde as credenciais no servidor da sua aplicação —
        nunca no frontend ou em repositórios públicos.
      </div>

      {keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Você ainda não possui nenhuma API Key."
          description="Crie uma credencial para conectar seu sistema à Prospecting Intelligence API."
          action={
            <Button className="gap-2" onClick={() => setOpen(true)}>
              <Plus size={16} /> Criar API Key
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {mockApiCatalog
            .filter((api) => keys.some((k) => k.apiSlug === api.id))
            .map((api) => (
              <SectionCard
                key={api.id}
                title={api.name}
                description="Credenciais específicas desta API"
              >
                <ul className="space-y-3">
                  {keys
                    .filter((k) => k.apiSlug === api.id)
                    .map((k) => (
                      <li
                        key={k.id}
                        className="rounded-lg border border-border/70 p-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{k.name}</span>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {k.environment === "production" ? "Production" : "Test"}
                          </Badge>
                          {k.status === "active" ? (
                            <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Revogada
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-xs">
                            {revealed[k.id] ? k.revealedKey : k.maskedKey}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() =>
                              setRevealed((p) => ({ ...p, [k.id]: !p[k.id] }))
                            }
                          >
                            {revealed[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            {revealed[k.id] ? "Ocultar" : "Ver chave"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              navigator.clipboard?.writeText(k.revealedKey);
                              toast({ title: "Chave copiada" });
                            }}
                          >
                            <Copy size={14} /> Copiar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={k.status !== "active"}
                            onClick={() => revoke(k.id)}
                          >
                            Revogar
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                          <span>Criada em: {k.createdAt}</span>
                          <span>Último uso: {k.lastUsed ?? "Nunca"}</span>
                        </div>
                      </li>
                    ))}
                </ul>
              </SectionCard>
            ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar API Key</DialogTitle>
            <DialogDescription>
              Cada chave pertence a uma única API e ambiente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecionar API</Label>
              <Select value={form.api} onValueChange={(v) => setForm((f) => ({ ...f, api: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {mockApiCatalog.map((api) => (
                    <SelectItem key={api.id} value={api.id} disabled={api.status === "soon"}>
                      {api.name}
                      {api.status === "soon" ? " (em breve)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-name">Nome da chave</Label>
              <Input
                id="key-name"
                placeholder="Minha aplicação"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Ambiente</Label>
              <RadioGroup
                value={form.env}
                onValueChange={(v) => setForm((f) => ({ ...f, env: v }))}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { v: "production", l: "Production" },
                  { v: "test", l: "Test" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-normal hover:bg-muted/50"
                  >
                    <RadioGroupItem value={o.v} /> {o.l}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createKey}>Gerar chave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
