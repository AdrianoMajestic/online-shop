/**
 * Russian-to-Latin transliteration table
 */
const RU_TO_EN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/**
 * Generates a clean URL slug from string (supporting Russian and Latin characters)
 */
export function slugify(text: string): string {
  if (!text) return "";

  const transliterated = text
    .toLowerCase()
    .split("")
    .map((char) => (char in RU_TO_EN ? RU_TO_EN[char] : char))
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
