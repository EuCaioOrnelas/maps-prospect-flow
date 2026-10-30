import { Link } from 'react-router-dom';
import { ChevronsUpDown, LogOut, User, Settings, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
export function AccountMenu({expanded=true}: {expanded?:boolean}) {
 const {profile,signOut}=useAuth();
 return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-12 w-full justify-start gap-3 px-1" aria-label="Menu da conta"><Avatar className="h-8 w-8 shrink-0"><AvatarImage src={profile?.avatar_url ?? undefined}/><AvatarFallback>{profile?.name?.slice(0,1) ?? 'U'}</AvatarFallback></Avatar>{expanded && <><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium">{profile?.name ?? 'Minha conta'}</span><span className="block truncate text-xs text-muted-foreground">{profile?.email}</span></span><ChevronsUpDown className="h-4 w-4 shrink-0"/></>}</Button></DropdownMenuTrigger><DropdownMenuContent side="right" align="end" className="z-[100] w-56"><DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4"/>Meu perfil</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/profile"><Settings className="mr-2 h-4 w-4"/>Configurações e preferências</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/profile#security"><Shield className="mr-2 h-4 w-4"/>Segurança</Link></DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onClick={async()=>{try { await signOut(); } catch {toast.error('Não foi possível sair. Tente novamente.');}}} className="text-destructive"><LogOut className="mr-2 h-4 w-4"/>Sair da conta</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
