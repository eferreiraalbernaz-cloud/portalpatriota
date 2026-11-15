import { z } from "zod";

// No loader is approved yet. A zone number cannot establish the ad format.
export const MONETAG_ACTIVATION_BLOCK = "Ativação bloqueada: obtenha e valide a tag completa de uma zona In-Page Push (Banner) no Monetag. O Service Worker recebido não é uma tag In-Page Push.";

export const monetizationSchema = z.object({
  enabled: z.boolean(),
  zoneId: z.string().trim().max(20).regex(/^(?:[1-9][0-9]{0,19})?$/),
}).strict();

export type MonetizationStatus = {
  enabled: false;
  zoneId: string;
  siteOrigin: string;
  storageReady: boolean;
  error: string | null;
};
