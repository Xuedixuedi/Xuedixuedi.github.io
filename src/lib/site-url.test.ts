import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, describe, it } from "node:test";
import { DEFAULT_SITE_URL, absoluteUrl, postPath, siteUrl } from "./site-url";

const require = createRequire(import.meta.url);

const previous = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  SITE_URL: process.env.SITE_URL,
};

afterEach(() => {
  if (previous.NEXT_PUBLIC_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previous.NEXT_PUBLIC_SITE_URL;
  if (previous.SITE_URL === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = previous.SITE_URL;
});

describe("site url", () => {
  it("defaults to the Vercel production host", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
    assert.equal(DEFAULT_SITE_URL, "https://blog-xuedixuedi.vercel.app");
    assert.equal(siteUrl(), DEFAULT_SITE_URL);
    assert.equal(absoluteUrl("/"), `${DEFAULT_SITE_URL}/`);
    assert.equal(absoluteUrl(postPath("hello world")), `${DEFAULT_SITE_URL}/hello%20world`);
  });

  it("prefers NEXT_PUBLIC_SITE_URL, then SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com/";
    process.env.SITE_URL = "https://other.example/";
    assert.equal(siteUrl(), "https://example.com");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(siteUrl(), "https://other.example");
  });

  it("stores the same default on CONFIG.link", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
    const configPath = require.resolve("../../site.config.js");
    delete require.cache[require.resolve("./site-url.js")];
    delete require.cache[configPath];
    const { CONFIG } = require("../../site.config.js") as { CONFIG: { link: string; lang: string } };
    assert.equal(CONFIG.link, DEFAULT_SITE_URL);
    assert.equal(CONFIG.lang, "zh-CN");
  });
});
