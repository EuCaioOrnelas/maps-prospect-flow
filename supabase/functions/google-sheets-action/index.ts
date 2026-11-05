import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getGoogleAccessToken, googleFailure, json, resolveCaller } from "../_shared/googleAuth.ts";

const SHEET_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

// A1 notation needs quotes around tab names ('Minha aba'!A1).
const a1 = (tab: string, cell = "A1") => `'${tab.replace(/'/g, "''")}'!${cell}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { google_account_id, spreadsheet_id, sheet_name, data, action } = body;

    if (!spreadsheet_id || !SHEET_ID_RE.test(spreadsheet_id) || !Array.isArray(data)) {
      return json({ error: "Dados obrigatórios ausentes (planilha ou linha)" }, 400);
    }

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "spreadsheets");
    if (tok instanceof Response) return tok;
    const auth = { Authorization: `Bearer ${tok.accessToken}`, "Content-Type": "application/json" };
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`;

    // Garante que a aba exista: usa a informada, cria se faltar, ou usa a primeira.
    const metaRes = await fetch(`${base}?fields=sheets.properties(sheetId,title)`, { headers: auth });
    if (!metaRes.ok) return await googleFailure(metaRes, "Não foi possível abrir a planilha");
    const meta = await metaRes.json();
    const tabs: string[] = (meta.sheets || []).map((s: any) => s.properties.title);
    let tab = typeof sheet_name === "string" && sheet_name.trim() ? sheet_name.trim() : "";
    if (!tab) tab = tabs[0] || "Dados";
    if (!tabs.includes(tab)) {
      const addRes = await fetch(`${base}:batchUpdate`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
      });
      if (!addRes.ok) return await googleFailure(addRes, "Não foi possível criar a aba na planilha");
    }

    const values = (Array.isArray(data[0]) ? data : [data]).map((row: any[]) =>
      row.map((v) => (v == null ? "" : String(v).slice(0, 50000))));

    if (action === "clear_and_set_headers") {
      const clearRes = await fetch(`${base}/values/${encodeURIComponent(a1(tab, "A:ZZ"))}:clear`, {
        method: "POST", headers: auth, body: "{}",
      });
      if (!clearRes.ok) return await googleFailure(clearRes, "Falha ao limpar a aba");
      const updRes = await fetch(
        `${base}/values/${encodeURIComponent(a1(tab))}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: auth, body: JSON.stringify({ values }) },
      );
      if (!updRes.ok) return await googleFailure(updRes, "Falha ao gravar os cabeçalhos");
      const upd = await updRes.json();
      return json({ success: true, sheet_name: tab, updatedRange: upd.updatedRange });
    }

    const appendRes = await fetch(
      `${base}/values/${encodeURIComponent(a1(tab))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", headers: auth, body: JSON.stringify({ values }) },
    );
    if (!appendRes.ok) return await googleFailure(appendRes, "Falha ao gravar na planilha");
    const appended = await appendRes.json();
    return json({ success: true, sheet_name: tab, updatedRange: appended.updates?.updatedRange });
  } catch (err) {
    console.error("Error in google-sheets-action:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
