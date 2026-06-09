export type UserMonitoringRange = "today" | "7d" | "30d" | "90d" | "custom";

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function rangeToDates(range: UserMonitoringRange, customFrom?: string, customTo?: string) {
  const to = new Date();
  const from = new Date();

  if (range === "custom" && customFrom) {
    const start = new Date(`${customFrom}T00:00:00`);
    const end = customTo ? new Date(`${customTo}T23:59:59`) : to;
    return { from: start, to: end };
  }

  if (range === "today") from.setHours(0, 0, 0, 0);
  else if (range === "7d") from.setDate(from.getDate() - 7);
  else if (range === "30d") from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 90);

  return { from, to };
}

export function fmtDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => esc(row[h])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}