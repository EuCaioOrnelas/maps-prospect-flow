-- ============================================================================
-- WIIZE — AVISO URGENTE DE INDISPONIBILIDADE (envio direto pelo banco)
-- ----------------------------------------------------------------------------
-- COMO USAR:
-- 1) Troque 're_SUA_CHAVE_RESEND' pela sua RESEND_API_KEY real.
-- 2) Rode o bloco inteiro no SQL Editor do seu banco de produção.
-- Requisitos: extensão pg_net habilitada (já usada pelos crons da Wiize).
-- Envia em lotes de 100 destinatários (endpoint /emails/batch da Resend).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_resend_key text := 're_SUA_CHAVE_RESEND';   -- <<<<<< TROCAR AQUI
  v_from       text := 'Wiize <no-reply@wiize.com.br>';
  v_subject    text := '[URGENTE] Wiize temporariamente indisponível — já estamos corrigindo';
  v_html       text;
  v_batch      jsonb;
  v_total      int := 0;
  v_offset     int := 0;
  v_chunk      int := 100;
BEGIN
  -- ── Template HTML (mesmo layout dos e-mails Wiize) ────────────────────────
  v_html := $HTML$
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Wiize temporariamente indisponível</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Instabilidade temporária na Wiize — nossa equipe já está atuando na correção.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:#3daa57;padding:24px 32px;text-align:center;">
  <img src="https://wgokhkawjdxsmvfuhazb.supabase.co/storage/v1/object/public/avatars/email/wiize-logo-email.png" alt="Wiize" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:8px;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle;">Wiize</span>
</td></tr>
<tr><td style="padding:32px;">
  <div style="margin:0 0 20px;padding:12px 16px;background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;">
    <p style="margin:0;font-size:13px;font-weight:700;color:#9a3412;letter-spacing:.3px;">AVISO URGENTE • STATUS DA PLATAFORMA</p>
  </div>
  <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">A Wiize está temporariamente indisponível</h1>
  <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
    Identificamos uma instabilidade na infraestrutura de hospedagem (Vercel) que está impedindo o carregamento da plataforma neste momento.
  </p>
  <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.6;">
    <strong>Nossa equipe técnica já está trabalhando na correção</strong> e a prioridade máxima é restabelecer o acesso o quanto antes.
  </p>
  <div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:8px;">
    <p style="margin:0 0 6px;font-size:14px;color:#166534;"><strong>Seus dados estão seguros.</strong></p>
    <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">Nenhuma informação foi perdida. Mensagens, leads, agenda e histórico permanecem íntegros e voltarão exatamente como estavam assim que o serviço for restabelecido.</p>
  </div>
  <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;line-height:1.6;">Assim que tudo voltar ao normal, enviaremos uma nova confirmação por e-mail.</p>
  <p style="margin:16px 0 0;font-size:14px;color:#71717a;">Pedimos desculpas pelo transtorno e agradecemos muito pela sua paciência.</p>
  <a href="https://wiize.com.br" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#3daa57;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Tentar acessar a Wiize</a>
  <p style="margin:20px 0 0;font-size:13px;color:#a1a1aa;">Equipe Wiize</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque tem uma conta na Wiize.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
$HTML$;

  -- ── Envio em lotes de 100 ─────────────────────────────────────────────────
  LOOP
    SELECT jsonb_agg(jsonb_build_object(
             'from', v_from,
             'to', jsonb_build_array(e.email),
             'subject', v_subject,
             'html', v_html
           ))
      INTO v_batch
      FROM (
        SELECT DISTINCT lower(p.email) AS email
          FROM public.profiles p
         WHERE p.email IS NOT NULL
           AND p.email <> ''
           AND p.email LIKE '%@%'
           AND COALESCE(p.is_blocked, false) = false
         ORDER BY 1
         LIMIT v_chunk OFFSET v_offset
      ) e;

    EXIT WHEN v_batch IS NULL;

    PERFORM net.http_post(
      url     := 'https://api.resend.com/emails/batch',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || v_resend_key
                 ),
      body    := v_batch
    );

    v_total  := v_total + jsonb_array_length(v_batch);
    v_offset := v_offset + v_chunk;

    PERFORM pg_sleep(0.7);  -- respeita o rate limit da Resend
  END LOOP;

  RAISE NOTICE 'Aviso urgente enfileirado para % destinatários', v_total;
END $$;

-- Conferir as respostas da API (rode alguns segundos depois):
-- SELECT id, status_code, content, created FROM net._http_response ORDER BY id DESC LIMIT 20;
