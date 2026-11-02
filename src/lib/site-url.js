/** Canonical origin for metadata, sitemap, and robots. */
const DEFAULT_SITE_URL = "https://blog-xuedixuedi.vercel.app";

function siteUrl() {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.SITE_URL];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim().replace(/\/+$/, "");
    if (trimmed) return trimmed;
  }
  return DEFAULT_SITE_URL;
}

function postPath(slug) {
  return `/${encodeURIComponent(slug)}`;
}

function absoluteUrl(pathname) {
  const origin = siteUrl();
  if (!pathname || pathname === "/") return `${origin}/`;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

module.exports = {
  DEFAULT_SITE_URL,
  siteUrl,
  postPath,
  absoluteUrl,
};
