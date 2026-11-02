import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  REVALIDATE_CONCURRENCY,
  explicitSlugsFromBody,
  providedSecrets,
  readRequestBody,
  runRevalidation,
} from "./revalidate";

const secret = "test-secret";

function authorized(overrides: Partial<Parameters<typeof runRevalidation>[0]> = {}) {
  const calls: string[] = [];
  const listCalls: string[][] = [];
  const options = {
    method: "POST",
    configuredSecret: secret,
    providedSecrets: [secret],
    body: { type: "page.properties_updated", entity: { id: "notion-page" } },
    listPublishedSlugs: async () => {
      listCalls.push(["listed"]);
      return ["alpha", "beta"];
    },
    revalidate: async (path: string) => {
      calls.push(path);
    },
    ...overrides,
  };
  return {
    calls,
    listCalls,
    run: () => runRevalidation(options),
  };
}

describe("revalidate authorization", () => {
  it("reads the secret from the header, bearer token, or query", () => {
    assert.deepEqual(
      providedSecrets({
        header: " from-header ",
        authorization: "Bearer from-bearer",
        query: ["from-query"],
      }),
      ["from-header", "from-bearer", "from-query"],
    );
  });

  it("rejects an unset secret without revalidating", async () => {
    const { calls, run } = authorized({ configuredSecret: "  ", providedSecrets: [secret] });
    const result = await run();
    assert.equal(result.status, 401);
    assert.deepEqual(calls, []);
  });

  it("rejects a mismatch without revalidating", async () => {
    const { calls, run } = authorized({ providedSecrets: ["nope"] });
    const result = await run();
    assert.equal(result.status, 401);
    assert.deepEqual(calls, []);
  });

  it("accepts a matching query secret when the header is absent", async () => {
    const { calls, run } = authorized({ providedSecrets: providedSecrets({ query: secret }) });
    const result = await run();
    assert.equal(result.status, 200);
    assert.deepEqual(calls, ["/", "/alpha", "/beta"]);
  });
});

describe("revalidate paths", () => {
  it("revalidates the homepage and every published post for a Notion webhook", async () => {
    const { calls, listCalls, run } = authorized();
    const result = await run();
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.paths, ["/", "/alpha", "/beta"]);
    assert.equal(listCalls.length, 1);
    assert.deepEqual(calls, ["/", "/alpha", "/beta"]);
  });

  it("revalidates only the homepage and a slug passed in the body", async () => {
    const { calls, listCalls, run } = authorized({ body: { slug: "/gamma/" } });
    const result = await run();
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.paths, ["/", "/gamma"]);
    assert.equal(listCalls.length, 0);
    assert.deepEqual(calls, ["/", "/gamma"]);
  });

  it("revalidates each slug in a slugs array", async () => {
    const { run } = authorized({ body: { slugs: ["one", "two", "one"] } });
    const result = await run();
    assert.deepEqual(result.body.paths, ["/", "/one", "/two"]);
  });

  it("treats an unusable payload as a full revalidation", () => {
    assert.equal(explicitSlugsFromBody(null), null);
    assert.equal(explicitSlugsFromBody("hello"), null);
    assert.equal(explicitSlugsFromBody({ slug: "" }), null);
    assert.equal(explicitSlugsFromBody({ slug: { id: "page" } }), null);
    assert.equal(explicitSlugsFromBody({ data: { parent: { type: "database" } } }), null);
  });

  it("rejects an invalid slug before revalidating", async () => {
    const { calls, run } = authorized({ body: { slug: "../admin" } });
    const result = await run();
    assert.equal(result.status, 400);
    assert.deepEqual(calls, []);
  });
});

describe("revalidate failures", () => {
  it("returns 405 for non-POST requests and does not touch the cache", async () => {
    const { calls, run } = authorized({ method: "GET" });
    const result = await run();
    assert.equal(result.status, 405);
    assert.deepEqual(calls, []);
  });

  it("returns 500 and does not revalidate when listing posts fails", async () => {
    const { calls, run } = authorized({
      listPublishedSlugs: async () => {
        throw Object.assign(new Error("Notion forbidden"), { status: 403 });
      },
    });
    const result = await run();
    assert.equal(result.status, 500);
    assert.equal(result.body.message, "Error revalidating");
    assert.deepEqual(calls, []);
  });

  it("returns 500 and does not revalidate when there are zero published posts", async () => {
    const { calls, run } = authorized({
      listPublishedSlugs: async () => [],
    });
    const result = await run();
    assert.equal(result.status, 500);
    assert.deepEqual(calls, []);
  });

  it("returns 500 when a path fails, still regenerates the others, and reports each path", async () => {
    const calls: string[] = [];
    const { run } = authorized({
      revalidate: async (path: string) => {
        calls.push(path);
        if (path === "/alpha") throw new Error("getStaticProps failed");
      },
    });
    const result = await run();
    assert.equal(result.status, 500);
    assert.equal(result.body.revalidated, false);
    assert.equal(result.body.message, "Error revalidating");
    assert.deepEqual(result.body.paths, ["/", "/beta"]);
    assert.deepEqual(result.body.results, [
      { path: "/", ok: true },
      { path: "/alpha", ok: false, error: "getStaticProps failed" },
      { path: "/beta", ok: true },
    ]);
    assert.deepEqual(calls, ["/", "/alpha", "/beta"]);
  });

  it("lists posts before starting any revalidate", async () => {
    let listed = false;
    let startedEarly = false;
    const { run } = authorized({
      listPublishedSlugs: async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        listed = true;
        return ["alpha"];
      },
      revalidate: async () => {
        if (!listed) startedEarly = true;
      },
    });
    const result = await run();
    assert.equal(result.status, 200);
    assert.equal(startedEarly, false);
    assert.deepEqual(
      result.body.results,
      [
        { path: "/", ok: true },
        { path: "/alpha", ok: true },
      ],
    );
  });

  it("revalidates at most REVALIDATE_CONCURRENCY paths at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const slugs = ["a", "b", "c", "d", "e"];
    const { run } = authorized({
      body: { slugs },
      revalidate: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 30));
        inFlight -= 1;
      },
    });
    const result = await run();
    assert.equal(result.status, 200);
    assert.equal(result.body.results?.length, slugs.length + 1);
    assert.equal(result.body.results?.every((item) => item.ok), true);
    assert.ok(maxInFlight > 1);
    assert.ok(maxInFlight <= REVALIDATE_CONCURRENCY);
  });

  it("sets maxDuration to 60 and keeps the raw body parser", () => {
    const source = readFileSync(new URL("../pages/api/revalidate.ts", import.meta.url), "utf8");
    assert.match(source, /maxDuration:\s*60/);
    assert.match(source, /bodyParser:\s*false/);
  });
});

describe("readRequestBody", () => {
  async function* chunks(parts: string[]) {
    for (const part of parts) yield part;
  }

  it("treats an empty or non-JSON body as an empty payload", async () => {
    assert.deepEqual(await readRequestBody(chunks([])), {});
    assert.deepEqual(await readRequestBody(chunks(["not-json"])), {});
  });

  it("parses a JSON body", async () => {
    assert.deepEqual(await readRequestBody(chunks(['{"slug":"hello"}'])), { slug: "hello" });
  });

  it("rejects a body over the size limit", async () => {
    const huge = "x".repeat(1_000_001);
    await assert.rejects(() => readRequestBody(chunks([huge])), /too large/);
  });
});
