/** Formatacao de duracao das aulas (mm:ss ou hh:mm:ss). */

export function formatLessonDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** Converte "12:30", "1:02:05" ou "90" em segundos. Retorna null quando invalido ou vazio. */
export function parseLessonDuration(value: string): number | null {
  const input = value.trim();
  if (!input) return null;
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(input)) return null;

  const parts = input.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length > 1 && parts.slice(1).some((part) => part > 59)) return null;

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function lessonCountLabel(count: number): string {
  return count === 1 ? "1 aula" : `${count} aulas`;
}
