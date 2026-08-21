import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";
import {
  CONTACT_TYPES, CONTACT_STATUSES, confidenceMeta, contactTypeLabel, contactStatusLabel,
} from "@/lib/influencerOutreach";
import {
  Loader2, Plus, Trash2, Pencil, Check, X, ExternalLink, Save, Search, Link2,
} from "lucide-react";

interface Props {
  prospect: any | null;
  contacts: any[];
  onClose: () => void;
  onChanged: () => void;
  onFind: (id: string) => void;
  finding: boolean;
}

const NEW_EMPTY = { type: "email", value: "", note: "" };

export function InfluencerContactsDialog({ prospect, contacts, onClose, onChanged, onFind, finding }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [adding, setAdding] = useState<null | { type: string; value: string; note: string }>(null);
  const [savingAdd, setSavingAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setNotes(prospect?.notes ?? "");
    setAdding(null);
    setEditId(null);
  }, [prospect?.id]);

  const saveNotes = async () => {
    if (!prospect) return;
    setSavingNotes(true);
    const { error } = await (supabase as any)
      .from("influencer_prospects")
      .update({ notes })
      .eq("id", prospect.id);
    setSavingNotes(false);
    if (error) { toast({ title: "Erro ao salvar anotação", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Anotação salva" });
    onChanged();
  };

  const addContact = async () => {
    if (!prospect || !adding) return;
    if (!adding.value.trim()) {
      toast({ title: "Informe o valor do contato", variant: "destructive" });
      return;
    }
    setSavingAdd(true);
    const { error } = await (supabase as any).from("influencer_contacts").insert({
      prospect_id: prospect.id,
      type: adding.type,
      value: adding.value.trim(),
      note: adding.note.trim() || null,
      normalized_value: adding.value.trim().toLowerCase(),
      status: "encontrado",
      confidence: "media",
      sources: [{ source: "manual", discovered_at: new Date().toISOString() }],
      discovered_at: new Date().toISOString(),
      is_primary: contacts.length === 0,
    });
    setSavingAdd(false);
    if (error) { toast({ title: "Erro ao adicionar contato", description: error.message, variant: "destructive" }); return; }
    setAdding(null);
    toast({ title: "Contato adicionado" });
    onChanged();
  };

  const deleteContact = async (id: string) => {
    setDeleting(id);
    const { error } = await (supabase as any).from("influencer_contacts").delete().eq("id", id);
    setDeleting(null);
    if (error) { toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contato removido" });
    onChanged();
  };

  const setPrimary = async (id: string) => {
    if (!prospect) return;
    const { error } = await (supabase as any)
      .from("influencer_contacts")
      .update({ is_primary: false })
      .eq("prospect_id", prospect.id);
    if (error) return;
    await (supabase as any).from("influencer_contacts").update({ is_primary: true }).eq("id", id);
    onChanged();
  };

  const contactUrl = (c: any) => {
    if (c.type === "email") return `mailto:${c.value}`;
    if (c.type === "instagram") return c.value.startsWith("http") ? c.value : `https://instagram.com/${c.value.replace(/^@/, "")}`;
    if (c.type === "website" || c.type === "contact_page") return c.value.startsWith("http") ? c.value : `https://${c.value}`;
    if (c.type === "linkedin") return c.value.startsWith("http") ? c.value : `https://linkedin.com/in/${c.value}`;
    if (c.type === "twitter") return c.value.startsWith("http") ? c.value : `https://x.com/${c.value.replace(/^@/, "")}`;
    if (c.type === "facebook") return c.value.startsWith("http") ? c.value : `https://facebook.com/${c.value}`;
    if (c.type === "tiktok") return c.value.startsWith("http") ? c.value : `https://tiktok.com/@${c.value.replace(/^@/, "")}`;
    if (c.type === "threads") return c.value.startsWith("http") ? c.value : `https://threads.net/@${c.value.replace(/^@/, "")}`;
    return c.value.startsWith("http") ? c.value : null;
  };

  const linkCells = useMemo(() => {
    if (!prospect) return [];
    const links: { label: string; url: string }[] = [];
    if (prospect.channel_url) links.push({ label: "Canal no YouTube", url: prospect.channel_url });
    if (prospect.instagram_url) links.push({ label: "Instagram", url: prospect.instagram_url });
    if (prospect.website_url) links.push({ label: "Site oficial", url: prospect.website_url });
    return links;
  }, [prospect]);

  if (!prospect) return null;

  return (
    <Dialog open={!!prospect} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-6">
            <ChannelAvatar src={prospect.thumbnail_url} name={prospect.channel_name} size={40} />
            <span className="truncate">{prospect.channel_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Links rápidos do canal */}
          {linkCells.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {linkCells.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <ExternalLink size={13} /> {l.label}
                </a>
              ))}
            </div>
          )}

          {/* Anotações gerais do canal */}
          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Anotações do canal</Label>
              <span className="text-[10px] text-muted-foreground">{notes.length} caracteres</span>
            </div>
            <Textarea rows={3} placeholder="Observações sobre o canal, histórico da conversa, preferências…"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" disabled={savingNotes} onClick={saveNotes}>
                {savingNotes ? <Loader2 className="animate-spin mr-2" size={13} /> : <Save className="mr-2" size={13} />}
                Salvar anotação
              </Button>
            </div>
          </div>

          {/* Contatos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Canais de contato ({contacts.length})</p>
              <Button size="sm" variant="outline" disabled={finding} onClick={() => onFind(prospect.id)}>
                {finding ? <Loader2 className="animate-spin mr-2" size={13} /> : <Search className="mr-2" size={13} />}
                Buscar contatos automaticamente
              </Button>
            </div>

            {contacts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum contato identificado ainda. Busque automaticamente ou cadastre manualmente o e-mail, Instagram, site, etc.
              </p>
            )}

            {contacts.map((c) => {
              const conf = confidenceMeta(c.confidence);
              const url = contactUrl(c);
              return (
                <div key={c.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] shrink-0">{contactTypeLabel(c.type)}</Badge>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.is_primary && <Badge className="text-[10px] bg-primary/10 text-primary">Principal</Badge>}
                      <span className={`inline-flex items-center gap-1 text-[11px] ${conf.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} /> {conf.label}
                      </span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" title="Editar nota"
                        onClick={() => { setEditId(c.id); setEditNote(c.note ?? ""); }}>
                        <Pencil size={12} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Remover"
                        disabled={deleting === c.id} onClick={() => deleteContact(c.id)}>
                        {deleting === c.id ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer"
                        className="text-sm break-all text-primary hover:underline">{c.value}</a>
                    ) : (
                      <span className="text-sm break-all">{c.value}</span>
                    )}
                    {!c.is_primary && (
                      <button className="text-[10px] text-muted-foreground hover:text-primary underline ml-auto shrink-0"
                        onClick={() => setPrimary(c.id)}>
                        Tornar principal
                      </button>
                    )}
                  </div>

                  {editId === c.id ? (
                    <div className="flex gap-2 items-center">
                      <Input size={1} className="h-8 text-xs" value={editNote}
                        onChange={(e) => setEditNote(e.target.value)} placeholder="Nota do contato" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" title="Salvar nota"
                        onClick={async () => {
                          await (supabase as any).from("influencer_contacts").update({ note: editNote.trim() || null }).eq("id", c.id);
                          setEditId(null);
                          onChanged();
                        }}>
                        <Check size={14} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditId(null)}>
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    c.note && <p className="text-xs text-muted-foreground">{c.note}</p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {(c.sources ?? []).map((s: any) =>
                        typeof s === "string" ? s : (s?.source ?? "")).filter(Boolean).join(" · ") || "Origem não informada"}
                    </span>
                    <Select value={c.status} onValueChange={async (v) => {
                      await (supabase as any).from("influencer_contacts").update({ status: v }).eq("id", c.id);
                      onChanged();
                    }}>
                      <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTACT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}

            {/* Formulário de novo contato */}
            {adding ? (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_1.6fr]">
                  <Select value={adding.type} onValueChange={(v) => setAdding({ ...adding, type: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="h-9 text-xs" placeholder="Valor (e-mail, @user, link, telefone…)"
                    value={adding.value} onChange={(e) => setAdding({ ...adding, value: e.target.value })} />
                </div>
                <Input className="h-9 text-xs" placeholder="Nota (opcional): cargo, pessoa responsável, observação…"
                  value={adding.note} onChange={(e) => setAdding({ ...adding, note: e.target.value })} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>Cancelar</Button>
                  <Button size="sm" disabled={savingAdd} onClick={addContact}>
                    {savingAdd ? <Loader2 className="animate-spin mr-2" size={13} /> : <Plus className="mr-2" size={13} />}
                    Adicionar contato
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAdding(NEW_EMPTY)}>
                <Plus className="mr-2" size={14} /> Adicionar contato manualmente
              </Button>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Link2 size={12} /> Clique no valor (e-mail, Instagram, site…) para abrir/responder direto.
            O contato marcado como <strong>Principal</strong> é o destino da abordagem por e-mail.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
