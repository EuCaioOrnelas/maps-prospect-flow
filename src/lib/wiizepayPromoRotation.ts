const INTERVAL = 15 * 86_400_000;
const LEGACY_KEY = "wiizepay-entry-promo-v2";

export interface PromoEntry { index: number; shownAt: number }
interface PromoHistory { lastShownAt: number; nextIndex: number }

export function promoKeys(userId: string, revision = "1") {
  const key = `wiizepay-entry-rotation:${userId}:${revision}`;
  return { history: key, session: `${key}:session` };
}

/** Decide without consuming an impression until the unconnected account is ready. */
export function readPromoEntry(userId: string, count: number, revision = "1", now = Date.now()): PromoEntry | null {
  if (count < 1) return null;
  try {
    const keys = promoKeys(userId, revision);
    const sessionRaw = sessionStorage.getItem(keys.session);
    if (sessionRaw) {
      const cached = JSON.parse(sessionRaw) as PromoEntry & { hidden?: boolean };
      if (now - cached.shownAt < INTERVAL) return cached.hidden ? null : cached;
    }
    let historyRaw = localStorage.getItem(keys.history);
    if (!historyRaw) {
      // Explicit account reset skips the first-visit delay, without changing other accounts.
      const legacy = revision === "1" ? localStorage.getItem(LEGACY_KEY) : "armed";
      const lastShownAt = legacy && legacy !== "armed" && Number.isFinite(Number(legacy)) ? Number(legacy) : 0;
      historyRaw = JSON.stringify({ lastShownAt, nextIndex: revision === "1" ? 0 : 1 });
      localStorage.setItem(keys.history, historyRaw);
      if (!legacy) {
        sessionStorage.setItem(keys.session, JSON.stringify({ index: 0, shownAt: now, hidden: true }));
        return null;
      }
    }
    const history = JSON.parse(historyRaw) as PromoHistory;
    if (history.lastShownAt && now - history.lastShownAt < INTERVAL) return null;
    return { index: ((history.nextIndex % count) + count) % count, shownAt: now };
  } catch { return null; }
}

export function recordPromoEntry(userId: string, entry: PromoEntry, count: number, revision = "1") {
  try {
    const keys = promoKeys(userId, revision);
    localStorage.setItem(keys.history, JSON.stringify({ lastShownAt: entry.shownAt, nextIndex: (entry.index + 1) % count }));
    sessionStorage.setItem(keys.session, JSON.stringify(entry));
  } catch { /* Storage may be disabled. */ }
}

export function dismissPromoEntry(userId: string, entry: PromoEntry, revision = "1") {
  try {
    sessionStorage.setItem(promoKeys(userId, revision).session, JSON.stringify({ ...entry, hidden: true }));
  } catch { /* Storage may be disabled. */ }
}