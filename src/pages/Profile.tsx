import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/Logo";
import { SEO } from "@/components/SEO";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Camera,
  Mail,
  Lock,
  Crown,
  CreditCard,
  MessageCircle,
  ExternalLink,
  User,
  Calendar,
  Shield,
  Loader2,
  Check,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'start': return 'Start';
      case 'growth': return 'Growth';
      case 'scale': return 'Scale';
      default: return 'Gratuito';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'start': return 'text-blue-500';
      case 'growth': return 'text-purple-500';
      case 'scale': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi alterada com sucesso",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro ao enviar foto",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e confirmação devem ser iguais",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso",
      });

      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('URL do portal não disponível');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: "Erro ao abrir portal",
        description: "Não foi possível acessar o gerenciamento de assinatura. Você pode não ter uma assinatura ativa.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const isFreePlan = profile?.plan === 'free' || !profile?.plan;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Meu Perfil - Prospex"
        description="Gerencie seu perfil e configurações da conta Prospex"
      />

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="h-9 w-9"
              >
                <ArrowLeft size={18} />
              </Button>
              <Logo size="md" />
            </div>
            <h1 className="text-lg font-semibold">Meu Perfil</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Profile Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Gerencie suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={(profile as any)?.avatar_url} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handlePhotoClick}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{profile?.name || 'Usuário'}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Membro desde {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail cadastrado
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={user?.email || ''} 
                    disabled 
                    className="bg-muted/50"
                  />
                  <div className="flex items-center gap-1 text-xs text-emerald-500">
                    <Check className="h-3 w-3" />
                    Verificado
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Segurança
              </CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Senha</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Altere sua senha de acesso
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordModal(true)}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Alterar senha
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plan Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-warning" />
                Plano e Assinatura
              </CardTitle>
              <CardDescription>
                Gerencie seu plano e pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Plano atual:</span>
                    <span className={`font-bold ${getPlanColor(profile?.plan || 'free')}`}>
                      {getPlanName(profile?.plan || 'free')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile?.searches_used || 0} de {profile?.searches_limit || 10} buscas utilizadas
                  </p>
                </div>
                {profile?.plan === 'scale' ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-500">
                    <Check className="h-4 w-4" />
                    Plano máximo
                  </div>
                ) : (
                  <Link to="/upgrade">
                    <Button variant="default" className="gap-2">
                      <Crown className="h-4 w-4" />
                      Fazer upgrade
                    </Button>
                  </Link>
                )}
              </div>

              {!isFreePlan && (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Gerenciar assinatura</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Alterar forma de pagamento, cancelar ou trocar de plano
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    className="gap-2"
                  >
                    {isLoadingPortal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Gerenciar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Suporte
              </CardTitle>
              <CardDescription>
                Precisa de ajuda? Entre em contato conosco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-medium">Falar com suporte</span>
                  <p className="text-sm text-muted-foreground">
                    Tire suas dúvidas ou reporte um problema
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to="/contato">
                    <Button variant="outline" className="gap-2">
                      <Mail className="h-4 w-4" />
                      E-mail
                    </Button>
                  </Link>
                  <a 
                    href="https://wa.me/5511999999999?text=Olá! Preciso de ajuda com a Prospex" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="default" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Alterar senha
            </DialogTitle>
            <DialogDescription>
              Digite sua nova senha abaixo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>

            {newPassword && newPassword.length < 6 && (
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <AlertCircle className="h-4 w-4" />
                A senha deve ter pelo menos 6 caracteres
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword || newPassword.length < 6}
              className="gap-2"
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salvar nova senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
