import { createHash, timingSafeEqual } from "node:crypto";

export const REVALIDATE_SECRET_HEADER = "x-revalidate-secret";
export const MAX_REVALIDATE_BODY_BYTES = 1_000_000;

export class RevalidateRejected extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RevalidateRejected";
    this.status = status;
  }
}

export function secretsMatch(provided: string, expected: string): boolean {
  const actual = createHash("sha256").update(provided).digest();
  const wanted = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actual, wanted);
}

function headerValues(value: string | string[] | undefined): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item.trim()).map((item) => item.trim());
}

function bearerTokens(value: string | string[] | undefined): string[] {
  const tokens: string[] = [];
  for (const header of headerValues(value)) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (match) tokens.push(match[1]);
  }
  return tokens;
}

/** Header, bearer token, or `?secret=` value. Any one match authorizes the call. */
export function providedSecrets(input: {
  header?: string | string[] | undefined;
  authorization?: string | string[] | undefined;
  query?: string | string[] | undefined;
}): string[] {
  return [
    ...headerValues(input.header),
    ...bearerTokens(input.authorization),
    ...headerValues(input.query),
  ];
}

export function assertAuthorized(
  configuredSecret: string | undefined,
  secrets: readonly string[],
): void {
  const expected = configuredSecret?.trim();
  if (!expected) {
    console.error("REVALIDATE_SECRET is not set; rejecting on-demand revalidation.");
    throw new RevalidateRejected(401, "Unauthorized");
  }

  let ok = false;
  for (const secret of secrets) {
    ok = secretsMatch(secret, expected) || ok;
  }
  if (!ok) throw new RevalidateRejected(401, "Unauthorized");
}

/**
 * One URL segment. Rejects path traversal and extra segments so a webhook
 * body cannot revalidate arbitrary routes.
 */
export function normalizeSlug(raw: string): string {
  const slug = raw.trim().replace(/^\/+|\/+$/g, "");
  if (
    !slug ||
    slug === "." ||
    slug === ".." ||
    slug.includes("..") ||
    /[\\/?#\s]/.test(slug)
  ) {
    throw new RevalidateRejected(400, "Invalid slug");
  }
  return slug;
}

/**
 * Slugs explicitly requested by the caller.
 * `null` means the payload did not name a slug (typical Notion webhook),
 * so the caller should revalidate the homepage and every published post.
 */
export function explicitSlugsFromBody(body: unknown): string[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;

  if (typeof record.slug === "string") {
    if (!record.slug.trim()) return null;
    return [normalizeSlug(record.slug)];
  }

  if (Array.isArray(record.slugs)) {
    const usable = record.slugs.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
    if (usable.length === 0) return null;
    return usable.map((item) => normalizeSlug(item));
  }

  return null;
}

export function revalidatePaths(slugs: readonly string[]): string[] {
  const paths = ["/"];
  const seen = new Set(paths);
  for (const slug of slugs) {
    const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
    if (
      !normalized ||
      normalized === "." ||
      normalized === ".." ||
      normalized.includes("..") ||
      /[\\/?#\s]/.test(normalized)
    ) {
      throw new Error(
        `Refusing to revalidate invalid slug ${JSON.stringify(slug)}.`,
      );
    }
    const path = `/${normalized}`;
    if (seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

export async function readRequestBody(
  stream: AsyncIterable<Uint8Array | string>,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_REVALIDATE_BODY_BYTES) {
      throw new RevalidateRejected(413, "Revalidation body is too large");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Notion automations do not use a stable payload shape.
    return {};
  }
}

/**
 * Notion webhooks regenerate the homepage and every published post. Each
 * path fetches Notion (about 1–2.5s). A small cap keeps that burst bounded
 * if the database grows; `maxDuration` on the route covers the rest.
 */
export const REVALIDATE_CONCURRENCY = 4;

export type PathRevalidateResult = {
  path: string;
  ok: boolean;
  error?: string;
};

export type RevalidateResult = {
  status: number;
  body: {
    message?: string;
    revalidated?: boolean;
    paths?: string[];
    results?: PathRevalidateResult[];
  };
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Error revalidating";
}

/**
 * Regenerate paths in batches. `Promise.allSettled` keeps going when one
 * path fails. A failure does not roll back paths that already succeeded, and
 * it does not replace the failed path: `res.revalidate` updates a page only
 * when `getStaticProps` succeeds.
 */
export async function revalidateAll(
  paths: readonly string[],
  revalidate: (path: string) => Promise<void>,
  concurrency = REVALIDATE_CONCURRENCY,
): Promise<PathRevalidateResult[]> {
  if (paths.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, paths.length));
  const results: PathRevalidateResult[] = new Array(paths.length);

  for (let start = 0; start < paths.length; start += limit) {
    const end = Math.min(paths.length, start + limit);
    const batch = paths.slice(start, end);
    const settled = await Promise.allSettled(batch.map((path) => revalidate(path)));
    settled.forEach((outcome, offset) => {
      const path = batch[offset];
      if (outcome.status === "fulfilled") {
        results[start + offset] = { path, ok: true };
        return;
      }
      console.error(`On-demand revalidation failed for ${path}:`, outcome.reason);
      results[start + offset] = {
        path,
        ok: false,
        error: errorMessage(outcome.reason),
      };
    });
  }

  return results;
}

/**
 * Revalidate `/` and either the requested slugs or every published slug.
 * Listing posts happens before any `revalidate` call. A thrown fetch or an
 * empty database returns 500 and does not touch the cache. Paths then run
 * concurrently. Any failed path returns 500 for the request; that path keeps
 * its previous page, and the response lists each path's success or failure.
 */
export async function runRevalidation(options: {
  method: string | undefined;
  configuredSecret: string | undefined;
  providedSecrets: readonly string[];
  body: unknown;
  listPublishedSlugs: () => Promise<readonly string[]>;
  revalidate: (path: string) => Promise<void>;
}): Promise<RevalidateResult> {
  if ((options.method ?? "GET").toUpperCase() !== "POST") {
    return { status: 405, body: { message: "Method not allowed" } };
  }

  try {
    assertAuthorized(options.configuredSecret, options.providedSecrets);

    const explicit = explicitSlugsFromBody(options.body);
    const slugs = explicit ?? [...(await options.listPublishedSlugs())];
    if (slugs.length === 0) {
      throw new Error("No published posts. Refusing to revalidate into an empty site.");
    }

    const paths = revalidatePaths(slugs);
    const results = await revalidateAll(paths, options.revalidate);
    const succeeded = results.filter((item) => item.ok).map((item) => item.path);
    if (results.some((item) => !item.ok)) {
      return {
        status: 500,
        body: {
          message: "Error revalidating",
          revalidated: false,
          paths: succeeded,
          results,
        },
      };
    }

    return { status: 200, body: { revalidated: true, paths: succeeded, results } };
  } catch (error) {
    if (error instanceof RevalidateRejected) {
      return { status: error.status, body: { message: error.message } };
    }
    console.error("On-demand revalidation failed:", error);
    return { status: 500, body: { message: "Error revalidating" } };
  }
}
