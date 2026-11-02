import type { GetServerSideProps } from "next";
import { getPosts } from "@/lib/notion";
import { buildSitemapXml, sitemapCacheControl } from "@/lib/sitemap";
import { siteUrl } from "@/lib/site-url";
import { revalidateSeconds } from "@/lib/static-props";

/**
 * Homepage plus every published post. `getPosts` throws when Notion fails or
 * the database has no published posts, so this response is a 500 instead of
 * a successful empty sitemap. Cache-Control lets the CDN keep the last good
 * copy while it revalidates.
 */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = await getPosts();
  const xml = buildSitemapXml(
    siteUrl(),
    posts.map((post) => ({ slug: post.slug, date: post.date })),
  );
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", sitemapCacheControl(revalidateSeconds()));
  res.write(xml);
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
