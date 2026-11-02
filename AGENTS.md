# AGENTS.md

## Overview

Next.js (Pages Router) blog. A public Notion database is the CMS, fetched with `notion-client` (no integration token). Vercel is the only host for the blog and serves ISR pages. The canonical site is https://blog-xuedixuedi.vercel.app (`NEXT_PUBLIC_SITE_URL`, or `SITE_URL` when the public variable is unset).

GitHub Pages no longer builds the blog. `.github/workflows/deploy.yml` publishes `gh-pages-redirect/` (`index.html` and `404.html`) so https://xuedixuedi.github.io keeps redirecting to the same path on Vercel. The workflow runs on `workflow_dispatch` and on a push to `main` that changes those files or the workflow itself. It has no daily cron and does not run `next build`. Project Pages under the same account (for example `/WishKit-LoveAndDeepspace/`) are separate repositories. GitHub routes those paths to their own sites; this redirect artifact does not include them.

Current stack in `package.json`: Next.js 16, React 18. The comment in `.github/dependabot.yml` still says "Stay on Next.js 14". That comment is stale. Do not change major versions to match it.

## Commands

Node.js 22, as in CI.

```bash
npm ci
npm run dev          # next dev
npm run typecheck    # tsc --noEmit
npm test             # node:test via tsx
npm run smoke:notion # live Notion fetch; NOTION_PAGE_ID optional
npm run build        # next build
npm start            # next start
```

There is no `lint` script. Next.js 16 does not provide `next lint` (`next` treats `lint` as a directory and exits), and this repo has no ESLint config. Do not add ESLint just to restore the script.

CI (`.github/workflows/ci.yml`) on push and pull_request:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run smoke:notion` (also runs on the daily schedule)
5. `npm run build` with `NOTION_PAGE_ID` set

`npm test` runs `src/lib/notion-record.test.ts`, `src/lib/static-props.test.ts`, `src/lib/revalidate.test.ts`, `src/lib/next-config.test.ts`, `src/lib/sitemap.test.ts`, `src/lib/site-url.test.ts`, and `src/lib/gh-pages-redirect.test.ts`.

## Directory map

```
site.config.js                 profile, blog copy, Notion page id, utterances, site link
src/lib/site-url.js            canonical origin (NEXT_PUBLIC_SITE_URL, SITE_URL, or the Vercel default)
next.config.js                 ISR config, image remotePatterns, security headers
src/pages/index.tsx            home page, getStaticProps
src/pages/[slug].tsx           post page, getStaticPaths / getStaticProps
src/pages/sitemap.xml.ts       homepage + published posts
src/pages/robots.txt.ts        robots.txt pointing at the sitemap
src/pages/api/revalidate.ts    POST /api/revalidate (maxDuration 60)
src/lib/notion.ts              getPosts / getPage, property parsing, published filter
src/lib/notion-record.ts       record-map unwrapping and collection page ids
src/lib/static-props.ts        revalidate interval, fallback, empty-page guards
src/lib/revalidate.ts          secret check, slug parsing, concurrent regeneration
src/lib/sitemap.ts             sitemap XML and robots.txt text
src/components/                UI, including Seo (canonical, Open Graph, Twitter)
src/styles/                    global and code-block CSS
scripts/notion-smoke.ts        fails if the public database returns no published post
public/                        avatar.png only
gh-pages-redirect/             static redirect to the Vercel origin
.github/workflows/ci.yml       typecheck, tests, smoke, build
.github/workflows/deploy.yml   GitHub Pages redirect only
.github/dependabot.yml         security updates only
```

## Hard constraints

- Notion fetch failures must keep the previous page. `getPosts` throws when `NOTION_PAGE_ID` is empty, the collection is missing, there are zero rows, or zero rows are `Type === "Post"` and `Status === "Published"`. `assertPublishedPosts` and `assertRecordMap` throw on an empty list or a post with no blocks. `getStaticProps` must keep throwing: Next.js preserves the last good ISR page only when generation throws. A successful empty payload would be cached in its place. The sitemap uses the same `getPosts` throw so a failed fetch does not publish an empty urlset.
- `/api/revalidate` stays POST-only. The secret is `REVALIDATE_SECRET`, accepted from `?secret=`, `x-revalidate-secret`, or `Authorization: Bearer`, compared with SHA-256 and `timingSafeEqual`. A missing or wrong secret returns 401 and does not touch the cache. A body without a usable `slug` or `slugs` regenerates `/` and every published slug. Listing posts happens before any `revalidate` call. A thrown fetch or zero published posts returns 500 and does not call `revalidate`. Paths then run together via `Promise.allSettled` with a concurrency cap of 4. The route sets `export const config = { maxDuration: 60 }` (and keeps `api.bodyParser: false`). The JSON body includes `results` with `{ path, ok, error? }` for every path. `paths` lists only the successes. Any failed path makes the response 500. That failed path is not replaced: `res.revalidate` updates a page only when `getStaticProps` succeeds, and that function throws on Notion failures. Other paths in the same request are still attempted and may update.
- ISR stays on. `revalidate` defaults to 3600 seconds (`REVALIDATE_SECONDS`), `fallback` is `"blocking"`. `GITHUB_ACTIONS` does not change the build. There is no `output: 'export'` path.
- Security headers come from `headers()` in `next.config.js`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and `Permissions-Policy` with camera, microphone, and geolocation disabled. Do not add a strict Content-Security-Policy; it would risk breaking Notion images.
- `<html lang>` is `zh-CN` in `src/pages/_document.tsx`. `@vercel/analytics` and `@vercel/speed-insights` mount in `_app` through the Pages Router entrypoints `@vercel/analytics/react` and `@vercel/speed-insights/react` (the `/next` entrypoints call `next/navigation` and do not work in the Pages Router).
- Do not major-upgrade `next`, `react`, or `react-dom`. Dependabot already ignores those major version updates, plus `@types/node` majors.
- Never commit secrets. `.env*.local` is gitignored. `REVALIDATE_SECRET` belongs on Vercel only.
- CI must pass before merge.

## Verify

```bash
npm ci
npm run typecheck
npm test
npm run smoke:notion
npm run build
```

`smoke:notion` and the build call the public Notion API and need network. Set `NOTION_PAGE_ID` or let the smoke script and CI use the public database id.
