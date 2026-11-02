export type SitemapPost = {
  slug: string;
  date?: string | null;
};

const LASTMOD = /^(\d{4}-\d{2}-\d{2})/;

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function lastmod(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  return LASTMOD.exec(date)?.[1];
}

export function buildSitemapXml(origin: string, posts: readonly SitemapPost[]): string {
  const base = origin.replace(/\/+$/, "");
  const entries = [
    { loc: `${base}/` },
    ...posts.map((post) => ({
      loc: `${base}/${encodeURIComponent(post.slug)}`,
      lastmod: lastmod(post.date),
    })),
  ];

  const body = entries
    .map((entry) => {
      const modified =
        "lastmod" in entry && entry.lastmod
          ? `\n    <lastmod>${entry.lastmod}</lastmod>`
          : "";
      return `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>${modified}\n  </url>`;
    })
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>\n`
  );
}

export function buildRobotsTxt(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
}

/** CDN cache aligned with ISR, plus a day of stale-while-revalidate per hour. */
export function sitemapCacheControl(revalidateSeconds: number): string {
  const seconds = Math.max(1, Math.floor(revalidateSeconds));
  return `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 24}`;
}
