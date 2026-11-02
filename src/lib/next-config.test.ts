import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, describe, it } from "node:test";

const require = createRequire(import.meta.url);
const configPath = require.resolve("../../next.config.js");

type RemotePattern = { protocol?: string; hostname: string; pathname?: string };
type Header = { key: string; value: string };

function loadConfig() {
  delete require.cache[require.resolve("../../src/lib/site-url.js")];
  delete require.cache[configPath];
  return require(configPath) as {
    output?: string;
    pageExtensions?: string[];
    images?: { domains?: string[]; unoptimized?: boolean; remotePatterns?: RemotePattern[] };
    headers?: () => Promise<{ source: string; headers: Header[] }[]>;
  };
}

const previous = process.env.GITHUB_ACTIONS;

afterEach(() => {
  if (previous === undefined) delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS = previous;
  delete require.cache[configPath];
});

describe("next.config", () => {
  it("keeps the ISR server build when GitHub Actions is set", () => {
    process.env.GITHUB_ACTIONS = "true";
    const config = loadConfig();
    assert.equal(config.output, undefined);
    assert.equal(config.pageExtensions, undefined);
    assert.equal(config.images?.unoptimized, undefined);
  });

  it("allows Notion image hosts through remotePatterns", () => {
    delete process.env.GITHUB_ACTIONS;
    const config = loadConfig();
    assert.equal(config.images?.domains, undefined);
    assert.deepEqual(
      config.images?.remotePatterns?.map((pattern) => pattern.hostname),
      ["www.notion.so", "lh5.googleusercontent.com", "s3-us-west-2.amazonaws.com"],
    );
    assert.equal(
      config.images?.remotePatterns?.every((pattern) => pattern.protocol === "https"),
      true,
    );
  });

  it("sends security headers and does not set a strict CSP", async () => {
    const config = loadConfig();
    assert.equal(typeof config.headers, "function");
    const rules = await config.headers!();
    assert.equal(rules.length, 1);
    assert.equal(rules[0]?.source, "/:path*");
    const headers = new Map(rules[0]?.headers.map((header) => [header.key, header.value]));
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(headers.get("X-Frame-Options"), "SAMEORIGIN");
    assert.equal(headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
    assert.equal(
      Array.from(headers.keys()).some((key) => key.toLowerCase() === "content-security-policy"),
      false,
    );
  });

  it("does not build a static export in CI", () => {
    const source = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
    assert.equal(source.includes("output: 'export'"), false);
    assert.equal(source.includes("Static export"), false);
    assert.equal(source.includes("npm run build"), true);
  });
});
