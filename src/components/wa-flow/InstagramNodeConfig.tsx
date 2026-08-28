import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Instagram, Loader2, Plus, Info } from "lucide-react";
import { useInstagramAccounts } from "@/hooks/useInstagramAccounts";
import { InstagramConnectDialog } from "./InstagramConnectDialog";
import { IG_TRIGGERS, isCommentTrigger } from "@/lib/flowChannels";
import { cn } from "@/lib/utils";

type UpdateConfig = (patch: Record<string, any>) => void;

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
      <Info size={13} className="text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

/** Bloco de entrada do canal Instagram: conta + gatilho. */
export function IGEntryConfig({ config, updateConfig }: { config: Record<string, any>; updateConfig: UpdateConfig }) {
  const { accounts, isLoading } = useInstagramAccounts();
  const [connectOpen, setConnectOpen] = useState(false);
  const trigger = config.trigger_type || "";
  const needsKeyword = trigger === "dm_keyword" || trigger === "comment_keyword";

  return (
    <div className="space-y-4">
      <Hint>
        O fluxo é disparado pelos eventos oficiais da Meta no Instagram (direct, resposta de story, comentário ou
        menção). Cada conta pode ter apenas um fluxo ativo por gatilho.
      </Hint>

      <div className="space-y-2">
        <Label className="text-xs">Conta do Instagram</Label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Carregando contas...
          </div>
        ) : accounts.length === 0 ? (
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setConnectOpen(true)}>
            <Plus size={13} /> Conectar conta do Instagram
          </Button>
        ) : (
          <>
            <Select
              value={config.instagram_connection_id || ""}
              onValueChange={(v) => {
                const acc = accounts.find((a) => a.id === v);
                updateConfig({
                  instagram_connection_id: v,
                  ig_username: acc?.ig_username || null,
                  ig_user_id: acc?.ig_user_id || null,
                });
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    @{a.ig_username || a.ig_user_id}
                    {a.status !== "active" ? " (erro na conexão)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setConnectOpen(true)}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <Instagram size={11} /> Gerenciar contas conectadas
            </button>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Gatilho</Label>
        <Select value={trigger} onValueChange={(v) => updateConfig({ trigger_type: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Quando o fluxo inicia?" />
          </SelectTrigger>
          <SelectContent>
            {IG_TRIGGERS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {trigger && (
          <p className="text-[11px] text-muted-foreground">
            {IG_TRIGGERS.find((t) => t.value === trigger)?.desc}
          </p>
        )}
      </div>

      {needsKeyword && (
        <div className="space-y-2">
          <Label className="text-xs">Palavras-chave</Label>
          <Input
            value={config.keywords || ""}
            onChange={(e) => updateConfig({ keywords: e.target.value })}
            placeholder="quero, preço, eu quero"
            className="h-9 text-xs"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Correspondência exata</span>
            <Switch
              checked={!!config.exact_match}
              onCheckedChange={(v) => updateConfig({ exact_match: v })}
            />
          </div>
        </div>
      )}

      {isCommentTrigger(trigger) && (
        <Hint>
          Com gatilho de comentário, use o bloco <strong>Responder comentário</strong> logo em seguida para responder
          publicamente e, opcionalmente, abrir o direct com a pessoa.
        </Hint>
      )}

      <InstagramConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

/** Bloco de resposta a comentário do Instagram. */
export function IGReplyCommentConfig({
  config,
  updateConfig,
}: {
  config: Record<string, any>;
  updateConfig: UpdateConfig;
}) {
  return (
    <div className="space-y-4">
      <Hint>
        Responde publicamente ao comentário que disparou o fluxo. Só funciona em fluxos com gatilho de comentário ou
        menção.
      </Hint>

      <div className="space-y-2">
        <Label className="text-xs">Resposta pública</Label>
        <Textarea
          value={config.reply_text || ""}
          onChange={(e) => updateConfig({ reply_text: e.target.value })}
          placeholder="Oi {{nome}}! Acabei de te chamar no direct 💬"
          className="min-h-[80px] text-xs resize-none"
          maxLength={2200}
        />
        <p className="text-[10px] text-muted-foreground/70">{String(config.reply_text || "").length}/2200</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Direct automático (opcional)</Label>
        <Textarea
          value={config.dm_text || ""}
          onChange={(e) => updateConfig({ dm_text: e.target.value })}
          placeholder="Mensagem enviada no direct logo após a resposta pública"
          className="min-h-[70px] text-xs resize-none"
          maxLength={1000}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
        <div className="pr-3">
          <p className="text-xs font-medium text-foreground">Ocultar o comentário</p>
          <p className="text-[11px] text-muted-foreground">Útil para comentários com dados pessoais ou spam</p>
        </div>
        <Switch checked={!!config.hide_comment} onCheckedChange={(v) => updateConfig({ hide_comment: v })} />
      </div>
    </div>
  );
}

/** Aviso de canal para blocos exclusivos do Instagram usados fora do canal. */
export function IGChannelWarning({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-amber-500/40 bg-amber-500/5 p-3", className)}>
      <p className="text-[11px] text-amber-700">
        Este bloco só é executado em fluxos do canal Instagram. Em fluxos de WhatsApp ele é ignorado.
      </p>
    </div>
  );
}
