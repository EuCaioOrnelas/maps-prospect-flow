import { supabase } from "@/integrations/supabase/client";
import type {
  LearningLesson,
  LearningLessonInput,
  LearningModule,
  LearningModuleInput,
  LearningModuleWithLessons,
} from "@/types/aprendizado";

// As tabelas da central sao tipadas localmente em src/types/aprendizado.
const db = supabase as any;

const LESSON_COLUMNS =
  "id, module_id, slug, title, description, youtube_url, youtube_video_id, thumbnail_path, duration_seconds, display_order, is_published, created_at, updated_at";
const MODULE_COLUMNS = "id, slug, title, description, cover_path, display_order, is_published, created_at, updated_at";

const byOrder = <T extends { display_order: number; created_at: string }>(a: T, b: T) =>
  a.display_order - b.display_order || a.created_at.localeCompare(b.created_at);

function normalizeModule(row: any): LearningModuleWithLessons {
  const { learning_lessons, ...module } = row ?? {};
  return {
    ...(module as LearningModule),
    lessons: [...((learning_lessons ?? []) as LearningLesson[])].sort(byOrder),
  };
}

function uniqueMessage(error: any, fallback: string) {
  if (error?.code === "23505") return "Esse endereco (slug) ja esta em uso. Escolha outro.";
  return error?.message || fallback;
}

/** Modulos publicados com suas aulas publicadas, para visitantes e usuarios logados. */
export async function listPublishedModules(): Promise<LearningModuleWithLessons[]> {
  const { data, error } = await db
    .from("learning_modules")
    .select(`${MODULE_COLUMNS}, learning_lessons(${LESSON_COLUMNS})`)
    .eq("is_published", true)
    .eq("learning_lessons.is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeModule).sort(byOrder);
}

export async function getPublishedModule(slug: string): Promise<LearningModuleWithLessons | null> {
  const { data, error } = await db
    .from("learning_modules")
    .select(`${MODULE_COLUMNS}, learning_lessons(${LESSON_COLUMNS})`)
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("learning_lessons.is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeModule(data) : null;
}

/** Visao administrativa: inclui rascunhos e aulas desativadas. */
export async function adminListModules(): Promise<LearningModuleWithLessons[]> {
  const { data, error } = await db
    .from("learning_modules")
    .select(`${MODULE_COLUMNS}, learning_lessons(${LESSON_COLUMNS})`)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeModule).sort(byOrder);
}

export async function createModule(input: LearningModuleInput): Promise<void> {
  const { error } = await db.from("learning_modules").insert(input);
  if (error) throw new Error(uniqueMessage(error, "Nao foi possivel criar o modulo."));
}

export async function updateModule(id: string, input: Partial<LearningModuleInput>): Promise<void> {
  const { error } = await db.from("learning_modules").update(input).eq("id", id);
  if (error) throw new Error(uniqueMessage(error, "Nao foi possivel salvar o modulo."));
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await db.from("learning_modules").delete().eq("id", id);
  if (error) throw new Error(error.message || "Nao foi possivel excluir o modulo.");
}

export async function createLesson(moduleId: string, input: LearningLessonInput): Promise<void> {
  const { error } = await db.from("learning_lessons").insert({ ...input, module_id: moduleId });
  if (error) throw new Error(uniqueMessage(error, "Nao foi possivel criar a aula."));
}

export async function updateLesson(id: string, input: Partial<LearningLessonInput>): Promise<void> {
  const { error } = await db.from("learning_lessons").update(input).eq("id", id);
  if (error) throw new Error(uniqueMessage(error, "Nao foi possivel salvar a aula."));
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await db.from("learning_lessons").delete().eq("id", id);
  if (error) throw new Error(error.message || "Nao foi possivel excluir a aula.");
}

async function persistOrder(table: "learning_modules" | "learning_lessons", orderedIds: string[]) {
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await db.from(table).update({ display_order: index }).eq("id", id);
    if (error) throw new Error(error.message || "Nao foi possivel reordenar.");
  }
}

/** Troca o item de posicao com o vizinho e grava a nova ordem sem editar codigo. */
export async function moveModule(modules: LearningModule[], id: string, direction: 1 | -1): Promise<void> {
  const ordered = [...modules].sort(byOrder);
  const index = ordered.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  await persistOrder("learning_modules", ordered.map((item) => item.id));
}

export async function moveLesson(lessons: LearningLesson[], id: string, direction: 1 | -1): Promise<void> {
  const ordered = [...lessons].sort(byOrder);
  const index = ordered.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  await persistOrder("learning_lessons", ordered.map((item) => item.id));
}
