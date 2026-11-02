import Head from "next/head";
import { CONFIG } from "../../site.config";
import { absoluteUrl } from "@/lib/site-url";

type SeoProps = {
  title: string;
  description?: string | null;
  path?: string;
  type?: "website" | "article";
  image?: string | null;
};

function imageUrl(image: string | null | undefined): string {
  if (!image) return absoluteUrl("/avatar.png");
  if (image.startsWith("https://") || image.startsWith("http://")) return image;
  return absoluteUrl(image);
}

export function Seo({
  title,
  description,
  path = "/",
  type = "website",
  image,
}: SeoProps) {
  const summary = description?.trim() || CONFIG.blog.description;
  const canonical = absoluteUrl(path);
  const imageSrc = imageUrl(image);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={summary} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={summary} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={CONFIG.blog.title} />
      <meta property="og:image" content={imageSrc} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={summary} />
      <meta name="twitter:image" content={imageSrc} />
    </Head>
  );
}
