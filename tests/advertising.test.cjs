const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const moduleUnderTest = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(require.resolve("../lib/advertising.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports, URL });
const { parseAdConsent, canLoadAdvertising, MONETAG_ZONE, MONETAG_SCRIPT_URL } = moduleUnderTest.exports;

test("missing, malformed, old or expired consent never authorizes advertising", () => {
  for (const raw of [null, "bad", "{}", "null", JSON.stringify({ version: 1, accepted: "true", expires: 2000 }),
    JSON.stringify({ version: 0, accepted: true, expires: 2000 }), JSON.stringify({ version: 1, accepted: true, expires: 1000 })]) {
    assert.equal(parseAdConsent(raw, 1000), null);
  }
});

test("both explicit acceptance and refusal are retained until expiry", () => {
  for (const accepted of [true, false]) {
    const raw = JSON.stringify({ version: 1, accepted, expires: 2000 });
    assert.equal(parseAdConsent(raw, 1000).accepted, accepted);
    assert.equal(parseAdConsent(raw, 2000), null);
  }
});

test("advertising is limited to the configured origin and excludes private routes", () => {
  const origin = "https://portalpatriotabr.pages.dev";
  for (const path of ["/", "/politica", "/politica/noticia", "/busca?q=brasil", "/privacidade"]) {
    assert.equal(canLoadAdvertising(origin + path, origin), true);
  }
  for (const path of ["/admin", "/admin/login", "/admin/configuracoes", "/admin/recuperar-senha", "/admin/definir-senha", "/api/auth/login", "/auth/callback", "/login", "/recuperar-senha"]) {
    assert.equal(canLoadAdvertising(origin + path, origin), false);
  }
  for (const url of ["https://other.example/", "http://portalpatriotabr.pages.dev/", "https://portalpatriotabr-app.example.workers.dev/", "invalid"]) {
    assert.equal(canLoadAdvertising(url, origin), false);
  }
  assert.equal(canLoadAdvertising(origin, "invalid"), false);
});

test("only the supplied In-Page Push zone and script are configured", () => {
  assert.equal(MONETAG_ZONE, "12271754");
  assert.equal(MONETAG_SCRIPT_URL, "https://nap5k.com/tag.min.js");
});
