import { describe, it, expect } from "vitest";
import { isPasswordAcceptable, translateAuthError, PASSWORD_REJECTED_MESSAGE } from "./passwordPolicy";

describe("passwordPolicy", () => {
  it("recusa sequências e palavras comuns", () => {
    expect(isPasswordAcceptable("Senha123!")).toBe(false);
    expect(isPasswordAcceptable("Abcd!789x")).toBe(false);
  });
  it("recusa senha com o nome", () => {
    expect(isPasswordAcceptable("Nikolay#937", { name: "Nikolay Bazzana" })).toBe(false);
  });
  it("aceita senha pessoal", () => {
    expect(isPasswordAcceptable("Sol#Verde942")).toBe(true);
  });
  it("traduz senha fraca do servidor", () => {
    expect(translateAuthError("Password is known to be weak and easy to guess, please choose a different one.")).toBe(PASSWORD_REJECTED_MESSAGE);
  });
});
