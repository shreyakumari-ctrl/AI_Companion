const BRAND_PATTERN = /\bClidy\b/gi;

export function normalizeBrandText(text: string) {
  return text.replace(BRAND_PATTERN, "Clizel");
}
