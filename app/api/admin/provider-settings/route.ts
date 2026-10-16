import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, isSameOrigin } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { isEncryptionKeyConfigured, providerConfigStatus, readProviderRow, sealProviderSecret } from "@/lib/integrations/provider-config";

const configSchema = z.object({
  section: z.enum(["meta", "openai"]),
  metaAppId: z.string().trim().max(100).optional(),
  metaAppSecret: z.string().trim().max(2048).optional(),
  openAiApiKey: z.string().trim().max(4096).optional(),
  openAiModel: z.string().trim().min(1).max(100).optional(),
  clearCredentials: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  try {
    return NextResponse.json(providerConfigStatus(await readProviderRow()));
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar as configurações de provedores." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  if (!await getAdminSession()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  const parsed = configSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confira os campos informados." }, { status: 400 });
  const input = parsed.data;
  const client = createServiceSupabaseClient();
  const previous = await readProviderRow();
  const update: Record<string, unknown> = { id: 1 };

  if (input.section === "meta") {
    if (input.clearCredentials) {
      update.meta_app_id = null;
      update.meta_app_secret_ciphertext = null;
      update.meta_app_secret_iv = null;
      update.meta_app_secret_tag = null;
    } else {
      const appId = input.metaAppId ?? previous.meta_app_id ?? "";
      const secret = input.metaAppSecret || previous.legacyMetaSecret;
      const savedCipher = previous.meta_app_secret_ciphertext;
      if (appId && !secret && !savedCipher) return NextResponse.json({ error: "Informe o App ID e o App Secret da Meta." }, { status: 400 });
      if ((input.metaAppSecret || appId) && !isEncryptionKeyConfigured()) return NextResponse.json({ error: "A chave de proteção do servidor ainda não foi configurada. O responsável técnico precisa defini-la uma única vez no ambiente do site." }, { status: 503 });
      update.meta_app_id = appId || null;
      if (input.metaAppSecret) {
        const sealed = sealProviderSecret(input.metaAppSecret);
        update.meta_app_secret_ciphertext = sealed.ciphertext;
        update.meta_app_secret_iv = sealed.iv;
        update.meta_app_secret_tag = sealed.authTag;
      }
    }
  } else {
    if (input.clearCredentials) {
      update.openai_api_key_ciphertext = null;
      update.openai_api_key_iv = null;
      update.openai_api_key_tag = null;
    } else if (input.openAiApiKey) {
      if (!isEncryptionKeyConfigured()) return NextResponse.json({ error: "A chave de proteção do servidor ainda não foi configurada. O responsável técnico precisa defini-la uma única vez no ambiente do site." }, { status: 503 });
      const sealed = sealProviderSecret(input.openAiApiKey);
      update.openai_api_key_ciphertext = sealed.ciphertext;
      update.openai_api_key_iv = sealed.iv;
      update.openai_api_key_tag = sealed.authTag;
    }
    if (input.openAiModel) update.openai_model = input.openAiModel;
  }

  const { error } = await client.from("provider_config").upsert(update, { onConflict: "id" });
  if (error) return NextResponse.json({ error: "Não foi possível salvar. Confirme se a migration do banco foi aplicada." }, { status: 500 });
  return NextResponse.json({ ok: true, ...providerConfigStatus(await readProviderRow()) });
}
