export interface WiizeUpdate {
  id: string; title: string; content: string; category: string; status: string;
  start_at: string; expires_at: string; priority: number; frequency: string; frequency_days: number;
  target_type: string; target_values: string[]; media_type: string; media_path: string | null;
  poster_path: string | null; button_label: string | null; button_destination: string | null;
  button_new_tab: boolean; deleted_at: string | null;
}
export const frequencyLabels: Record<string,string> = { once: 'Apenas uma vez', '7': 'A cada 7 dias', '15': 'A cada 15 dias', '30': 'A cada 30 dias', login: 'Em cada login', custom: 'Intervalo personalizado' };
export const statusLabels: Record<string,string> = { draft:'Rascunho',scheduled:'Agendada',published:'Publicada',paused:'Pausada',ended:'Encerrada',archived:'Arquivada' };
export function safeUpdateDestination(value: string) {
  if (/^\/[A-Za-z0-9][A-Za-z0-9/_?=&%#.+-]*$/.test(value) && !value.toLowerCase().startsWith('/admin')) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !/[\\\s]/.test(value); } catch { return false; }
}
export function updateDue(frequency: string, days: number, last: number | null, oldSession: string | null, session: string, now: number) {
  if (last === null) return true;
  if (frequency === 'once') return false;
  if (frequency === 'login') return oldSession !== session;
  return now >= last + Number(frequency === 'custom' ? days : frequency) * 86400000;
}
export function validateUpdateFile(file: Pick<File,'type'|'size'>) {
  return ['image/jpeg','image/png','image/webp'].includes(file.type) ? file.size <= 5*1024*1024 : ['video/mp4','video/webm'].includes(file.type) && file.size <= 50*1024*1024;
}
