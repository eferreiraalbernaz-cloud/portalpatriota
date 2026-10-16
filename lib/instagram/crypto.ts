import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.APP_SECRETS_ENCRYPTION_KEY || process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("APP_SECRETS_ENCRYPTION_KEY não configurada no servidor.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("APP_SECRETS_ENCRYPTION_KEY deve ser base64 de 32 bytes.");
  return key;
}

export function encryptMetaToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

export function decryptMetaToken(value: { token_ciphertext: string; token_iv: string; token_auth_tag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.token_iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.token_auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.token_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
