const BACKEND_BASE_URL =
  "https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wiize-api-v1";

const REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "idempotency-key",
  "x-api-key",
  "x-wiize-api-key",
  "x-client-info",
  "x-forwarded-for",
  "x-real-ip",
] as const;

const RESPONSE_HEADERS = [
  "content-type",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-ratelimit-burst-limit",
  "x-ratelimit-daily-limit",
  "x-ratelimit-daily-remaining",
  "x-ratelimit-scope",
] as const;

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  end: () => void;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, x-api-key, x-wiize-api-key, content-type, idempotency-key, x-client-info",
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const method = req.method || "GET";
  if (method !== "POST" && method !== "GET") {
    res.status(405).send(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Método não permitido." } }));
    return;
  }

  const rawPath = req.query.path;
  const path = (Array.isArray(rawPath) ? rawPath : [rawPath])
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .flatMap((part) => part.split("/"))
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  if (!path.startsWith("v1/")) {
    res.status(404).send(JSON.stringify({ error: { code: "NOT_FOUND", message: "Endpoint não encontrado." } }));
    return;
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = first(req.headers[name]);
    if (value) headers.set(name, value);
  }
  if (!headers.has("content-type")) headers.set("content-type", "application/json");

  const init: RequestInit = { method, headers, redirect: "manual" };
  if (method !== "GET") {
    init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/${path}`, init);
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.status(upstream.status).send(await upstream.text());
  } catch {
    res.status(502).send(JSON.stringify({
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "A API da Wiize está temporariamente indisponível.",
      },
    }));
  }
}