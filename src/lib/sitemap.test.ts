import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRobotsTxt, buildSitemapXml, sitemapCacheControl, xmlEscape } from "./sitemap";

const origin = "https://blog-xuedixuedi.vercel.app";

describe("sitemap", () => {
  it("lists the homepage and each published post", () => {
    const xml = buildSitemapXml(origin, [
      { slug: "hello", date: "2024-05-01T12:00:00.000Z" },
      { slug: "a&b", date: "" },
    ]);
    assert.match(xml, /<loc>https:\/\/blog-xuedixuedi\.vercel\.app\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/blog-xuedixuedi\.vercel\.app\/hello<\/loc>/);
    assert.match(xml, /<lastmod>2024-05-01<\/lastmod>/);
    assert.match(xml, /<loc>https:\/\/blog-xuedixuedi\.vercel\.app\/a%26b<\/loc>/);
    assert.equal(xml.includes("<lastmod></lastmod>"), false);
    assert.equal(xmlEscape(`a&b<>"'`), "a&amp;b&lt;&gt;&quot;&apos;");
  });

  it("points robots.txt at the sitemap", () => {
    assert.equal(
      buildRobotsTxt(`${origin}/`),
      `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
    );
  });

  it("caches the sitemap for the ISR window", () => {
    assert.equal(
      sitemapCacheControl(3600),
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
  });
});
