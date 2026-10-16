export const CATEGORIES = [
  { name: "POLÍTICA", slug: "politica", label: "Política" },
  { name: "BRASIL", slug: "brasil", label: "Brasil" },
  { name: "SEGURANÇA", slug: "seguranca", label: "Segurança" },
  { name: "ESPORTES", slug: "esportes", label: "Esportes" },
  { name: "SAÚDE", slug: "saude", label: "Saúde" },
] as const;

export const CATEGORY_NAMES = ["POLÍTICA", "BRASIL", "SEGURANÇA", "ESPORTES", "SAÚDE"] as const;
export type CategoryName = (typeof CATEGORIES)[number]["name"];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function categoryByName(name: string) {
  return CATEGORIES.find((category) => category.name === name);
}
