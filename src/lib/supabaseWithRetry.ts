import { supabase } from '@/integrations/supabase/client';

interface RetryOptions {
  maxRetries?: number;
  onSessionRefreshed?: () => void;
}

/**
 * Invokes a Supabase edge function with automatic session refresh on 401 errors.
 * Retries the request once after refreshing the session.
 */
export async function invokeWithRetry<T = unknown>(
  functionName: string,
  options?: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
  retryOptions?: RetryOptions
): Promise<{ data: T | null; error: Error | null }> {
  const { maxRetries = 1, onSessionRefreshed } = retryOptions || {};
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await supabase.functions.invoke<T>(functionName, options);
      
      // Check for 401 or requiresReauth in response
      const responseData = response.data as Record<string, unknown> | null;
      const is401Error = 
        response.error?.message?.includes('401') ||
        response.error?.message?.includes('Unauthorized') ||
        responseData?.requiresReauth === true;
      
      if (is401Error && attempt < maxRetries) {
        console.log(`[invokeWithRetry] 401 detected for ${functionName}, refreshing session (attempt ${attempt + 1}/${maxRetries})`);
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[invokeWithRetry] Session refresh failed:', refreshError);
          return { data: null, error: new Error('Sessão expirada. Por favor, faça login novamente.') };
        }
        
        if (refreshData.session) {
          console.log('[invokeWithRetry] Session refreshed successfully');
          onSessionRefreshed?.();
          // Continue to next iteration (retry)
          continue;
        } else {
          console.error('[invokeWithRetry] No session after refresh');
          return { data: null, error: new Error('Sessão expirada. Por favor, faça login novamente.') };
        }
      }
      
      // Return response if not a 401 or if we've exhausted retries
      return { 
        data: response.data, 
        error: response.error ? new Error(response.error.message) : null 
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[invokeWithRetry] Error invoking ${functionName}:`, lastError);
      
      // Check if it's a network error that might be auth-related
      if (attempt < maxRetries) {
        const isAuthError = lastError.message?.includes('401') || 
                           lastError.message?.includes('Unauthorized') ||
                           lastError.message?.includes('JWT');
        
        if (isAuthError) {
          console.log(`[invokeWithRetry] Auth error detected, refreshing session (attempt ${attempt + 1}/${maxRetries})`);
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            console.log('[invokeWithRetry] Session refreshed successfully');
            onSessionRefreshed?.();
            continue;
          }
        }
      }
    }
  }
  
  return { data: null, error: lastError };
}

/**
 * Helper to check if an error indicates session expiration
 */
export function isSessionExpiredError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    errorMessage.includes('401') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('session') ||
    errorMessage.includes('token')
  );
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[refreshSession] Failed:', error);
      return false;
    }
    
    return !!data.session;
  } catch (err) {
    console.error('[refreshSession] Error:', err);
    return false;
  }
}
