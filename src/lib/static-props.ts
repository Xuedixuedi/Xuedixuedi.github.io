/**
 * Time-based ISR is only a safety net for a missed webhook. Prompt updates
 * go through `/api/revalidate`. GitHub Pages builds with `output: 'export'`,
 * which rejects `revalidate` and non-false `fallback`, so that path stays a
 * pure static export.
 *
 * A failed Notion fetch must throw. Next.js keeps the last successfully
 * generated page only when `getStaticProps` throws; a successful empty
 * result is cached in its place.
 */

export const DEFAULT_REVALIDATE_SECONDS = 3600;

const REVALIDATE_SECONDS_ENV = "REVALIDATE_SECONDS";

export function isStaticExport(): boolean {
  return Boolean(process.env.GITHUB_ACTIONS);
}

export function revalidateSeconds(): number {
  const raw = process.env[REVALIDATE_SECONDS_ENV];
  if (raw == null || raw.trim() === "") return DEFAULT_REVALIDATE_SECONDS;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `${REVALIDATE_SECONDS_ENV} must be a positive integer number of seconds, received ${JSON.stringify(raw)}.`,
    );
  }
  return parsed;
}

export function withRevalidate<P extends Record<string, unknown>>(props: P) {
  if (isStaticExport()) return { props };
  return { props, revalidate: revalidateSeconds() };
}

/** Static export cannot serve fallback paths. Vercel generates them on demand. */
export function staticPathsFallback(): false | "blocking" {
  return isStaticExport() ? false : "blocking";
}

export function notFoundResult():
  | { notFound: true }
  | { notFound: true; revalidate: number } {
  if (isStaticExport()) return { notFound: true };
  return { notFound: true, revalidate: revalidateSeconds() };
}

export function assertPublishedPosts(posts: readonly unknown[]): void {
  if (posts.length === 0) {
    throw new Error("No published posts. Refusing to cache an empty page.");
  }
}

export function assertRecordMap(
  recordMap: { block?: unknown } | null | undefined,
  slug: string,
): asserts recordMap is { block: Record<string, unknown> } {
  const block = recordMap?.block;
  const hasBlocks =
    block != null && typeof block === "object" && Object.keys(block).length > 0;
  if (!hasBlocks) {
    throw new Error(
      `Notion page for slug "${slug}" has no recordMap. Refusing to cache a blank post.`,
    );
  }
}

type TaggablePost = { tags?: readonly (string | null | undefined)[] | null };

export function homePageProps<TPost extends TaggablePost>(posts: readonly TPost[]) {
  assertPublishedPosts(posts);
  const tags: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      if (!tag) continue;
      tags[tag] = (tags[tag] || 0) + 1;
    }
  }
  return withRevalidate({ posts, tags });
}

export async function loadHomePageProps<TPost extends TaggablePost>(
  loadPosts: () => Promise<readonly TPost[]>,
) {
  return homePageProps(await loadPosts());
}

type SluggedPost = { slug: string };

export function postStaticPaths<TPost extends SluggedPost>(posts: readonly TPost[]) {
  assertPublishedPosts(posts);
  return {
    paths: posts.map((post) => ({ params: { slug: post.slug } })),
    fallback: staticPathsFallback(),
  };
}

export async function loadPostStaticPaths<TPost extends SluggedPost>(
  loadPosts: () => Promise<readonly TPost[]>,
) {
  return postStaticPaths(await loadPosts());
}

export function postPageProps<TPost extends SluggedPost>(
  slug: string,
  posts: readonly TPost[],
  recordMap: { block?: unknown } | null | undefined,
) {
  assertPublishedPosts(posts);
  const post = posts.find((item) => item.slug === slug);
  if (!post) return notFoundResult();
  assertRecordMap(recordMap, slug);
  return withRevalidate({ post, recordMap });
}

export async function loadPostPageProps<TPost extends SluggedPost>(
  slug: string,
  loadPosts: () => Promise<readonly TPost[]>,
  loadRecordMap: (post: TPost) => Promise<{ block?: unknown } | null | undefined>,
) {
  const posts = await loadPosts();
  assertPublishedPosts(posts);
  const post = posts.find((item) => item.slug === slug);
  if (!post) return notFoundResult();
  return postPageProps(slug, posts, await loadRecordMap(post));
}
