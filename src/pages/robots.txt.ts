import type { GetServerSideProps } from "next";
import { buildRobotsTxt } from "@/lib/sitemap";
import { siteUrl } from "@/lib/site-url";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.write(buildRobotsTxt(siteUrl()));
  res.end();
  return { props: {} };
};

export default function Robots() {
  return null;
}
