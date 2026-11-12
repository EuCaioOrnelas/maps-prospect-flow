import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canResumeSession, firstContactOnly } from "./sessionPolicy.ts";

for (const status of ["paused", "opted_out", "handoff", "won", "abandoned"]) {
  Deno.test(`SDR must not reopen ${status} sessions`, () => {
    assertEquals(canResumeSession({ status }, "recuperacao"), false);
  });
}
Deno.test("recovery can reopen closed sessions without explicit refusal", () => {
  assertEquals(canResumeSession({ status: "closed" }, "recuperacao"), true);
  assertEquals(canResumeSession({ status: "closed", closed_reason: "explicit_rejection" }, "recuperacao"), false);
  assertEquals(canResumeSession({ status: "closed" }, "reuniao"), false);
});
Deno.test("all inbound takes precedence over first-contact trigger", () => {
  assertEquals(firstContactOnly(["inbound_all", "first_only"], 1), false);
  assertEquals(firstContactOnly(["first_only"], 1), true);
  assertEquals(firstContactOnly(["first_only"], 0), false);
});