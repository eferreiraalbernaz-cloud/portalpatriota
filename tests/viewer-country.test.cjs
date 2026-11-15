const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

const moduleUnderTest = { exports: {} };
vm.runInNewContext(readFileSync(require.resolve("../cloudflare/viewer-country.js"), "utf8")
  .replace("export function withViewerCountry", "module.exports.withViewerCountry = function withViewerCountry"),
{ module: moduleUnderTest, Headers, Request });
const { withViewerCountry } = moduleUnderTest.exports;

test("caller cannot spoof the country used by advertising policy", () => {
  for (const country of [undefined, "XX", "PT", "US", "BR", "invalid"]) {
    const request = new Request("https://portalpatriotabr.pages.dev/", { headers: { "x-portal-viewer-country": "BR" } });
    if (country !== undefined) Object.defineProperty(request, "cf", { value: { country } });
    const forwarded = withViewerCountry(request);
    assert.equal(forwarded.headers.get("x-portal-viewer-country"), /^[A-Z]{2}$/.test(country || "") ? country : "XX");
  }
});

test("request forwarding preserves method, cookies, authorization and body", async () => {
  const request = new Request("https://portalpatriotabr.pages.dev/api/admin/settings", {
    method: "PATCH", headers: { cookie: "session=test", authorization: "Bearer test", "content-type": "application/json" }, body: '{"value":1}',
  });
  const forwarded = withViewerCountry(request);
  assert.equal(forwarded.method, "PATCH");
  assert.equal(forwarded.headers.get("cookie"), "session=test");
  assert.equal(forwarded.headers.get("authorization"), "Bearer test");
  assert.equal(await forwarded.text(), '{"value":1}');
});
