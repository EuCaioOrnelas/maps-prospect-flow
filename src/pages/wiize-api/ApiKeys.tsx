import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { KeyRound, Copy, Plus, ShieldAlert, RotateCw, Loader2, Trash2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, EmptyState, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import { useApiKeys, useApiKeyMutations } from "@/hooks/useWiizeApi";

const ALL_PERMISSIONS = ["prospecting:search", "prospecting:analyze", "prospecting:approach"];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Nunca";

export default function ApiKeys() {
  const { toast } = useToast();
  const { data: keys = [], isLoading } = useApiKeys();
  const { create, revoke, rotate, remove, updateIps } = useApiKeyMutations();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", environment: "live" as "live" | "test", allowedIps: "" });
  const [secret, setSecret] = useState<string | null>(null);
  const [ipTarget, setIpTarget] = useState<{ id: string; value: string } | null>(null);

  const parseIps = (raw: string) =>
    raw
      .split(/[\s,;]+/)
      .map((v) => v.trim())
      .filter(Boolean);

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: "Chave excluída" });
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSaveIps = async () => {
    if (!ipTarget) return;
    try {
      await updateIps.mutateAsync({ id: ipTarget.id, allowed_ips: parseIps(ipTarget.value) });
      setIpTarget(null);
      toast({ title: "IPs autorizados atualizados" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar os IPs",
        description: e instanceof Error ? e.message : "Verifique o formato e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    try {
      const res = await create.mutateAsync({
        name: form.name.trim() || "Minha aplicação",
        environment: form.environment,
        permissions: ALL_PERMISSIONS,
        allowed_ips: parseIps(form.allowedIps),
      });
      setOpen(false);
      setForm({ name: "", environment: "live", allowedIps: "" });
      setSecret(res.secret);
    } catch (e) {
      toast({
        title: "Não foi possível criar a chave",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRotate = async (id: string) => {
    try {
      const res = await rotate.mutateAsync(id);
      setSecret(res.secret);
    } catch (e) {
      toast({
        title: "Não foi possível rotacionar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revoke.mutateAsync(id);
      toast({ title: "Chave revogada" });
    } catch (e) {
      toast({
        title: "Não foi possível revogar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Chaves de API — Wiize API</title>
        <meta name="description" content="Gerencie as credenciais usadas para conectar seus sistemas às APIs da Wiize." />
      </Helmet>

      <PageHeader
        title="Chaves de API"
        description="Gerencie as credenciais usadas para conectar seus sistemas às APIs da Wiize."
        actions={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus size={16} /> Gerar nova API Key
          </Button>
        }
      />

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
        O segredo completo é exibido uma única vez, no momento da criação ou rotação. Guarde a chave no
        servidor da sua aplicação — nunca no frontend ou em repositórios públicos.
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : keys.length === 0 ? (
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
        <SectionCard icon={KeyRound} title="Prospecting Intelligence API" description="Credenciais desta conta">
          <ul className="space-y-3">
            {keys.map((k) => (
              <li key={k.id} className="rounded-lg border border-border/70 p-4 transition-colors hover:bg-muted/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{k.name}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase">{k.environment}</Badge>
                  {k.status === "active" ? (
                    <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Revogada</Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    {k.prefix}••••{k.last_four || ""}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={k.status !== "active" || rotate.isPending}
                    onClick={() => handleRotate(k.id)}
                  >
                    <RotateCw size={14} /> Rotacionar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIpTarget({ id: k.id, value: (k.allowed_ips || []).join(", ") })}
                  >
                    <Globe size={14} /> IPs
                  </Button>
                  {k.status === "active" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={revoke.isPending}
                      onClick={() => handleRevoke(k.id)}
                    >
                      Revogar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => handleDelete(k.id)}
                    >
                      <Trash2 size={14} /> Excluir
                    </Button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>Criada em: {fmtDate(k.created_at)}</span>
                  <span>Último uso: {fmtDate(k.last_used_at)}</span>
                  <span>Permissões: {(k.permissions || []).length}</span>
                  <span>
                    IPs autorizados: {(k.allowed_ips || []).length > 0 ? (k.allowed_ips || []).join(", ") : "Qualquer IP"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar API Key</DialogTitle>
            <DialogDescription>Cada chave pertence a um ambiente e é exibida uma única vez.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                value={form.environment}
                onValueChange={(v) => setForm((f) => ({ ...f, environment: v as "live" | "test" }))}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { v: "live", l: "Production" },
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

            <div className="space-y-2">
              <Label htmlFor="key-ips">IPs autorizados (opcional)</Label>
              <Textarea
                id="key-ips"
                rows={2}
                placeholder="200.1.2.3, 200.1.2.0/24"
                value={form.allowedIps}
                onChange={(e) => setForm((f) => ({ ...f, allowedIps: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para aceitar qualquer IP. Aceita IPv4, IPv6 ou faixas CIDR, separados por vírgula.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 size={14} className="animate-spin" />} Gerar chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ipTarget} onOpenChange={(v) => !v && setIpTarget(null)}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>IPs autorizados</DialogTitle>
            <DialogDescription>
              Somente estes endereços poderão usar a chave. Deixe em branco para liberar qualquer IP.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="200.1.2.3, 200.1.2.0/24"
            value={ipTarget?.value || ""}
            onChange={(e) => setIpTarget((t) => (t ? { ...t, value: e.target.value } : t))}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIpTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveIps} disabled={updateIps.isPending} className="gap-2">
              {updateIps.isPending && <Loader2 size={14} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!secret} onOpenChange={(v) => !v && setSecret(null)}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copie sua API Key agora</DialogTitle>
            <DialogDescription>
              Este segredo não será exibido novamente. Guarde-o em local seguro.
            </DialogDescription>
          </DialogHeader>
          <code className="block break-all rounded-md bg-muted px-3 py-3 font-mono text-xs">{secret}</code>
          <DialogFooter>
            <Button
              className="gap-2"
              onClick={async () => {
                if (secret) await navigator.clipboard.writeText(secret);
                toast({ title: "Chave copiada" });
                setSecret(null);
              }}
            >
              <Copy size={14} /> Copiar e fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
