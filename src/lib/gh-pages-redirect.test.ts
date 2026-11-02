import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const origin = "https://blog-xuedixuedi.vercel.app";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("GitHub Pages redirect", () => {
  for (const file of ["../../gh-pages-redirect/index.html", "../../gh-pages-redirect/404.html"]) {
    it(`${file} preserves the path and falls back to the Vercel origin`, () => {
      const html = read(file);
      assert.match(html, /location\.replace\(target\)/);
      assert.match(html, /location\.pathname \+ location\.search \+ location\.hash/);
      assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${origin}/"`));
      assert.match(html, new RegExp(`rel="canonical" href="${origin}/"`));
      assert.match(html, new RegExp(`<a href="${origin}/">`));
      assert.equal(html.includes("location.href"), false);
    });
  }

  it("deploys only the redirect site, and only when those files change", () => {
    const workflow = read("../../.github/workflows/deploy.yml");
    assert.match(workflow, /workflow_dispatch/);
    assert.match(workflow, /gh-pages-redirect\/\*\*/);
    assert.match(workflow, /path: \.\/gh-pages-redirect/);
    assert.equal(workflow.includes("cron:"), false);
    assert.equal(workflow.includes("next build"), false);
    assert.equal(workflow.includes("npm"), false);
    assert.match(workflow, /WishKit-LoveAndDeepspace/);
    assert.equal(workflow.includes("actions/configure-pages"), false);
  });
});
