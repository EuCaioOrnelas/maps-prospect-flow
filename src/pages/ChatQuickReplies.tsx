import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, Plus, Zap, Pencil, Trash2, Search, FileText, ImageIcon, Film, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuickReplies, type QuickReply } from "@/hooks/useQuickReplies";
import { QuickReplyDialog } from "@/components/chat/QuickReplyDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChatQuickReplies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { items, loading, upsert, remove } = useQuickReplies();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, name, email, avatar_url").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.shortcut.toLowerCase().includes(q) ||
      (i.title || "").toLowerCase().includes(q) ||
      i.content.toLowerCase().includes(q)
    );
  }, [items, search]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: QuickReply) => { setEditing(item); setDialogOpen(true); };

  const mediaIcon = (type?: string | null) => {
    if (type === "image") return <ImageIcon size={14} />;
    if (type === "video") return <Film size={14} />;
    if (type === "audio") return <Music size={14} />;
    if (type === "document") return <FileText size={14} />;
    return null;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <div className="lg:hidden">
            <AppHeader profile={profile} />
          </div>
          <div className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto px-6 py-10">
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate("/chat/configuracoes")} className="gap-2">
                  <ArrowLeft size={16} /> Voltar
                </Button>
              </div>

              <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap size={20} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Mensagens rápidas</h1>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    No chat, digite <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">/atalho</code> para inserir a mensagem.
                    Use variáveis como <code className="px-1 rounded bg-muted">{`{{nome}}`}</code>, <code className="px-1 rounded bg-muted">{`{{empresa}}`}</code>, <code className="px-1 rounded bg-muted">{`{{cidade}}`}</code>.
                  </p>
                </div>
                <Button onClick={openNew} className="gap-2">
                  <Plus size={16} /> Nova mensagem rápida
                </Button>
              </div>

              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por atalho, título ou conteúdo" className="pl-9" />
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground py-12 text-center">Carregando…</div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center">
                  <Zap size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {items.length === 0 ? "Nenhuma mensagem rápida criada ainda" : "Nenhum resultado"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {items.length === 0 ? "Crie sua primeira mensagem rápida para agilizar o atendimento." : "Tente ajustar a busca."}
                  </p>
                  {items.length === 0 && (
                    <Button onClick={openNew} className="gap-2"><Plus size={14} /> Criar mensagem rápida</Button>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {filtered.map(item => (
                    <div key={item.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <code className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono font-semibold shrink-0">
                            /{item.shortcut}
                          </code>
                          {item.title && <span className="text-sm font-medium text-foreground truncate">{item.title}</span>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)} className="h-7 w-7">
                            <Pencil size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover esta mensagem rápida?")) void remove(item.id); }} className="h-7 w-7 text-destructive">
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{item.content || "(sem texto)"}</p>
                      {item.media_url && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {mediaIcon(item.media_type)}
                          <span className="truncate">{item.media_filename || "Mídia anexada"}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuickReplyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={async (input) => {
          const ok = await upsert(input, editing?.id);
          if (ok) setDialogOpen(false);
        }}
      />
    </SidebarProvider>
  );
}
