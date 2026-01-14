import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { BackgroundGlow } from '@/components/layout/BackgroundGlow';
import { Logo } from '@/components/Logo';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Trash2, 
  Bell,
  Calendar,
  Loader2,
  Pencil
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  expires_at: string;
  created_at: string;
}

const checkIsAdmin = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('is_current_user_admin');
  if (error) return false;
  return data === true;
};

const AdminAnnouncements = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    duration: '7d',
  });

  const [editingAnnouncement, setEditingAnnouncement] = useState<{
    id: string;
    title: string;
    content: string;
    duration: string;
  } | null>(null);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      const adminStatus = await checkIsAdmin();
      if (!adminStatus) {
        navigate('/dashboard');
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    verifyAdmin();
  }, [user, navigate]);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return;
    }
    setAnnouncements(data || []);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAnnouncements();
    }
  }, [isAdmin, fetchAnnouncements]);

  const getExpirationDate = (duration: string): Date => {
    const now = new Date();
    switch (duration) {
      case '1d': return addDays(now, 1);
      case '3d': return addDays(now, 3);
      case '7d': return addDays(now, 7);
      case '14d': return addWeeks(now, 2);
      case '30d': return addMonths(now, 1);
      default: return addDays(now, 7);
    }
  };

  const handleCreate = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    if (newAnnouncement.content.length > 200) {
      toast.error('Conteúdo deve ter no máximo 200 caracteres');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          expires_at: getExpirationDate(newAnnouncement.duration).toISOString(),
        });

      if (error) throw error;

      toast.success('Aviso criado com sucesso!');
      setDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', duration: '7d' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Erro ao criar aviso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Aviso excluído!');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Erro ao excluir aviso');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      duration: '7d', // Default duration for extension
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;

    if (!editingAnnouncement.title.trim() || !editingAnnouncement.content.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    if (editingAnnouncement.content.length > 200) {
      toast.error('Conteúdo deve ter no máximo 200 caracteres');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: editingAnnouncement.title,
          content: editingAnnouncement.content,
          expires_at: getExpirationDate(editingAnnouncement.duration).toISOString(),
        })
        .eq('id', editingAnnouncement.id);

      if (error) throw error;

      toast.success('Aviso atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Erro ao atualizar aviso');
    } finally {
      setSaving(false);
    }
  };

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <div className="flex items-center gap-2">
              <Logo size="sm" showText={false} />
              <span className="font-bold text-lg">Avisos</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Avisos</h1>
              <p className="text-sm text-muted-foreground">
                {announcements.length} avisos cadastrados
              </p>
            </div>
          </div>

          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Aviso
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar avisos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnouncements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum aviso encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnnouncements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {announcement.title}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {announcement.content}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(announcement.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExpired(announcement.expires_at) ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          Expirado
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          Ativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Aviso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título (pode usar emojis 🎉)</label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: 🚀 Nova funcionalidade disponível!"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Conteúdo ({newAnnouncement.content.length}/200 caracteres)
              </label>
              <Textarea
                value={newAnnouncement.content}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setNewAnnouncement(prev => ({ ...prev, content: e.target.value }));
                  }
                }}
                placeholder="Descreva a novidade..."
                className="min-h-[100px] resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Duração</label>
              <Select
                value={newAnnouncement.duration}
                onValueChange={(value) => setNewAnnouncement(prev => ({ ...prev, duration: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 dia</SelectItem>
                  <SelectItem value="3d">3 dias</SelectItem>
                  <SelectItem value="7d">7 dias</SelectItem>
                  <SelectItem value="14d">14 dias</SelectItem>
                  <SelectItem value="30d">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aviso</DialogTitle>
          </DialogHeader>

          {editingAnnouncement && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Título (pode usar emojis 🎉)</label>
                <Input
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Ex: 🚀 Nova funcionalidade disponível!"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Conteúdo ({editingAnnouncement.content.length}/200 caracteres)
                </label>
                <Textarea
                  value={editingAnnouncement.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setEditingAnnouncement(prev => prev ? { ...prev, content: e.target.value } : null);
                    }
                  }}
                  placeholder="Descreva a novidade..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nova Duração (a partir de agora)</label>
                <Select
                  value={editingAnnouncement.duration}
                  onValueChange={(value) => setEditingAnnouncement(prev => prev ? { ...prev, duration: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1 dia</SelectItem>
                    <SelectItem value="3d">3 dias</SelectItem>
                    <SelectItem value="7d">7 dias</SelectItem>
                    <SelectItem value="14d">14 dias</SelectItem>
                    <SelectItem value="30d">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncements;
