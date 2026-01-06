import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuickReplies, QuickReply } from '@/hooks/useQuickReplies';
import { supabase } from '@/integrations/supabase/client';
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
  Upload,
  X,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ChatSettings = () => {
  const { profile } = useAuth();
  const { quickReplies, isLoading, createQuickReply, updateQuickReply, deleteQuickReply } = useQuickReplies();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    tag: '',
    name: '',
    text_content: '',
    image_url: '',
    audio_url: '',
    delay_seconds: 0,
  });

  const resetForm = () => {
    setFormData({
      tag: '',
      name: '',
      text_content: '',
      image_url: '',
      audio_url: '',
      delay_seconds: 0,
    });
    setEditingReply(null);
    setAudioPreviewUrl(null);
    setIsPlayingAudio(false);
  };

  const handleOpenDialog = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setFormData({
        tag: reply.tag,
        name: reply.name,
        text_content: reply.text_content || '',
        image_url: reply.image_url || '',
        audio_url: reply.audio_url || '',
        delay_seconds: reply.delay_seconds || 0,
      });
      if (reply.audio_url) {
        setAudioPreviewUrl(reply.audio_url);
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const uploadToStorage = async (file: File, folder: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem');
      return;
    }

    setIsUploadingImage(true);
    try {
      const publicUrl = await uploadToStorage(file, 'quick-replies');
      setFormData({ ...formData, image_url: publicUrl });
      toast.success('Imagem carregada!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Selecione apenas arquivos de áudio');
      return;
    }

    setIsUploadingAudio(true);
    try {
      const publicUrl = await uploadToStorage(file, 'quick-replies');
      setFormData({ ...formData, audio_url: publicUrl });
      setAudioPreviewUrl(publicUrl);
      toast.success('Áudio carregado!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao carregar áudio');
    } finally {
      setIsUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        
        setIsUploadingAudio(true);
        try {
          const publicUrl = await uploadToStorage(file, 'quick-replies');
          setFormData(prev => ({ ...prev, audio_url: publicUrl }));
          setAudioPreviewUrl(publicUrl);
          toast.success('Áudio gravado e salvo!');
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Erro ao salvar áudio');
        } finally {
          setIsUploadingAudio(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioPreviewUrl) return;
    
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioPreviewUrl);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
    
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
  };

  const removeAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setFormData({ ...formData, audio_url: '' });
    setAudioPreviewUrl(null);
    setIsPlayingAudio(false);
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

    if (!formData.text_content && !formData.image_url && !formData.audio_url) {
      toast.error('Adicione pelo menos um tipo de conteúdo (texto, imagem ou áudio)');
      return;
    }

    setIsSaving(true);
    try {
      if (editingReply) {
        await updateQuickReply(editingReply.id, {
          tag: formData.tag,
          name: formData.name,
          text_content: formData.text_content || null,
          audio_url: formData.audio_url || null,
          image_url: formData.image_url || null,
          delay_seconds: formData.delay_seconds,
        });
        toast.success('Resposta rápida atualizada!');
      } else {
        await createQuickReply({
          tag: formData.tag,
          name: formData.name,
          text_content: formData.text_content || null,
          audio_url: formData.audio_url || null,
          image_url: formData.image_url || null,
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
                              rows={3}
                            />
                          </div>

                          {/* Image Upload */}
                          <div className="space-y-2">
                            <Label>Imagem (opcional)</Label>
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            {formData.image_url ? (
                              <div className="relative inline-block">
                                <img 
                                  src={formData.image_url} 
                                  alt="Preview" 
                                  className="w-24 h-24 object-cover rounded-lg border border-border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 w-6 h-6"
                                  onClick={removeImage}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={isUploadingImage}
                              >
                                {isUploadingImage ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                Carregar Imagem
                              </Button>
                            )}
                          </div>

                          {/* Audio Upload/Record */}
                          <div className="space-y-2">
                            <Label>Áudio (opcional)</Label>
                            <input
                              ref={audioInputRef}
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={handleAudioUpload}
                            />
                            {formData.audio_url ? (
                              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0"
                                  onClick={toggleAudioPlayback}
                                >
                                  {isPlayingAudio ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </Button>
                                <div className="flex-1 h-1 bg-primary/30 rounded-full">
                                  <div className="h-full w-1/3 bg-primary rounded-full" />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-destructive hover:text-destructive"
                                  onClick={removeAudio}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => audioInputRef.current?.click()}
                                  disabled={isUploadingAudio || isRecording}
                                >
                                  {isUploadingAudio ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                  Carregar
                                </Button>
                                <Button
                                  type="button"
                                  variant={isRecording ? "destructive" : "outline"}
                                  className="gap-2"
                                  onClick={isRecording ? stopRecording : startRecording}
                                  disabled={isUploadingAudio}
                                >
                                  {isRecording ? (
                                    <>
                                      <Square className="w-4 h-4" />
                                      Parar
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="w-4 h-4" />
                                      Gravar
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="delay">Delay de envio</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="delay"
                                type="number"
                                min="0"
                                max="60"
                                placeholder="0"
                                value={formData.delay_seconds === 0 ? '' : formData.delay_seconds}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setFormData({ ...formData, delay_seconds: value === '' ? 0 : parseInt(value) || 0 });
                                }}
                                className="w-24"
                              />
                              <span className="text-sm text-muted-foreground">segundos</span>
                            </div>
                            {formData.delay_seconds > 0 && (
                              <p className="text-xs text-primary font-medium">
                                ⏱️ A mensagem será enviada {formData.delay_seconds} segundo{formData.delay_seconds > 1 ? 's' : ''} após confirmação
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Deixe vazio ou 0 para envio imediato
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
