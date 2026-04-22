import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROOT_FOLDER_NAME = "Wiize CRM";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token || null;
}

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | null,
): Promise<string> {
  const safeName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length) return searchData.files[0].id;

  const createBody: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) createBody.parents = [parentId];

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createBody),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(`Falha ao criar pasta: ${JSON.stringify(createData)}`);
  return createData.id;
}

async function getFolderUrl(accessToken: string, folderId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=webViewLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  return data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
}

function jsonResp(ok: boolean, payload: Record<string, unknown>, httpStatus = 200) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: httpStatus,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResp(false, { error: "Não autenticado" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const leadId = formData.get("lead_id") as string | null;
    const customName = (formData.get("custom_name") as string | null)?.trim() || null;

    if (!file || !leadId) {
      return new Response(JSON.stringify({ error: "Arquivo e lead_id obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1) Get drive connection
    const { data: conn } = await admin
      .from("user_drive_connections")
      .select("access_token, refresh_token, token_expires_at, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn?.is_active || !conn.access_token) {
      return new Response(JSON.stringify({ error: "Google Drive não conectado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = conn.access_token;
    const expired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date();
    if (expired && conn.refresh_token) {
      const refreshed = await refreshAccessToken(conn.refresh_token);
      if (refreshed) {
        accessToken = refreshed;
        await admin.from("user_drive_connections").update({
          access_token: refreshed,
          token_expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      }
    }

    // 2) Get lead info (need name + existing folder)
    const { data: lead } = await admin
      .from("leads")
      .select("id, contact_name, company_name, drive_folder_id, drive_folder_url")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Ensure root + lead folder
    let leadFolderId = lead.drive_folder_id;
    let leadFolderUrl = lead.drive_folder_url;

    if (!leadFolderId) {
      const rootId = await findOrCreateFolder(accessToken, ROOT_FOLDER_NAME, null);
      const leadName = (lead.contact_name || lead.company_name || `Lead ${lead.id.slice(0, 8)}`)
        .replace(/[\\/:*?"<>|]/g, "-")
        .slice(0, 100);
      leadFolderId = await findOrCreateFolder(accessToken, leadName, rootId);
      leadFolderUrl = await getFolderUrl(accessToken, leadFolderId);

      await admin.from("leads").update({
        drive_folder_id: leadFolderId,
        drive_folder_url: leadFolderUrl,
      }).eq("id", leadId);
    }

    // 4) Upload file (multipart)
    const finalName = customName
      ? (customName.includes(".") ? customName : `${customName}${getExt(file.name)}`)
      : file.name;

    const metadata = {
      name: finalName,
      parents: [leadFolderId],
    };

    const boundary = "wiize_boundary_" + crypto.randomUUID();
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const enc = new TextEncoder();
    const pre = enc.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    );
    const post = enc.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(pre.length + fileBytes.length + post.length);
    body.set(pre, 0);
    body.set(fileBytes, pre.length);
    body.set(post, pre.length + fileBytes.length);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,mimeType",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      console.error("Upload failed:", uploadData);

      // Detect Google Drive storage quota exceeded
      const reason = uploadData?.error?.errors?.[0]?.reason || "";
      const message = uploadData?.error?.message || "";
      const isQuotaError =
        reason === "storageQuotaExceeded" ||
        reason === "quotaExceeded" ||
        /quota|storage.*full|exceeded/i.test(message);

      if (isQuotaError) {
        return new Response(JSON.stringify({
          error: "drive_storage_full",
          message: "Seu Google Drive está sem espaço disponível.",
          details: message,
        }), {
          status: 507, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Falha no upload para o Drive", details: uploadData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Insert into lead_files
    const { error: insertErr } = await admin.from("lead_files").insert({
      lead_id: leadId,
      user_id: user.id,
      file_name: uploadData.name,
      file_type: "drive",
      file_url: uploadData.webViewLink,
      file_size: file.size,
      source: "drive",
      drive_file_id: uploadData.id,
      drive_folder_id: leadFolderId,
    });
    if (insertErr) console.error("Insert lead_files failed:", insertErr);

    return new Response(JSON.stringify({
      success: true,
      file: {
        id: uploadData.id,
        name: uploadData.name,
        url: uploadData.webViewLink,
      },
      folder_url: leadFolderUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}
