import type { CategoryName } from "@/lib/categories";

export type ArticleStatus = "draft" | "pending" | "published" | "scheduled" | "archived";
export type WritingMode = "short" | "medium" | "long" | "off";

export type ArticleSource = {
  title: string;
  url: string;
  publisher?: string;
  published_at?: string | null;
  source_type?: string;
};

export type Article = {
  id: string;
  slug: string;
  category: CategoryName;
  title: string;
  subtitle: string | null;
  body: string;
  image_url: string | null;
  status: ArticleStatus;
  highlighted: boolean;
  needs_review: boolean;
  review_reason: string | null;
  sources: ArticleSource[];
  instagram_url: string | null;
  instagram_media_id: string | null;
  original_caption: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PortalSettings = {
  site_name: string;
  logo_url: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  albr_contact_url: string;
  institutional_text: string;
  writing_mode: WritingMode;
  auto_publish: boolean;
  sync_paused: boolean;
  updated_at?: string;
};

export const DEFAULT_SETTINGS: PortalSettings = {
  site_name: "PORTAL PATRIOTA BR",
  logo_url: "/brand/portal-patriota-br.png",
  instagram_url: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/portalpatriota_br/",
  facebook_url: "",
  youtube_url: "",
  albr_contact_url: "",
  institutional_text: "Informação com responsabilidade para acompanhar o Brasil.",
  writing_mode: "medium",
  auto_publish: false,
  sync_paused: true,
};

export type IntegrationStatus = {
  connected: boolean;
  username?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  token_expires_at?: string | null;
};

export type ProcessingLog = {
  id: string;
  stage: string;
  status: "success" | "warning" | "failed";
  message: string;
  created_at: string;
};
