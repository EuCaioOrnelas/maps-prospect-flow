import { describe, expect, it } from "vitest";
import { formatLessonDuration, lessonCountLabel, parseLessonDuration } from "./format";

describe("parseLessonDuration", () => {
  it("converte mm:ss em segundos", () => {
    expect(parseLessonDuration("12:30")).toBe(750);
  });

  it("converte hh:mm:ss em segundos", () => {
    expect(parseLessonDuration("1:02:05")).toBe(3725);
  });

  it("aceita apenas segundos e campo vazio", () => {
    expect(parseLessonDuration("90")).toBe(90);
    expect(parseLessonDuration("")).toBeNull();
    expect(parseLessonDuration("   ")).toBeNull();
  });

  it("rejeita formatos invalidos", () => {
    expect(parseLessonDuration("12:75")).toBeNull();
    expect(parseLessonDuration("abc")).toBeNull();
    expect(parseLessonDuration("1:2:3:4")).toBeNull();
    expect(parseLessonDuration("-10")).toBeNull();
  });
});

describe("formatLessonDuration", () => {
  it("formata minutos e horas", () => {
    expect(formatLessonDuration(750)).toBe("12:30");
    expect(formatLessonDuration(3725)).toBe("1:02:05");
    expect(formatLessonDuration(0)).toBe("0:00");
  });

  it("devolve null quando a duracao nao foi cadastrada", () => {
    expect(formatLessonDuration(null)).toBeNull();
    expect(formatLessonDuration(undefined)).toBeNull();
    expect(formatLessonDuration(-5)).toBeNull();
  });
});

describe("lessonCountLabel", () => {
  it("usa singular e plural", () => {
    expect(lessonCountLabel(1)).toBe("1 aula");
    expect(lessonCountLabel(0)).toBe("0 aulas");
    expect(lessonCountLabel(8)).toBe("8 aulas");
  });
});
