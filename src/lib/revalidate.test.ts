import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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

  it("returns 500 when revalidate throws and does not continue", async () => {
    const calls: string[] = [];
    const { run } = authorized({
      revalidate: async (path: string) => {
        calls.push(path);
        if (path === "/alpha") throw new Error("getStaticProps failed");
      },
    });
    const result = await run();
    assert.equal(result.status, 500);
    assert.deepEqual(calls, ["/", "/alpha"]);
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
