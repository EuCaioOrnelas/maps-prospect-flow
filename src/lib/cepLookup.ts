// Formatação e consulta de CEP usadas no checkout, trial e cadastro da API.
// Regra: o CEP nunca pode travar o fluxo. Se a base pública não retornar o
// endereço, o usuário preenche manualmente e seguimos com o CEP informado
// (formato genérico), sem impacto nas cobranças (enviamos sempre 8 dígitos).

export const cepDigits = (v: string) => (v || "").replace(/\D/g, "").slice(0, 8);

/** Máscara progressiva 00000-000 (funciona ao digitar e ao colar). */
export const formatCep = (v: string) => {
  const d = cepDigits(v);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export const isCepComplete = (v: string) => cepDigits(v).length === 8;

export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CepLookupResult {
  /** true quando o endereço foi encontrado em alguma base pública */
  found: boolean;
  address: CepAddress | null;
}

const fetchWithTimeout = async (url: string, ms = 6000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Busca o endereço do CEP. Nunca lança: quando não encontra (ou a base está
 * fora do ar) devolve `found: false` para o formulário seguir em modo manual.
 */
export async function lookupCep(rawCep: string): Promise<CepLookupResult> {
  const clean = cepDigits(rawCep);
  if (clean.length !== 8) return { found: false, address: null };

  // 1) ViaCEP
  try {
    const res = await fetchWithTimeout(`https://viacep.com.br/ws/${clean}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data?.erro) {
        return {
          found: true,
          address: {
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: (data.uf || "").trim().toUpperCase(),
          },
        };
      }
    }
  } catch {
    // segue para o fallback
  }

  // 2) BrasilAPI (fallback)
  try {
    const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${clean}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.cep) {
        return {
          found: true,
          address: {
            street: data.street || "",
            neighborhood: data.neighborhood || "",
            city: data.city || "",
            state: (data.state || "").trim().toUpperCase(),
          },
        };
      }
    }
  } catch {
    // sem base disponível
  }

  return { found: false, address: null };
}
