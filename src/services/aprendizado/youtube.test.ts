import { describe, expect, it } from "vitest";
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeVideoId", () => {
  it("extrai de watch?v= com parametros extras", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}&t=42s`)).toBe(ID);
  });

  it("extrai de link curto youtu.be com tempo", () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${ID}?t=10`)).toBe(ID);
  });

  it("extrai de embed, shorts e live", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${ID}?feature=share`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
  });

  it("aceita link sem protocolo e dominio movel", () => {
    expect(extractYouTubeVideoId(`youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube-nocookie.com/embed/${ID}`)).toBe(ID);
  });

  it("aceita o ID puro de 11 caracteres", () => {
    expect(extractYouTubeVideoId(ID)).toBe(ID);
  });

  it("rejeita dominios externos e URLs invalidas", () => {
    expect(extractYouTubeVideoId(`https://meusite.com/watch?v=${ID}`)).toBeNull();
    expect(extractYouTubeVideoId(`https://youtube.com.evil.com/watch?v=${ID}`)).toBeNull();
    expect(extractYouTubeVideoId("nao e um link")).toBeNull();
    expect(extractYouTubeVideoId("")).toBeNull();
  });

  it("rejeita IDs com tamanho errado", () => {
    expect(extractYouTubeVideoId("https://youtu.be/curto")).toBeNull();
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=abcdef")).toBeNull();
  });
});

describe("getYouTubeEmbedUrl", () => {
  it("usa o dominio nocookie", () => {
    expect(getYouTubeEmbedUrl(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
  });
});
