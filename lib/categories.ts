export const CATEGORIES = [
  { name: "POLÍTICA", slug: "politica", label: "Política" },
  { name: "BRASIL", slug: "brasil", label: "Brasil" },
  { name: "SEGURANÇA", slug: "seguranca", label: "Segurança" },
  { name: "ESPORTES", slug: "esportes", label: "Esportes" },
  { name: "SAÚDE", slug: "saude", label: "Saúde" },
  { name: "RIBEIRA DO POMBAL", slug: "ribeira-do-pombal", label: "Ribeira do Pombal" },
  { name: "BAHIA", slug: "bahia", label: "Bahia" },
] as const;

export const CATEGORY_NAMES = ["POLÍTICA", "BRASIL", "SEGURANÇA", "ESPORTES", "SAÚDE", "RIBEIRA DO POMBAL", "BAHIA"] as const;
export type CategoryName = (typeof CATEGORIES)[number]["name"];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function categoryByName(name: string) {
  return CATEGORIES.find((category) => category.name === name);
}
