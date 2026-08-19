// O blog usa o mesmo backend e a mesma sessão da aplicação. Reutilizar o client
// principal evita locks concorrentes e elimina a dependência de chaves externas.
import { supabase } from "@/integrations/supabase/client";

export const blogSupabase = supabase;
export const blogPublic = supabase;
