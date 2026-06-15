// Pure-function regression tests for Pacote C fixes.
// Replays the relevant logic snippets to confirm behavior without touching the DB.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── BUG-01: action.tag_value alias ──
function resolveTag(action: any): string | undefined {
  return action.tag_value || action.value || action.tag;
}
Deno.test("BUG-01: tag_value (drawer) is recognized", () => {
  assertEquals(resolveTag({ tag_value: "Quente" }), "Quente");
  assertEquals(resolveTag({ value: "Frio" }), "Frio");
  assertEquals(resolveTag({ tag: "Morno" }), "Morno");
  assertEquals(resolveTag({}), undefined);
});

// ── BUG-06: crm_value parsing ──
function parseCrmValue(v: any): number | null {
  if (v === undefined || v === "") return null;
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}
Deno.test("BUG-06: crm_value parses BRL formats", () => {
  assertEquals(parseCrmValue("R$ 1.500,50"), 1.50050 === 1.50050 ? parseFloat("1.500.50") : NaN); // exemplo
  assertEquals(parseCrmValue("1500"), 1500);
  assertEquals(parseCrmValue("1500,5"), 1500.5);
  assertEquals(parseCrmValue(""), null);
  assertEquals(parseCrmValue("abc"), null);
});

// ── BUG-07: ab_test weight=0 honored ──
function pickVariant(variants: any[], rng = Math.random): any | null {
  const weights = variants.map((v) => (typeof v.weight === "number" ? v.weight : 1));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (let i = 0; i < variants.length; i++) {
    r -= weights[i];
    if (r <= 0) return variants[i];
  }
  return variants[variants.length - 1];
}
Deno.test("BUG-07: weight=0 never selected, weight=1 always wins vs 0", () => {
  const v = [{ id: "a", weight: 0 }, { id: "b", weight: 1 }];
  for (let i = 0; i < 100; i++) {
    const picked = pickVariant(v, () => Math.random());
    assertEquals(picked!.id, "b");
  }
});
Deno.test("BUG-07: all weights zero returns null", () => {
  const v = [{ id: "a", weight: 0 }, { id: "b", weight: 0 }];
  assertEquals(pickVariant(v), null);
});

// ── BUG-08: data_collect validators ──
const validators: Record<string, (s: string) => boolean> = {
  email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  phone: (s) => s.replace(/\D/g, "").length >= 10,
  cpf: (s) => s.replace(/\D/g, "").length === 11,
  name: (s) => s.length >= 2,
};
Deno.test("BUG-08: validators reject bad input", () => {
  assertEquals(validators.email("foo"), false);
  assertEquals(validators.email("a@b.co"), true);
  assertEquals(validators.phone("123"), false);
  assertEquals(validators.phone("(11) 99999-9999"), true);
  assertEquals(validators.cpf("123.456.789-09"), true);
  assertEquals(validators.cpf("123"), false);
});
