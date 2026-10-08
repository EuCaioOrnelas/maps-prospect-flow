import { beforeEach, describe, expect, it } from "vitest";
import { dismissPromoEntry, readPromoEntry, recordPromoEntry } from "./wiizepayPromoRotation";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
describe("WiizePay promo rotation", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("skips the first visit and shows the original on the next session", () => {
    expect(readPromoEntry("new", 3, "1", NOW)).toBeNull();
    expect(readPromoEntry("new", 3, "1", NOW)).toBeNull();
    sessionStorage.clear();
    expect(readPromoEntry("new", 3, "1", NOW)?.index).toBe(0);
  });
  it("rotates all three images every 15 days, including within a long session", () => {
    const first = readPromoEntry("owner", 3, "reset", NOW);
    expect(first?.index).toBe(1);
    if (!first) throw new Error("Missing first image");
    recordPromoEntry("owner", first, 3, "reset");
    dismissPromoEntry("owner", first, "reset");
    expect(readPromoEntry("owner", 3, "reset", NOW + 14 * DAY)).toBeNull();
    const second = readPromoEntry("owner", 3, "reset", NOW + 15 * DAY);
    expect(second?.index).toBe(2);
    if (!second) throw new Error("Missing second image");
    recordPromoEntry("owner", second, 3, "reset");
    sessionStorage.clear();
    expect(readPromoEntry("owner", 3, "reset", NOW + 16 * DAY)).toBeNull();
    expect(readPromoEntry("owner", 3, "reset", NOW + 30 * DAY)?.index).toBe(0);
  });
  it("keeps the same image when navigating and isolates accounts", () => {
    const entry = readPromoEntry("owner", 3, "reset", NOW);
    if (!entry) throw new Error("Missing image");
    recordPromoEntry("owner", entry, 3, "reset");
    expect(readPromoEntry("owner", 3, "reset", NOW + 1000)).toEqual(entry);
    expect(readPromoEntry("other", 3, "1", NOW)).toBeNull();
  });
  it("preserves the previous 15-day dismissal for other accounts", () => {
    localStorage.setItem("wiizepay-entry-promo-v2", String(NOW));
    expect(readPromoEntry("existing", 3, "1", NOW + DAY)).toBeNull();
    expect(readPromoEntry("existing", 3, "1", NOW + 15 * DAY)?.index).toBe(0);
  });
});