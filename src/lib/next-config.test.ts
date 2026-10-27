import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, describe, it } from "node:test";

const require = createRequire(import.meta.url);
const configPath = require.resolve("../../next.config.js");

function loadConfig() {
  delete require.cache[configPath];
  return require(configPath) as {
    output?: string;
    pageExtensions?: string[];
    images?: { unoptimized?: boolean };
  };
}

const previous = process.env.GITHUB_ACTIONS;

afterEach(() => {
  if (previous === undefined) delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS = previous;
  delete require.cache[configPath];
});

describe("next.config static export", () => {
  it("keeps API routes in the Vercel build", () => {
    delete process.env.GITHUB_ACTIONS;
    const config = loadConfig();
    assert.equal(config.output, undefined);
    assert.equal(config.pageExtensions, undefined);
  });

  it("drops the .ts revalidate route from the GitHub Pages export", () => {
    process.env.GITHUB_ACTIONS = "true";
    const config = loadConfig();
    assert.equal(config.output, "export");
    assert.equal(config.images?.unoptimized, true);
    assert.deepEqual(config.pageExtensions, ["tsx"]);
    assert.equal(config.pageExtensions?.includes("ts"), false);
  });
});
