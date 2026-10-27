import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_REVALIDATE_SECONDS,
  homePageProps,
  loadHomePageProps,
  loadPostPageProps,
  loadPostStaticPaths,
  postPageProps,
  postStaticPaths,
  withRevalidate,
} from "./static-props";

const post = {
  id: "page-1",
  slug: "hello",
  tags: ["note", ""],
};

const recordMap = { block: { "page-1": { id: "page-1" } } };

function withEnv(
  values: { GITHUB_ACTIONS?: string; REVALIDATE_SECONDS?: string },
  run: () => void | Promise<void>,
) {
  const previous = {
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
    REVALIDATE_SECONDS: process.env.REVALIDATE_SECONDS,
  };
  for (const key of Object.keys(values) as (keyof typeof values)[]) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const restore = () => {
    if (previous.GITHUB_ACTIONS === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previous.GITHUB_ACTIONS;
    if (previous.REVALIDATE_SECONDS === undefined) delete process.env.REVALIDATE_SECONDS;
    else process.env.REVALIDATE_SECONDS = previous.REVALIDATE_SECONDS;
  };
  try {
    const result = run();
    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).finally(restore);
    }
    restore();
  } catch (error) {
    restore();
    throw error;
  }
}

describe("withRevalidate", () => {
  it("uses a one-hour safety net instead of regenerating every second", () => {
    withEnv({ GITHUB_ACTIONS: undefined, REVALIDATE_SECONDS: undefined }, () => {
      assert.deepEqual(withRevalidate({ posts: [post] }), {
        props: { posts: [post] },
        revalidate: DEFAULT_REVALIDATE_SECONDS,
      });
      assert.equal(DEFAULT_REVALIDATE_SECONDS, 3600);
    });
  });

  it("honors REVALIDATE_SECONDS", () => {
    withEnv({ GITHUB_ACTIONS: undefined, REVALIDATE_SECONDS: "120" }, () => {
      assert.equal(withRevalidate({ ok: true }).revalidate, 120);
    });
  });

  it("rejects a non-positive or non-integer interval", () => {
    withEnv({ REVALIDATE_SECONDS: "0" }, () => {
      assert.throws(() => withRevalidate({ ok: true }), /REVALIDATE_SECONDS/);
    });
    withEnv({ REVALIDATE_SECONDS: "1.5" }, () => {
      assert.throws(() => withRevalidate({ ok: true }), /REVALIDATE_SECONDS/);
    });
  });

  it("omits revalidate for the GitHub Pages static export", () => {
    withEnv({ GITHUB_ACTIONS: "true", REVALIDATE_SECONDS: "30" }, () => {
      assert.deepEqual(withRevalidate({ posts: [post] }), {
        props: { posts: [post] },
      });
    });
  });
});

describe("home page props", () => {
  it("counts tags and keeps the revalidate window", () => {
    withEnv({ GITHUB_ACTIONS: undefined, REVALIDATE_SECONDS: undefined }, () => {
      assert.deepEqual(homePageProps([post, { ...post, slug: "other", tags: ["note"] }]), {
        props: {
          posts: [post, { ...post, slug: "other", tags: ["note"] }],
          tags: { note: 2 },
        },
        revalidate: 3600,
      });
    });
  });

  it("throws on zero published posts outside of next build", () => {
    assert.throws(
      () => homePageProps([]),
      /Refusing to cache an empty page/,
    );
  });

  it("propagates Notion failures such as 403 instead of caching an empty page", async () => {
    const error = Object.assign(new Error("Notion forbidden"), { status: 403 });
    await assert.rejects(
      () => loadHomePageProps(async () => {
        throw error;
      }),
      (caught: unknown) => caught === error,
    );
  });
});

describe("post page props", () => {
  it("uses blocking fallback only for the Vercel build", () => {
    withEnv({ GITHUB_ACTIONS: undefined }, () => {
      assert.deepEqual(postStaticPaths([post]), {
        paths: [{ params: { slug: "hello" } }],
        fallback: "blocking",
      });
    });
    withEnv({ GITHUB_ACTIONS: "true" }, () => {
      assert.equal(postStaticPaths([post]).fallback, false);
    });
  });

  it("fails path generation when the database has no published posts", async () => {
    await assert.rejects(
      () => loadPostStaticPaths(async () => []),
      /Refusing to cache an empty page/,
    );
  });

  it("returns notFound for an unknown slug without throwing", () => {
    withEnv({ GITHUB_ACTIONS: undefined, REVALIDATE_SECONDS: undefined }, () => {
      assert.deepEqual(postPageProps("missing", [post], null), {
        notFound: true,
        revalidate: 3600,
      });
    });
    withEnv({ GITHUB_ACTIONS: "true" }, () => {
      assert.deepEqual(postPageProps("missing", [post], null), {
        notFound: true,
      });
    });
  });

  it("throws when the recordMap is missing or empty", () => {
    assert.throws(
      () => postPageProps("hello", [post], null),
      /no recordMap/,
    );
    assert.throws(
      () => postPageProps("hello", [post], { block: {} }),
      /no recordMap/,
    );
  });

  it("throws when fetching the database or the page fails", async () => {
    const forbidden = Object.assign(new Error("403"), { status: 403 });
    await assert.rejects(
      () => loadPostPageProps("hello", async () => {
        throw forbidden;
      }, async () => recordMap),
      (caught: unknown) => caught === forbidden,
    );

    let loaded = false;
    await assert.rejects(
      () => loadPostPageProps("hello", async () => [], async () => {
        loaded = true;
        return recordMap;
      }),
      /Refusing to cache an empty page/,
    );
    assert.equal(loaded, false);

    const missing = new Error("page 403");
    await assert.rejects(
      () => loadPostPageProps("hello", async () => [post], async () => {
        throw missing;
      }),
      (caught: unknown) => caught === missing,
    );
  });

  it("returns the post when Notion responds", () => {
    withEnv({ GITHUB_ACTIONS: undefined, REVALIDATE_SECONDS: undefined }, () => {
      const result = postPageProps("hello", [post], recordMap);
      assert.equal("props" in result && result.props.post.slug, "hello");
      assert.equal("revalidate" in result && result.revalidate, 3600);
    });
  });
});
