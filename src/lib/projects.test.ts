import { describe, expect, it } from "vitest";
import { computeProgress, isProjectOverdue, isTaskOverdue, validateProjectForm } from "./projects";

describe("regras de projetos", () => {
  it("sem tarefas não mostra 0%, mostra vazio", () => {
    expect(computeProgress(0, 0)).toBeNull();
  });
  it("progresso usa concluídas sobre total não cancelado", () => {
    expect(computeProgress(1, 4)).toBe(25);
    expect(computeProgress(3, 3)).toBe(100);
  });
  it("projeto com prazo passado e não concluído está atrasado", () => {
    expect(isProjectOverdue({ status: "in_progress", due_date: "2026-10-01", archived_at: null }, "2026-10-28")).toBe(true);
  });
  it("projeto concluído, cancelado ou arquivado nunca está atrasado", () => {
    expect(isProjectOverdue({ status: "completed", due_date: "2026-10-01", archived_at: null }, "2026-10-28")).toBe(false);
    expect(isProjectOverdue({ status: "cancelled", due_date: "2026-10-01", archived_at: null }, "2026-10-28")).toBe(false);
    expect(isProjectOverdue({ status: "planning", due_date: "2026-10-01", archived_at: "2026-10-02" }, "2026-10-28")).toBe(false);
  });
  it("prazo de hoje ainda não está atrasado", () => {
    expect(isProjectOverdue({ status: "planning", due_date: "2026-10-28", archived_at: null }, "2026-10-28")).toBe(false);
  });
  it("tarefa concluída não fica atrasada", () => {
    expect(isTaskOverdue({ status: "done", due_date: "2026-10-01" }, "2026-10-28")).toBe(false);
    expect(isTaskOverdue({ status: "todo", due_date: "2026-10-01" }, "2026-10-28")).toBe(true);
  });
  it("nome é obrigatório e prazo final não pode ser antes do início", () => {
    expect(validateProjectForm({ name: "  " }).name).toBeDefined();
    expect(validateProjectForm({ name: "Site", start_date: "2026-10-10", due_date: "2026-10-05" }).due_date).toBeDefined();
    expect(validateProjectForm({ name: "Site", start_date: "2026-10-10", due_date: "2026-10-10" })).toEqual({});
  });
});
