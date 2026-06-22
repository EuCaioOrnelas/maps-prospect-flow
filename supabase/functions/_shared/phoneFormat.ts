// Shared phone formatter for Meta Cloud API (E.164 sem "+").
// Mantém em sync com src/lib/phoneUtils.ts → formatPhoneForMeta.
//
// Regras:
// - Input com "+" ou prefixo "00" → tratado como E.164 explícito (NÃO prefixa 55).
// - 10–11 dígitos sem DDI → Brasil (prefixa 55).
// - 55 + DDD + 8 dígitos (12 totais) → insere 9º dígito após DDD.
// - Internacional (12+ dígitos) → mantém intacto.
// - Retorna "" se fora do padrão E.164 (10–15 dígitos).
export function formatPhoneForMeta(phone: string): string {
  const raw = String(phone || "").trim();
  if (!raw) return "";

  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  let explicitIntl = hasPlus;
  if (!hasPlus && digits.startsWith("00") && digits.length > 4) {
    digits = digits.slice(2);
    explicitIntl = true;
  }

  if (!explicitIntl && digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = "55" + digits;
  }

  if (digits.startsWith("55") && digits.length === 12) {
    const ddd = parseInt(digits.slice(2, 4), 10);
    if (ddd >= 11 && ddd <= 99) {
      digits = digits.slice(0, 4) + "9" + digits.slice(4);
    }
  }

  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}
