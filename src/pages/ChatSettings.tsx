import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Zap, 
  Edit2, 
  Trash2, 
  Clock, 
  MessageSquare, 
  Image, 
  Mic,
  Settings,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ChatSettings = () => {
  const { profile } = useAuth();
  const { quickReplies, isLoading, createQuickReply, updateQuickReply, deleteQuickReply } = useQuickReplies();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    tag: '',
    name: '',
    text_content: '',
    delay_seconds: 0,
  });

  const resetForm = () => {
    setFormData({
      tag: '',
      name: '',
      text_content: '',
      delay_seconds: 0,
    });
    setEditingReply(null);
  };

  const handleOpenDialog = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setFormData({
        tag: reply.tag,
        name: reply.name,
        text_content: reply.text_content || '',
        delay_seconds: reply.delay_seconds || 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.tag || !formData.name) {
      toast.error('Preencha a tag e o nome da resposta rápida');
      return;
    }

    if (!formData.tag.startsWith('/')) {
      toast.error('A tag deve começar com /');
      return;
    }

    if (!formData.text_content) {
      toast.error('Adicione o conteúdo da mensagem');
      return;
    }

    setIsSaving(true);
    try {
      if (editingReply) {
        await updateQuickReply(editingReply.id, {
          tag: formData.tag,
          name: formData.name,
          text_content: formData.text_content || null,
          audio_url: null,
          image_url: null,
          delay_seconds: formData.delay_seconds,
        });
        toast.success('Resposta rápida atualizada!');
      } else {
        await createQuickReply({
          tag: formData.tag,
          name: formData.name,
          text_content: formData.text_content || null,
          audio_url: null,
          image_url: null,
          delay_seconds: formData.delay_seconds,
        });
        toast.success('Resposta rápida criada!');
      }
      handleCloseDialog();
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Já existe uma resposta rápida com essa tag');
      } else {
        toast.error('Erro ao salvar resposta rápida');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuickReply(id);
      toast.success('Resposta rápida excluída!');
    } catch {
      toast.error('Erro ao excluir resposta rápida');
    }
  };

  return (
    <>
      <SEO
        title="Configurações do Chat - WiizeProspect"
        description="Configure suas preferências de chat e respostas rápidas"
      />
      
      <div className="min-h-screen bg-background flex">
        <AppSidebar profile={profile} />

        <main className="flex-1 lg:ml-14 flex flex-col min-h-screen">
          <MobileNav profile={profile} />

          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <Link 
                to="/chat" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Chat
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Configurações do Chat</h1>
                  <p className="text-muted-foreground">Gerencie suas preferências e respostas rápidas</p>
                </div>
              </div>
            </div>

            {/* Settings Tabs */}
            <Tabs defaultValue="quick-replies" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="quick-replies" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Respostas Rápidas
                </TabsTrigger>
                <TabsTrigger value="general" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Geral
                </TabsTrigger>
              </TabsList>

              {/* Quick Replies Tab */}
              <TabsContent value="quick-replies" className="space-y-6">
                {/* Info Card */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Como usar respostas rápidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• Crie atalhos para mensagens frequentes digitando a tag no chat (ex: <code className="bg-muted px-1 rounded">/oi</code>)</p>
                    <p>• Configure um delay opcional para envio automático após confirmação</p>
                    <p>• As respostas rápidas aparecem acima do campo de texto quando você tem uma conversa ativa</p>
                  </CardContent>
                </Card>

                {/* Quick Replies List */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>Suas Respostas Rápidas</CardTitle>
                      <CardDescription>
                        {quickReplies.length} {quickReplies.length === 1 ? 'resposta cadastrada' : 'respostas cadastradas'}
                      </CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Nova Resposta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>
                            {editingReply ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
                          </DialogTitle>
                          <DialogDescription>
                            Crie uma mensagem que pode ser enviada rapidamente usando uma tag
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="tag">Tag de ativação *</Label>
                              <Input
                                id="tag"
                                placeholder="/oi"
                                value={formData.tag}
                                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground">
                                Deve começar com /
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="name">Nome da resposta *</Label>
                              <Input
                                id="name"
                                placeholder="Saudação inicial"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="text_content">Mensagem de texto</Label>
                            <Textarea
                              id="text_content"
                              placeholder="Olá! Como posso ajudá-lo hoje?"
                              value={formData.text_content}
                              onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                              rows={4}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="delay">Delay de envio (segundos)</Label>
                            <Input
                              id="delay"
                              type="number"
                              min="0"
                              max="60"
                              placeholder="0"
                              value={formData.delay_seconds}
                              onChange={(e) => setFormData({ ...formData, delay_seconds: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-muted-foreground">
                              Tempo de espera antes de enviar a mensagem (0 = envio imediato)
                            </p>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={handleCloseDialog}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingReply ? 'Salvar Alterações' : 'Criar Resposta'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : quickReplies.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Zap className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium text-foreground mb-1">Nenhuma resposta rápida</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Crie sua primeira resposta rápida para agilizar suas conversas
                        </p>
                        <Button onClick={() => handleOpenDialog()} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Criar Primeira Resposta
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quickReplies.map((reply) => (
                          <div
                            key={reply.id}
                            className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="font-mono">
                                  {reply.tag}
                                </Badge>
                                <span className="font-medium text-foreground">{reply.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {reply.text_content || 'Sem conteúdo de texto'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                {reply.text_content && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    Texto
                                  </span>
                                )}
                                {reply.image_url && (
                                  <span className="flex items-center gap-1">
                                    <Image className="w-3 h-3" />
                                    Imagem
                                  </span>
                                )}
                                {reply.audio_url && (
                                  <span className="flex items-center gap-1">
                                    <Mic className="w-3 h-3" />
                                    Áudio
                                  </span>
                                )}
                                {reply.delay_seconds > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {reply.delay_seconds}s delay
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(reply)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir resposta rápida</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir a resposta "{reply.name}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(reply.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* General Settings Tab */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações Gerais</CardTitle>
                    <CardDescription>
                      Personalize sua experiência de chat
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Settings className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">Em breve</h3>
                    <p className="text-sm text-muted-foreground">
                      Novas configurações serão adicionadas em atualizações futuras
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
};

export default ChatSettings;
