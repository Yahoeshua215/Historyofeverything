// The rabbit-hole categories — the lenses a subject can be explored through, and
// the daily-discovery card set (History_Lens_Curiosity_Engine_Opportunity.md
// "Follow the rabbit hole" / "Curiosity Trails").

export interface Category {
  /** Stable key sent to the API as the lens. */
  key: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { key: "history", label: "History", emoji: "📜" },
  { key: "science", label: "Science", emoji: "🔬" },
  { key: "people", label: "People", emoji: "👤" },
  { key: "geography", label: "Geography", emoji: "🌎" },
  { key: "economics", label: "Economics", emoji: "💰" },
];

const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key));

export function isCategoryKey(value: unknown): value is string {
  return typeof value === "string" && CATEGORY_KEYS.has(value);
}
