import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { rethrowIfBuild, withRevalidate } from "./static-props";

function withEnv(
  values: { NEXT_PHASE?: string; GITHUB_ACTIONS?: string },
  run: () => void,
) {
  const previous = {
    NEXT_PHASE: process.env.NEXT_PHASE,
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
  };
  if ("NEXT_PHASE" in values) {
    if (values.NEXT_PHASE === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = values.NEXT_PHASE;
  }
  if ("GITHUB_ACTIONS" in values) {
    if (values.GITHUB_ACTIONS === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = values.GITHUB_ACTIONS;
  }
  try {
    run();
  } finally {
    if (previous.NEXT_PHASE === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = previous.NEXT_PHASE;
    if (previous.GITHUB_ACTIONS === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previous.GITHUB_ACTIONS;
  }
}

describe("withRevalidate", () => {
  it("retries ISR pages so an empty error result cannot stick", () => {
    withEnv({ GITHUB_ACTIONS: undefined }, () => {
      assert.deepEqual(withRevalidate({ posts: [] }), {
        props: { posts: [] },
        revalidate: 1,
      });
    });
  });

  it("omits revalidate for the GitHub Pages static export", () => {
    withEnv({ GITHUB_ACTIONS: "true" }, () => {
      assert.deepEqual(withRevalidate({ posts: [] }), {
        props: { posts: [] },
      });
    });
  });
});

describe("rethrowIfBuild", () => {
  it("fails next build instead of emitting an empty site", () => {
    withEnv({ NEXT_PHASE: PHASE_PRODUCTION_BUILD }, () => {
      assert.throws(() => rethrowIfBuild(new Error("notion down")), /notion down/);
    });
  });

  it("lets ISR return a revalidated fallback", () => {
    withEnv({ NEXT_PHASE: undefined }, () => {
      assert.doesNotThrow(() => rethrowIfBuild(new Error("notion down")));
    });
  });
});
