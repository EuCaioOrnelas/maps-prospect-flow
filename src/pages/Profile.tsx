import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import { useCompanyServices } from "@/hooks/useCompanyServices";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SEO } from "@/components/SEO";
import { TrialCancelCard } from "@/components/profile/TrialCancelCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
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
  AlertCircle,
  RefreshCcw,
  Bell,
  BellOff,
  LogOut,
  Building2,
  Target,
  Sparkles,
  ShoppingBag,
  Users,
  Rocket,
  Pencil,
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { useGuidedTour, resetGuidedTour } from "@/hooks/useGuidedTour";
import { PlayCircle } from "lucide-react";
import { hasOpportunitiesAccess, getPlanDisplayName, getContactLimit } from "@/lib/planAccess";


const Profile = () => {
  const { profile, user, refreshProfile, signOut } = useAuth();
  useAutoScoreTracking("profile");
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { services, isLoading: isLoadingServices, upsertServices } = useCompanyServices();
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [serviceForm, setServiceForm] = useState<{ name: string; average_ticket: number; description: string }[]>([]);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [transactionalEnabled, setTransactionalEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [isLoadingEmailPrefs, setIsLoadingEmailPrefs] = useState(true);
  const [isSavingEmailPrefs, setIsSavingEmailPrefs] = useState(false);
  const [crmContactsCount, setCrmContactsCount] = useState<number>(0);

  const hasOpps = hasOpportunitiesAccess(profile as any);
  const planLabel = getPlanDisplayName(profile as any);
  const contactLimit = getContactLimit(profile as any);

  useEffect(() => {
    if (!user || hasOpps) return;
    (async () => {
      const { count } = await supabase
        .from("crm_leads" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setCrmContactsCount(count || 0);
    })();
  }, [user, hasOpps]);

  
  // Company profile state
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isLoadingCompanyProfile, setIsLoadingCompanyProfile] = useState(true);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    attendant_name: "",
    company_niche: "",
    company_differential: "",
    company_objective: "",
    company_products: "",
    company_target_audience: "",
  });

  // Load company profile
  useEffect(() => {
    const loadCompanyProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("company_profiles" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setCompanyProfile(data);
          setCompanyForm({
            company_name: (data as any).company_name || "",
            attendant_name: (data as any).attendant_name || "",
            company_niche: (data as any).company_niche || "",
            company_differential: (data as any).company_differential || "",
            company_objective: (data as any).company_objective || "",
            company_products: (data as any).company_products || "",
            company_target_audience: (data as any).company_target_audience || "",
          });
        }
      } catch (err) {
        console.error("Error loading company profile:", err);
      } finally {
        setIsLoadingCompanyProfile(false);
      }
    };
    loadCompanyProfile();
  }, [user]);

  const handleSaveCompanyProfile = async () => {
    if (!user) return;
    setIsSavingCompany(true);
    try {
      const { error } = await supabase
        .from("company_profiles" as any)
        .upsert({
          user_id: user.id,
          ...companyForm,
        } as any, { onConflict: "user_id" });
      if (error) throw error;
      setCompanyProfile({ ...companyForm, user_id: user.id });
      setIsEditingCompany(false);
      toast({ title: "Perfil da empresa salvo!", description: "Suas informações serão usadas para personalizar as mensagens de IA." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Load email preferences
  useEffect(() => {
    const loadEmailPrefs = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("email_preferences")
          .select("transactional_enabled, marketing_enabled")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setTransactionalEnabled(data.transactional_enabled);
          setMarketingEnabled(data.marketing_enabled);
        }
      } catch (err) {
        console.error("Error loading email prefs:", err);
      } finally {
        setIsLoadingEmailPrefs(false);
      }
    };
    loadEmailPrefs();
  }, [user]);

  const handleEmailPrefChange = async (
    field: "transactional_enabled" | "marketing_enabled",
    value: boolean
  ) => {
    if (!user) return;
    setIsSavingEmailPrefs(true);

    // Optimistic update
    if (field === "transactional_enabled") setTransactionalEnabled(value);
    else setMarketingEnabled(value);

    try {
      const { data: existing } = await supabase
        .from("email_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("email_preferences")
          .update({ [field]: value } as any)
          .eq("user_id", user.id);
      } else {
        await supabase.from("email_preferences").insert({
          user_id: user.id,
          transactional_enabled: field === "transactional_enabled" ? value : true,
          marketing_enabled: field === "marketing_enabled" ? value : true,
        } as any);
      }

      toast({
        title: "Preferência salva",
        description: "Suas preferências de e-mail foram atualizadas",
      });
    } catch (err: any) {
      // Revert on error
      if (field === "transactional_enabled") setTransactionalEnabled(!value);
      else setMarketingEnabled(!value);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a preferência",
        variant: "destructive",
      });
    } finally {
      setIsSavingEmailPrefs(false);
    }
  };

  const getNextSearchResetLabel = () => {
    const isFreePlan = profile?.plan === 'free' || !profile?.plan;
    
    if (isFreePlan) {
      // Free plan: reset on first day of next month
      const now = new Date();
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextReset.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } else {
      // Paid plans: reset on subscription renewal date
      if (profile?.subscription_current_period_end) {
        const renewalDate = new Date(profile.subscription_current_period_end);
        return renewalDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
      }
      return 'Na renovação da assinatura';
    }
  };

  const getLastResetLabel = () => {
    if (profile?.last_searches_reset) {
      const lastReset = new Date(profile.last_searches_reset);
      return lastReset.toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'Nunca';
  };

  const getNextResetDate = () => {
    const isFreePlan = profile?.plan === 'free' || !profile?.plan;
    
    if (isFreePlan) {
      // Free plan: reset on first day of next month at midnight
      const now = new Date();
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      return nextReset.toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      // Paid plans: use subscription end date
      if (profile?.subscription_current_period_end) {
        const renewalDate = new Date(profile.subscription_current_period_end);
        return renewalDate.toLocaleString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return 'Na próxima renovação';
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'start': return 'Start';
      case 'growth': return 'Growth';
      case 'scale': return 'Enterprise';
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

      // Update profile with avatar URL using raw query since type might not be updated yet
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl } as any)
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

  const handleSendPasswordResetEmail = async () => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "E-mail não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsSendingResetEmail(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });

      setShowPasswordModal(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar e-mail",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsSendingResetEmail(false);
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
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <BackgroundGlow />
      <SEO 
        title="Meu Perfil - Wiize"
        description="Gerencie seu perfil e configurações da conta Wiize"
      />

      {/* Sidebar - Desktop only */}
      <AppSidebar profile={profile} />

      {/* Header */}
      <AppHeader profile={profile} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl lg:pl-14">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas configurações de conta</p>
        </div>
        <div className="grid gap-6">
          {/* Row: Informações Pessoais (60%) + Segurança (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            {/* Profile Card - left 60% */}
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
                      <AvatarImage src={profile?.avatar_url} />
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

            {/* Security Card - right 40% */}
            <Card className="border-border/50 h-full">
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
                <div className="space-y-4">
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
                    className="gap-2 w-full"
                  >
                    <Lock className="h-4 w-4" />
                    Alterar senha
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {hasOpps && (<>
          {/* Company Profile Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Perfil da Empresa
                  </CardTitle>
                  <CardDescription>
                    Informações usadas pela IA para personalizar mensagens de prospecção
                  </CardDescription>
                </div>
                {companyProfile && !isEditingCompany && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingCompany(true)} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCompanyProfile ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : !companyProfile && !isEditingCompany ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você ainda não configurou o perfil da sua empresa. Configure para que a IA gere mensagens personalizadas.
                  </p>
                  <Button onClick={() => setIsEditingCompany(true)} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Configurar agora
                  </Button>
                </div>
              ) : isEditingCompany ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Nome da empresa
                      </Label>
                      <Input
                        value={companyForm.company_name}
                        onChange={(e) => setCompanyForm(f => ({ ...f, company_name: e.target.value }))}
                        placeholder="Ex: Agência Digital XYZ"
                        maxLength={200}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Nome do atendente
                      </Label>
                      <Input
                        value={companyForm.attendant_name}
                        onChange={(e) => setCompanyForm(f => ({ ...f, attendant_name: e.target.value }))}
                        placeholder="Ex: João Silva"
                        maxLength={200}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Nicho da empresa
                    </Label>
                    <Input
                      value={companyForm.company_niche}
                      onChange={(e) => setCompanyForm(f => ({ ...f, company_niche: e.target.value }))}
                      placeholder="Ex: Marketing Digital, Consultoria"
                      maxLength={200}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" /> Produtos/Serviços
                    </Label>
                    <Textarea
                      value={companyForm.company_products}
                      onChange={(e) => setCompanyForm(f => ({ ...f, company_products: e.target.value }))}
                      placeholder="Ex: Criação de Google Meu Negócio, gestão de redes sociais..."
                      rows={3}
                      maxLength={500}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Público-alvo
                    </Label>
                    <Textarea
                      value={companyForm.company_target_audience}
                      onChange={(e) => setCompanyForm(f => ({ ...f, company_target_audience: e.target.value }))}
                      placeholder="Ex: Pequenas empresas, restaurantes..."
                      rows={3}
                      maxLength={500}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Diferencial
                    </Label>
                    <Textarea
                      value={companyForm.company_differential}
                      onChange={(e) => setCompanyForm(f => ({ ...f, company_differential: e.target.value }))}
                      placeholder="Ex: Atendimento personalizado, 10 anos de experiência..."
                      rows={3}
                      maxLength={500}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Rocket className="h-3.5 w-3.5" /> Objetivo
                    </Label>
                    <Textarea
                      value={companyForm.company_objective}
                      onChange={(e) => setCompanyForm(f => ({ ...f, company_objective: e.target.value }))}
                      placeholder="Ex: Aumentar carteira de clientes..."
                      rows={3}
                      maxLength={500}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    {companyProfile && (
                      <Button variant="outline" onClick={() => {
                        setIsEditingCompany(false);
                        setCompanyForm({
                          company_name: companyProfile.company_name || "",
                          attendant_name: companyProfile.attendant_name || "",
                          company_niche: companyProfile.company_niche || "",
                          company_differential: companyProfile.company_differential || "",
                          company_objective: companyProfile.company_objective || "",
                          company_products: companyProfile.company_products || "",
                          company_target_audience: companyProfile.company_target_audience || "",
                        });
                      }}>
                        Cancelar
                      </Button>
                    )}
                    <Button onClick={handleSaveCompanyProfile} disabled={isSavingCompany} className="gap-2">
                      {isSavingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: Building2, label: "Empresa", value: companyProfile.company_name },
                    { icon: User, label: "Atendente", value: companyProfile.attendant_name },
                    { icon: Target, label: "Nicho", value: companyProfile.company_niche },
                    { icon: ShoppingBag, label: "Produtos/Serviços", value: companyProfile.company_products },
                    { icon: Users, label: "Público-alvo", value: companyProfile.company_target_audience },
                    { icon: Sparkles, label: "Diferencial", value: companyProfile.company_differential },
                    { icon: Rocket, label: "Objetivo", value: companyProfile.company_objective },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-border/30 bg-background/80 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.06)]">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{item.label}</p>
                        <p className="text-sm break-words line-clamp-2 leading-relaxed">{item.value || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Serviços Vendidos
                  </CardTitle>
                  <CardDescription>
                    Serviços e ticket médio usados pela IA para calcular oportunidades e forecast
                  </CardDescription>
                </div>
                {!isEditingServices && services.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setServiceForm(services.map(s => ({ name: s.name, average_ticket: s.average_ticket, description: s.description || "" })));
                    setIsEditingServices(true);
                  }} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingServices ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : !isEditingServices && services.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Nenhum serviço cadastrado. Adicione seus serviços para que a IA calcule oportunidades e forecast de receita.
                  </p>
                  <Button onClick={() => {
                    setServiceForm([{ name: "", average_ticket: 0, description: "" }]);
                    setIsEditingServices(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar serviços
                  </Button>
                </div>
              ) : isEditingServices ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    O ticket médio é a média entre o valor mínimo e máximo que você cobra por esse serviço.
                  </p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {serviceForm.map((service, index) => (
                      <div key={index} className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Serviço {index + 1}</span>
                          {serviceForm.length > 1 && (
                            <button
                              onClick={() => setServiceForm(prev => prev.filter((_, i) => i !== index))}
                              className="text-destructive/60 hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <Input
                          value={service.name}
                          onChange={(e) => setServiceForm(prev => prev.map((s, i) => i === index ? { ...s, name: e.target.value } : s))}
                          placeholder="Nome do serviço (ex: Gestão de Redes Sociais)"
                          className="text-sm"
                          maxLength={100}
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                          <Input
                            type="number"
                            value={service.average_ticket || ""}
                            onChange={(e) => setServiceForm(prev => prev.map((s, i) => i === index ? { ...s, average_ticket: parseFloat(e.target.value) || 0 } : s))}
                            placeholder="Ticket médio (ex: 2500)"
                            className="text-sm pl-9"
                            min={0}
                          />
                        </div>
                        <Input
                          value={service.description}
                          onChange={(e) => setServiceForm(prev => prev.map((s, i) => i === index ? { ...s, description: e.target.value } : s))}
                          placeholder="Descrição breve (opcional)"
                          className="text-sm"
                          maxLength={200}
                        />
                      </div>
                    ))}
                  </div>

                  {serviceForm.length < 10 && (
                    <Button variant="outline" size="sm" onClick={() => setServiceForm(prev => [...prev, { name: "", average_ticket: 0, description: "" }])} className="gap-1.5 text-xs w-full">
                      <Plus size={14} />
                      Adicionar outro serviço
                    </Button>
                  )}

                  {serviceForm.some(s => s.average_ticket > 0) && (
                    <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                      <span className="font-medium text-foreground">Ticket médio geral: </span>
                      R$ {(serviceForm.filter(s => s.average_ticket > 0).reduce((a, b) => a + b.average_ticket, 0) / serviceForm.filter(s => s.average_ticket > 0).length).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEditingServices(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={async () => {
                        const valid = serviceForm.filter(s => s.name.trim().length >= 2 && s.average_ticket > 0);
                        if (valid.length === 0) {
                          toast({ title: "Preencha ao menos 1 serviço", description: "Nome e ticket médio são obrigatórios.", variant: "destructive" });
                          return;
                        }
                        await upsertServices.mutateAsync(valid);
                        setIsEditingServices(false);
                        toast({ title: "Serviços salvos!", description: "O forecast e oportunidades serão recalculados." });
                      }}
                      disabled={upsertServices.isPending}
                      className="gap-2"
                    >
                      {upsertServices.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service, i) => (
                    <div key={service.id} className="flex items-start gap-3 p-3.5 rounded-lg border border-border/30 bg-background/80 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.06)]">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Ticket médio: R$ {Number(service.average_ticket).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </p>
                        {service.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                    <span className="font-medium text-foreground">Ticket médio geral: </span>
                    R$ {(services.reduce((a, b) => a + Number(b.average_ticket), 0) / services.length).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </>)}



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
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Plano atual:</span>
                    <span className={`font-bold ${getPlanColor(profile?.plan || 'free')}`}>
                      {planLabel}
                    </span>
                  </div>
                  {hasOpps ? (
                    <p className="text-sm text-muted-foreground">
                      {(profile?.searches_used || 0).toLocaleString('pt-BR')} de {((profile?.searches_limit || 10) + (((profile as any)?.extra_opportunities_packs || 0) * 1000) + (((profile as any)?.bonus_searches || 0))).toLocaleString('pt-BR')} oportunidades utilizadas
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {crmContactsCount.toLocaleString('pt-BR')} de {Number.isFinite(contactLimit) ? contactLimit.toLocaleString('pt-BR') : '∞'} contatos no CRM utilizados
                    </p>
                  )}

                  {hasOpps && (((profile as any)?.extra_opportunities_packs || 0) > 0) && (
                    <p className="text-xs text-primary font-medium">
                      + {(((profile as any).extra_opportunities_packs) * 1000).toLocaleString('pt-BR')} oportunidades da Expansão Comercial
                    </p>
                  )}
                  {hasOpps && ((profile as any)?.bonus_searches || 0) > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">
                      + {((profile as any).bonus_searches).toLocaleString('pt-BR')} oportunidades bônus do plano anterior
                    </p>
                  )}
                  {hasOpps && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                            <RefreshCcw className="h-3 w-3" />
                            Reset das oportunidades mensais: {getNextSearchResetLabel()}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1 text-sm">
                            <p><strong>Último reset:</strong> {getLastResetLabel()}</p>
                            <p><strong>Próximo reset:</strong> {getNextResetDate()}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

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
                <>
                  {((profile as any)?.payment_provider === 'abacate_pay' || ((profile as any)?.payment_provider == null && !(profile as any)?.stripe_customer_id)) && (profile as any)?.payment_provider !== 'stripe' ? (
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/40">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">₱</span>
                          </div>
                          <span className="font-medium text-sm">Assinatura via PIX</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Gerencie sua assinatura, cancele ou altere seu plano pelo portal de pagamentos
                        </p>
                        {profile?.subscription_current_period_end && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Próxima cobrança: {formatDate(profile.subscription_current_period_end)}
                          </p>
                        )}
                      </div>
                      <Link to="/minha-assinatura">
                        <Button variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Gerenciar
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/40">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">Assinatura via Cartão</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Gerencie sua assinatura, cancele ou altere seu plano pelo portal de pagamentos
                        </p>
                        {profile?.subscription_current_period_end && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Próxima cobrança: {formatDate(profile.subscription_current_period_end)}
                          </p>
                        )}
                      </div>
                      <Link to="/minha-assinatura">
                        <Button variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Gerenciar
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Trial Cancel Card — só aparece se está em trial com cartão */}
          <TrialCancelCard />

          {/* Email Preferences Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notificações por e-mail
              </CardTitle>
              <CardDescription>
                Controle quais e-mails você deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Alertas operacionais</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Campanhas iniciadas, números desconectados, falhas
                  </p>
                </div>
                <Switch
                  checked={transactionalEnabled}
                  onCheckedChange={(v) => handleEmailPrefChange("transactional_enabled", v)}
                  disabled={isLoadingEmailPrefs || isSavingEmailPrefs}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Comunicados e novidades</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    E-mails promocionais, atualizações de produto e broadcasts do admin
                  </p>
                </div>
                <Switch
                  checked={marketingEnabled}
                  onCheckedChange={(v) => handleEmailPrefChange("marketing_enabled", v)}
                  disabled={isLoadingEmailPrefs || isSavingEmailPrefs}
                />
              </div>
            </CardContent>
          </Card>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Tour guiado */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Tour guiado
              </CardTitle>
              <CardDescription>
                Refaça o passo a passo para entender melhor como a Wiize funciona
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="font-medium">Reiniciar tutorial</span>
                  <p className="text-sm text-muted-foreground">
                    Veja novamente os 4 pilares e como usar cada um
                  </p>
                </div>
                <RestartTourButton />
              </div>
            </CardContent>
          </Card>

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
                <Link to="/contato">
                  <Button variant="default" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Entrar em contato
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Password Reset Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Alterar senha
            </DialogTitle>
            <DialogDescription>
              Enviaremos um e-mail de confirmação para redefinir sua senha
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">E-mail de destino:</span>
              </div>
              <p className="font-medium">{user?.email}</p>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
              <p>Você receberá um link no seu e-mail para criar uma nova senha. O link expira em 1 hora.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendPasswordResetEmail}
              disabled={isSendingResetEmail}
              className="gap-2"
            >
              {isSendingResetEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Enviar e-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function RestartTourButton() {
  const { user } = useAuth();
  const { start } = useGuidedTour();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await resetGuidedTour(user.id);
      start();
      toast({ title: "Tour reiniciado", description: "Vamos começar do início." });
    } catch (e) {
      toast({ title: "Erro ao reiniciar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} variant="default" className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
      Refazer tutorial
    </Button>
  );
}

export default Profile;
