import { useEffect,useRef,useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGuidedTour } from '@/hooks/useGuidedTour';
import { supabase } from '@/integrations/supabase/client';
import { UpdateModal } from './UpdateModal';
import type { WiizeUpdate } from '@/lib/updates';
import { canShowUpdatesOnEntry } from '@/lib/updateEntryEligibility';
import { toast } from 'sonner';
export function UpdatesPresenter({blocked=false,automaticDisabled=false}:{blocked?:boolean;automaticDisabled?:boolean}) {
 const {user,session}=useAuth(); const tour=useGuidedTour();const location=useLocation();const [queue,setQueue]=useState<WiizeUpdate[]>([]);const [index,setIndex]=useState(0);const [active,setActive]=useState<WiizeUpdate|null>(null);const presentation=useRef(crypto.randomUUID());const fetched=useRef<string>();const manual=useRef(false);const busy=useRef(false);const db=supabase as any;
 const claim=async(item:WiizeUpdate,automatic:boolean)=>{const pid=crypto.randomUUID();const {data,error}=await db.rpc('updates_record_event',{_id:item.id,_event:'view',_presentation:pid,_automatic:automatic});if(error || !data)return false;presentation.current=pid;manual.current=!automatic;setActive(item);if(!automatic)await db.rpc('updates_record_event',{_id:item.id,_event:'reopen',_presentation:pid});return true;};
 useEffect(()=>{setActive(null);setQueue([]);setIndex(0);fetched.current=undefined;return()=>{delete document.body.dataset.updatesPending;};},[user?.id]);
 useEffect(()=>{
  if(!user || automaticDisabled || blocked || tour.isActive || location.pathname.startsWith('/admin') || location.pathname.includes('onboarding'))return;
  const sid=session?.access_token ? (()=>{try{return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id ?? `${user.id}:${user.last_sign_in_at}`;}catch{return null;}})():null;
  if(!sid || fetched.current===sid)return;
  let cancelled=false;
  (async()=>{
   // Check before listing/claiming: the initial tour must not consume impressions.
   const {data:onboarding,error:onboardingError}=await db.from('user_onboarding')
    .select('completed_at,skipped,role,tour_completed_at,created_at').eq('user_id',user.id).maybeSingle();
   if(cancelled)return;
   if(onboardingError || !canShowUpdatesOnEntry(onboarding,user.last_sign_in_at))return;
   document.body.dataset.updatesPending='true';
   await db.rpc('updates_sync_me');
   if(cancelled)return;
   const {data,error}=await db.rpc('updates_list_due');
   if(cancelled)return;
   if(!error)fetched.current=sid;
   setQueue(error?[]:(data??[]).slice(0,1));
   if(error || !data?.length)delete document.body.dataset.updatesPending;
  })();
  return()=>{cancelled=true;delete document.body.dataset.updatesPending;};
 },[user?.id,user?.last_sign_in_at,blocked,automaticDisabled,tour.isActive,session?.access_token,location.pathname]);
 useEffect(()=>{if(active || !queue[index] || blocked || tour.isActive)return;const timer=setInterval(async()=>{if(busy.current || document.querySelector('[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"],.react-joyride__tooltip') || document.body.classList.contains('tour-active'))return;busy.current=true;try {if(!(await claim(queue[index],true)))setIndex(i=>i+1);}finally {busy.current=false;}},300);return()=>clearInterval(timer);},[queue,index,active,blocked,tour.isActive]);
 useEffect(()=>{if(!active && index>=queue.length && queue.length>0)delete document.body.dataset.updatesPending;},[active,index,queue.length]);
 useEffect(()=>{let cancelled=false;const open=async(e:Event)=>{const id=(e as CustomEvent<string>).detail;if(!user || typeof id!=='string')return;if(blocked || tour.isActive){toast.info('Conclua a etapa atual antes de abrir a novidade.');return;}try{const {data,error}=await db.from('announcements').select('*').eq('id',id).maybeSingle();if(cancelled)return;if(error)throw error;if(!data){toast.info('Este aviso não está mais disponível.');return;}if(!(await claim(data,false)))toast.error('Não foi possível abrir o aviso. Tente novamente.');}catch{if(!cancelled)toast.error('Não foi possível carregar o aviso. Tente novamente.');}};window.addEventListener('wiize:open-update',open);return()=>{cancelled=true;window.removeEventListener('wiize:open-update',open);};},[blocked,tour.isActive,user?.id]);
 const dismiss=async()=>{if(active)await db.rpc('updates_record_event',{_id:active.id,_event:'dismiss',_presentation:presentation.current});setActive(null);if(!manual.current)setIndex(i=>i+1);};
 const move=async(delta:number)=>{if(active)await db.rpc('updates_record_event',{_id:active.id,_event:'dismiss',_presentation:presentation.current});const target=queue[index+delta];setActive(null);setIndex(i=>i+delta);if(target)await claim(target,false);manual.current=false;};
 return <UpdateModal item={active} onClose={()=>void dismiss()} onClick={async()=>{if(!active)return false;const {data,error}=await db.rpc('updates_record_event',{_id:active.id,_event:'click',_presentation:presentation.current});return !error && data===true;}} position={!manual.current && queue.length>1?`${index+1} de ${queue.length}`:undefined} previous={index>0?()=>void move(-1):undefined} next={index<queue.length-1?()=>void move(1):undefined}/>;
}
