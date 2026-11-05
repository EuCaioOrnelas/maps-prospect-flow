import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getGoogleAccessToken, googleFailure, json, resolveCaller } from "../_shared/googleAuth.ts";

const SHEET_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, spreadsheet_id, google_account_id } = body;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    const tabName = typeof body.tab_name === "string" && body.tab_name.trim()
      ? body.tab_name.trim().slice(0, 100)
      : "Dados";

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "spreadsheets");
    if (tok instanceof Response) return tok;
    const authHeader = { Authorization: `Bearer ${tok.accessToken}` };

    // ── Criar planilha ──
    if (action === "create") {
      if (!title) return json({ error: "Informe o nome da planilha" }, 400);
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
          sheets: [{ properties: { title: tabName, gridProperties: { frozenRowCount: 1 } } }],
        }),
      });
      if (!createRes.ok) return await googleFailure(createRes, "Falha ao criar planilha");
      const createData = await createRes.json();
      const createdTab = createData.sheets?.[0]?.properties?.title || tabName;
      return json({
        success: true,
        spreadsheet: {
          id: createData.spreadsheetId,
          name: createData.properties?.title || title,
          url: createData.spreadsheetUrl,
          tab_name: createdTab,
        },
      });
    }

    // ── Abas de uma planilha ──
    if (action === "get_sheets") {
      if (!spreadsheet_id || !SHEET_ID_RE.test(spreadsheet_id)) return json({ error: "Planilha inválida" }, 400);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?fields=properties.title,sheets.properties(sheetId,title)`,
        { headers: authHeader },
      );
      if (!res.ok) return await googleFailure(res, "Falha ao ler as abas da planilha");
      const data = await res.json();
      return json({
        name: data.properties?.title,
        sheets: (data.sheets || []).map((s: any) => ({ id: s.properties.sheetId, title: s.properties.title })),
      });
    }

    // ── Listar planilhas ──
    const byId = new Map<string, { id: string; name: string; modifiedTime?: string; url?: string; source: string }>();

    // 1) Planilhas já usadas nos fluxos desta conta (sempre aparecem, mesmo sem acesso ao Drive).
    const { data: flows } = await supabase
      .from("wa_automation_flows")
      .select("id")
      .or(`user_id.eq.${caller.userId},owner_user_id.eq.${caller.userId}`)
      .limit(1000);
    const flowIds = (flows || []).map((f: any) => f.id);
    if (flowIds.length) {
      const { data: nodes } = await supabase
        .from("wa_flow_nodes")
        .select("config")
        .in("flow_id", flowIds)
        .eq("node_type", "google_sheets");
      for (const n of nodes || []) {
        const c: any = n.config || {};
        if (!c.spreadsheet_id || byId.has(c.spreadsheet_id)) continue;
        if (c.google_account_id && c.google_account_id !== tok.account.id) continue;
        byId.set(c.spreadsheet_id, {
          id: c.spreadsheet_id,
          name: c.spreadsheet_name || "Planilha usada em fluxo",
          url: `https://docs.google.com/spreadsheets/d/${c.spreadsheet_id}/edit`,
          source: "wiize",
        });
      }
    }

    // 2) Planilhas visíveis no Drive (criadas pela Wiize ou liberadas pela conta).
    let driveWarning: string | null = null;
    const files: any[] = [];
    let pageToken = "";
    for (let page = 0; page < 4; page++) {
      const params = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        orderBy: "modifiedTime desc",
        pageSize: "100",
        fields: "nextPageToken,files(id,name,modifiedTime,webViewLink)",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: authHeader });
      if (!driveRes.ok) {
        const t = await driveRes.text();
        console.warn("[google-list-spreadsheets] Drive list failed", driveRes.status, t.slice(0, 300));
        driveWarning = "Para ver todas as planilhas do Google, reconecte a conta Google.";
        break;
      }
      const d = await driveRes.json();
      files.push(...(d.files || []));
      if (!d.nextPageToken) break;
      pageToken = d.nextPageToken;
    }

    const list: any[] = files.map((f) => ({
      id: f.id, name: f.name, modifiedTime: f.modifiedTime, url: f.webViewLink, source: "drive",
    }));
    for (const item of list) {
      const prev = byId.get(item.id);
      byId.set(item.id, prev ? { ...item, source: "wiize" } : item);
    }

    const spreadsheets = Array.from(byId.values()).sort((a, b) =>
      (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));

    return json({ spreadsheets, warning: driveWarning, google_email: tok.account.google_email });
  } catch (err) {
    console.error("Error in google-list-spreadsheets:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
