/** Paleta viva por produto (tons que conversam com o verde Wiize). */
export const CARD_THEMES: Record<string, string> = {
  prospeccao: "from-emerald-500/35 via-teal-400/18 to-lime-400/30",
  sdr: "from-teal-400/35 via-emerald-400/18 to-cyan-400/30",
  agenda: "from-lime-400/35 via-emerald-400/18 to-teal-400/30",
  engajamento: "from-emerald-400/35 via-lime-400/15 to-emerald-500/30",
  automacao: "from-cyan-400/20 via-teal-400/15 to-emerald-400/25",
  contratos: "from-emerald-500/35 via-emerald-300/18 to-lime-300/30",
  formularios: "from-teal-400/30 via-lime-300/20 to-emerald-500/30",
};

export const DEFAULT_CARD_THEME = "from-primary/20 via-primary/8 to-emerald-400/15";

export const getCardTheme = (key?: string) =>
  (key && CARD_THEMES[key]) || DEFAULT_CARD_THEME;
