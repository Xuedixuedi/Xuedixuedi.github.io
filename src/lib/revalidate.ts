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

export type RevalidateResult = {
  status: number;
  body: {
    message?: string;
    revalidated?: boolean;
    paths?: string[];
  };
};

/**
 * Revalidate `/` and either the requested slugs or every published slug.
 * Listing posts happens before any `revalidate` call. A thrown fetch, an
 * empty database, or a failed `revalidate` becomes a non-200 result and does
 * not replace a cached page: `res.revalidate` only updates a path when
 * `getStaticProps` succeeds, and that function throws on Notion failures.
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
    const revalidated: string[] = [];
    for (const path of paths) {
      try {
        await options.revalidate(path);
      } catch (error) {
        console.error(`On-demand revalidation failed for ${path}:`, error);
        return { status: 500, body: { message: "Error revalidating" } };
      }
      revalidated.push(path);
    }

    return { status: 200, body: { revalidated: true, paths: revalidated } };
  } catch (error) {
    if (error instanceof RevalidateRejected) {
      return { status: error.status, body: { message: error.message } };
    }
    console.error("On-demand revalidation failed:", error);
    return { status: 500, body: { message: "Error revalidating" } };
  }
}
