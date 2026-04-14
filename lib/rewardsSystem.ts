// ─── Tiers ────────────────────────────────────────────────────────────────────

export type TierName =
  | "Sin categoría"
  | "Bronce"
  | "Plata"
  | "Oro"
  | "Platino"
  | "Diamante"
  | "Legendario";

export interface Tier {
  name: TierName;
  min: number;
  max: number;
  /** Color principal del tier (borde, badge, barra XP) */
  color: string;
  /** Color de fondo suave para chips/pills */
  bgColor: string;
  /** Color de texto sobre bgColor */
  textColor: string;
}

export const TIERS: Tier[] = [
  {
    name: "Bronce",
    min: 5,
    max: 14,
    color: "#CD7F32",
    bgColor: "#FAECE7",
    textColor: "#7A3B10",
  },
  {
    name: "Plata",
    min: 15,
    max: 24,
    color: "#9E9E9E",
    bgColor: "#F1EFE8",
    textColor: "#4A4A4A",
  },
  {
    name: "Oro",
    min: 25,
    max: 34,
    color: "#D4A017",
    bgColor: "#FAEEDA",
    textColor: "#7A5800",
  },
  {
    name: "Platino",
    min: 35,
    max: 44,
    color: "#1D9E75",
    bgColor: "#E1F5EE",
    textColor: "#08503F",
  },
  {
    name: "Diamante",
    min: 45,
    max: 49,
    color: "#378ADD",
    bgColor: "#E6F1FB",
    textColor: "#0C447C",
  },
  {
    name: "Legendario",
    min: 50,
    max: 50,
    color: "#D4537E",
    bgColor: "#FBEAF0",
    textColor: "#72243E",
  },
];

export function getUserTier(level: number): Tier | null {
  return TIERS.find((t) => level >= t.min && level <= t.max) ?? null;
}

// ─── Tipos de recompensa ──────────────────────────────────────────────────────

export type RewardType = "frame" | "badge" | "nameColor";

export interface FrameReward {
  id: string;
  type: "frame";
  level: number;
  name: string;
  animated: boolean;
  /** Color del borde estático (solo si animated === false) */
  borderColor?: string;
  /** Array de colores para la animación de gradiente rotante (solo si animated === true) */
  animationColors?: string[];
  /** Grosor del borde en px */
  borderWidth: number;
}

export interface BadgeReward {
  id: string;
  type: "badge";
  level: number;
  name: string;
  /** Emoji que sustituye al trofeo placeholder */
  emoji: string;
}

export interface NameColorReward {
  id: string;
  type: "nameColor";
  level: number;
  name: string;
  /** Color sólido del nombre */
  color: string;
  /** Etiqueta del color para mostrarlo en el selector */
  label: string;
}

export type Reward = FrameReward | BadgeReward | NameColorReward;

// ─── Catálogo de recompensas ──────────────────────────────────────────────────

export const REWARDS: Reward[] = [
  // ── Marcos ────────────────────────────────────────────────────────────────
  {
    id: "frame_bronze",
    type: "frame",
    level: 5,
    name: "Marco bronce",
    animated: false,
    borderColor: "#CD7F32",
    borderWidth: 4,
  },
  {
    id: "frame_silver",
    type: "frame",
    level: 15,
    name: "Marco plata",
    animated: false,
    borderColor: "#9E9E9E",
    borderWidth: 4,
  },
  {
    id: "frame_gold",
    type: "frame",
    level: 25,
    name: "Marco dorado",
    animated: true,
    animationColors: ["#D4A017", "#F5C518", "#FFE066", "#D4A017"],
    borderWidth: 5,
  },
  {
    id: "frame_platinum",
    type: "frame",
    level: 35,
    name: "Marco platino",
    animated: true,
    animationColors: ["#1D9E75", "#5DCAA5", "#9FE1CB", "#1D9E75"],
    borderWidth: 5,
  },
  {
    id: "frame_diamond",
    type: "frame",
    level: 45,
    name: "Marco diamante",
    animated: true,
    animationColors: ["#378ADD", "#85B7EB", "#B5D4F4", "#378ADD"],
    borderWidth: 6,
  },

  // ── Badges ────────────────────────────────────────────────────────────────
  // Nota: por debajo de nivel 5 se usa el trofeo 🏆 por defecto (no es una recompensa desbloqueada,
  // es el fallback del placeholder original).
  {
    id: "badge_quill",
    type: "badge",
    level: 10,
    name: "Pluma lectora",
    emoji: "🖊️",
  },
  {
    id: "badge_flame",
    type: "badge",
    level: 30,
    name: "Llama lectora",
    emoji: "🔥",
  },
  {
    id: "badge_crown",
    type: "badge",
    level: 50,
    name: "Corona legendaria",
    emoji: "👑",
  },

  // ── Colores de nombre ──────────────────────────────────────────────────────
  {
    id: "color_silver",
    type: "nameColor",
    level: 20,
    name: "Plata",
    color: "#7A7A7A",
    label: "Gris plata",
  },
  {
    id: "color_gold",
    type: "nameColor",
    level: 25,
    name: "Dorado",
    color: "#D4A017",
    label: "Dorado",
  },
  {
    id: "color_platinum",
    type: "nameColor",
    level: 40,
    name: "Platino",
    color: "#1D9E75",
    label: "Verde platino",
  },
  {
    id: "color_diamond",
    type: "nameColor",
    level: 45,
    name: "Diamante",
    color: "#378ADD",
    label: "Azul diamante",
  },
  {
    id: "color_legendary",
    type: "nameColor",
    level: 50,
    name: "Legendario",
    color: "#D4537E",
    label: "Rosa legendario",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Todas las recompensas desbloqueadas para un nivel dado */
export function getUnlockedRewards(level: number): Reward[] {
  return REWARDS.filter((r) => level >= r.level);
}

/** Solo los marcos desbloqueados */
export function getUnlockedFrames(level: number): FrameReward[] {
  return REWARDS.filter(
    (r): r is FrameReward => r.type === "frame" && level >= r.level,
  );
}

/** Solo los colores de nombre desbloqueados */
export function getUnlockedNameColors(level: number): NameColorReward[] {
  return REWARDS.filter(
    (r): r is NameColorReward => r.type === "nameColor" && level >= r.level,
  );
}

/**
 * Badge activo según el nivel.
 * Devuelve el emoji del badge más alto desbloqueado,
 * o "🏆" como fallback (el placeholder original).
 */
export function getActiveBadgeEmoji(level: number): string {
  const badges = REWARDS.filter(
    (r): r is BadgeReward => r.type === "badge" && level >= r.level,
  );
  return badges.at(-1)?.emoji ?? "🏆";
}

/**
 * Color por defecto del nombre según el tier activo.
 * Se usa cuando el usuario no ha elegido ningún color activo.
 */
export const DEFAULT_NAME_COLOR = "#3e2723";

/**
 * Busca un FrameReward por id.
 */
export function getFrameById(id: string): FrameReward | undefined {
  return REWARDS.find(
    (r): r is FrameReward => r.type === "frame" && r.id === id,
  );
}

/**
 * Busca un NameColorReward por id.
 */
export function getNameColorById(id: string): NameColorReward | undefined {
  return REWARDS.find(
    (r): r is NameColorReward => r.type === "nameColor" && r.id === id,
  );
}
