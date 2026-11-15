export function withViewerCountry(request) {
  const country = request.cf?.country;
  const headers = new Headers(request.headers);
  // Replace caller-supplied values; only Cloudflare's request metadata is trusted.
  headers.set("x-portal-viewer-country", typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : "XX");
  return new Request(request, { headers });
}
