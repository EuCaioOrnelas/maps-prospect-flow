export async function getSdrTestError(error: unknown): Promise<string> {
  const candidate = error as { context?: Response; message?: string } | null;
  if (candidate?.context && typeof candidate.context.clone === "function") {
    try {
      const body = await candidate.context.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) return body.error;
    } catch { /* Use a readable fallback if the response is not JSON. */ }
    if (candidate.context.status === 401) return "Sua sessão expirou. Entre novamente para testar o vendedor.";
    if (candidate.context.status === 403) return "Sua conta não tem acesso a este vendedor.";
  }
  if (candidate?.message && !/Edge Function|Failed to fetch|non-2xx|AbortError|aborted/i.test(candidate.message)) return candidate.message;
  return "Não foi possível concluir o teste. Verifique sua conexão e tente novamente.";
}

export async function requestSdrTest(
  invoke: (name: string, options: { body: unknown; signal: AbortSignal }) => Promise<{ data: any; error: unknown }>,
  body: unknown,
  signal: AbortSignal,
  timeoutMs = 90000,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const stopped = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("O vendedor demorou para responder. Tente novamente; se continuar, confira a chave de inteligência do vendedor.")), timeoutMs);
    onAbort = () => reject(new Error("Teste interrompido."));
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    const { data, error } = await Promise.race([invoke("sdr-brain", { body, signal }), stopped]);
    if (error) throw new Error(await getSdrTestError(error));
    if (data?.error) throw new Error(await getSdrTestError({ message: data.error }));
    if (!data || !Array.isArray(data.messages)) throw new Error("O teste retornou uma resposta incompleta. Tente novamente.");
    return data;
  } finally {
    clearTimeout(timer);
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}