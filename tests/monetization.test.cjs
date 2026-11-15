const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { createRequire } = require("node:module");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the real route and validation, replacing only external auth/storage.
function load(relative, mocks = {}) {
  const filename = resolve(__dirname, "..", relative);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = createRequire(filename);
  vm.runInNewContext(output, {
    module, exports: module.exports,
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : localRequire(id),
  }, { filename });
  return module.exports;
}

const model = load("lib/monetization.ts");

function route({ admin = true, origin = true, backend = true, dbError = false, throws = false } = {}) {
  const writes = [];
  const { PATCH } = load("app/api/admin/monetization/route.ts", {
    "next/server": require("next/server"),
    "@/lib/admin-auth": { getAdminSession: async () => admin ? { id: "admin" } : null, isSameOrigin: () => origin },
    "@/lib/config": { isAdminBackendConfigured: () => backend },
    "@/lib/monetization": model,
    "@/lib/supabase/server": { createServiceSupabaseClient: () => ({ from: (table) => ({
      upsert: async (data) => {
        if (throws) throw new Error("network unavailable");
        writes.push({ table, data });
        return { error: dbError ? { code: "42P01" } : null };
      },
    }) }) },
  });
  return { writes, patch: (body) => PATCH(new Request("https://portal.example/api/admin/monetization", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  })) };
}

test("zone IDs stay strings; scripts, zero, negatives and unknown fields are rejected", () => {
  for (const zoneId of ["", "123", "12345678901234567890"]) {
    assert.equal(model.monetizationSchema.safeParse({ enabled: false, zoneId }).success, true);
  }
  for (const zoneId of ["0", "-1", "1.2", "<script>", "123456789012345678901", 12194090]) {
    assert.equal(model.monetizationSchema.safeParse({ enabled: false, zoneId }).success, false);
  }
  assert.equal(model.monetizationSchema.safeParse({ enabled: false, zoneId: "123", script: "bad" }).success, false);
});

test("cross-origin and unauthenticated writes do not reach storage", async () => {
  for (const [options, expected] of [[{ origin: false }, 403], [{ admin: false }, 401]]) {
    const handler = route(options);
    assert.equal((await handler.patch({ enabled: false, zoneId: "123" })).status, expected);
    assert.equal(handler.writes.length, 0);
  }
});

test("activation is blocked even with the provided zone ID", async () => {
  const handler = route();
  const response = await handler.patch({ enabled: true, zoneId: "12194090" });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, model.MONETAG_ACTIVATION_BLOCK);
  assert.equal(handler.writes.length, 0);
});

test("saving or clearing a zone always persists ads disabled", async () => {
  const handler = route();
  for (const zoneId of ["123", ""]) {
    const response = await handler.patch({ enabled: false, zoneId });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).enabled, false);
    const write = handler.writes.at(-1);
    assert.equal(write.table, "monetization_config");
    assert.equal(write.data.enabled, false);
    assert.equal(write.data.format, "in_page_push");
    assert.equal(write.data.zone_id, zoneId || null);
  }
});

test("invalid input and unavailable storage never report success", async () => {
  assert.equal((await route().patch({ enabled: false, zoneId: "abc" })).status, 400);
  for (const options of [{ backend: false }, { dbError: true }, { throws: true }]) {
    assert.equal((await route(options).patch({ enabled: false, zoneId: "123" })).status, 503);
  }
});
