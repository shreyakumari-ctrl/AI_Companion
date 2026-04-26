const BRAND_PATTERN = /\bClidy\b/gi;

export function normalizeBrandText(text: string) {
  return text
    .replace(BRAND_PATTERN, "Clizel")
    .replace(/([!?;,:])(?=[^\s])/g, "$1 ")
    .replace(/(\p{Extended_Pictographic})(?=[A-Za-z])/gu, "$1 ");
}
