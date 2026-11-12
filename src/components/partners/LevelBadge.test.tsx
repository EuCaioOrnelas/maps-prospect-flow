import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LevelBadge, LEVEL_META, normalizePartnerLevel } from "./LevelBadge";

describe("partner level lookup safety", () => {
  it.each(["select", "signature", "prime"] as const)("preserves %s", (level) => {
    expect(normalizePartnerLevel(level)).toBe(level);
  });

  it("normalizes case and surrounding spaces", () => {
    expect(normalizePartnerLevel(" Signature ")).toBe("signature");
    expect(normalizePartnerLevel("PRIME")).toBe("prime");
  });

  it.each([undefined, null, "", "legacy_level", "constructor", "__proto__", 123])(
    "keeps unexpected value %s inside the supported tier set",
    (level) => {
      const normalized = normalizePartnerLevel(level);
      expect(normalized).toBe("select");
      expect(LEVEL_META[normalized]).toBe(LEVEL_META.select);
    },
  );

  it.each(["legacy_level", "constructor", "__proto__", " Signature "])(
    "renders the badge without a runtime error for %s",
    (level) => {
      expect(() => render(<LevelBadge level={level} />)).not.toThrow();
    },
  );
});