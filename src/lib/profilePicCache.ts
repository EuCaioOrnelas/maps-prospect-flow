// Cache local (localStorage) das fotos de perfil dos contatos que têm conversa.
// Evita "piscar" o avatar e deixa o carregamento do chat mais rápido.

const KEY = "wiize:chat:profilePics:v1";
const MAX_ENTRIES = 500;

type Store = Record<string, { url: string; at: number }>;

const phoneKey = (phone: string | null | undefined) =>
  (phone || "").replace(/\D/g, "").slice(-10);

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    const entries = Object.entries(store)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* quota cheia — ignora */
  }
}

export function getCachedProfilePic(phone: string | null | undefined): string | null {
  const k = phoneKey(phone);
  if (!k) return null;
  return read()[k]?.url || null;
}

export function setCachedProfilePic(phone: string | null | undefined, url: string | null | undefined) {
  const k = phoneKey(phone);
  if (!k) return;
  const store = read();
  if (!url) delete store[k];
  else store[k] = { url, at: Date.now() };
  write(store);
}

/** Preenche as fotos ausentes a partir do cache e guarda as novas. */
export function hydrateProfilePics<T extends { contact_phone: string | null; contact_profile_pic: string | null }>(
  list: T[],
): T[] {
  const store = read();
  let changed = false;
  const out = list.map((c) => {
    const k = phoneKey(c.contact_phone);
    if (!k) return c;
    if (c.contact_profile_pic) {
      if (store[k]?.url !== c.contact_profile_pic) {
        store[k] = { url: c.contact_profile_pic, at: Date.now() };
        changed = true;
      }
      return c;
    }
    const cached = store[k]?.url;
    return cached ? ({ ...c, contact_profile_pic: cached } as T) : c;
  });
  if (changed) write(store);
  return out;
}
