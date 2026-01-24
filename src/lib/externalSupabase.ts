// Cliente Supabase para o banco de dados externo (produção)
// Este arquivo NÃO depende do .env que é sobrescrito pelo Lovable Cloud

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Credenciais do projeto externo
const EXTERNAL_SUPABASE_URL = 'https://lqfqnqfeuneorxocybru.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnFucWZldW5lb3J4b2N5YnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTMyMjQsImV4cCI6MjA4NDY4OTIyNH0.ccxmuoqz-hlanRfqdvQZXN5tdt5d_8j5F6DVCjZAeB8';

export const externalSupabase = createClient<Database>(
  EXTERNAL_SUPABASE_URL, 
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'external-supabase-auth', // Chave separada para não conflitar
    }
  }
);

// URL base para chamar edge functions do projeto externo
export const EXTERNAL_FUNCTIONS_URL = `${EXTERNAL_SUPABASE_URL}/functions/v1`;

// Helper para invocar edge functions no projeto externo
export async function invokeExternalFunction<T = unknown>(
  functionName: string,
  options?: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data: sessionData } = await externalSupabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(`${EXTERNAL_FUNCTIONS_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EXTERNAL_SUPABASE_ANON_KEY,
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { data: data as T, error: null };
  } catch (error) {
    console.error(`Error invoking external function ${functionName}:`, error);
    return { data: null, error: error as Error };
  }
}

// Re-exporta para facilitar uso
export const getExternalSupabaseUrl = () => EXTERNAL_SUPABASE_URL;
export const getExternalAnonKey = () => EXTERNAL_SUPABASE_ANON_KEY;
