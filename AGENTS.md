# AGENTS.md

## Overview

Next.js (Pages Router) blog. A public Notion database is the CMS, fetched with `notion-client` (no integration token). Vercel serves ISR pages. GitHub Actions sets `GITHUB_ACTIONS`, which switches `next.config.js` to `output: 'export'` and drops the `.ts` API route so GitHub Pages can host `out/`.

Production site: https://blog-xuedixuedi.vercel.app

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

`npm run lint` is `next lint`. Next.js 16 does not provide that command (`next` treats `lint` as a directory and exits). CI does not run it. Leave the script as it is unless asked to change tooling.

CI (`.github/workflows/ci.yml`) on push and pull_request:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run smoke:notion` (also runs on the daily schedule)
5. `env -u GITHUB_ACTIONS npm run build` with `NOTION_PAGE_ID` set
6. `rm -rf .next out`
7. `npm run build` with `GITHUB_ACTIONS` still set (static export)

`npm test` runs `src/lib/notion-record.test.ts`, `src/lib/static-props.test.ts`, `src/lib/revalidate.test.ts`, and `src/lib/next-config.test.ts`.

## Directory map

```
site.config.js                 profile, blog copy, Notion page id, utterances
next.config.js                 ISR config; static export when GITHUB_ACTIONS is set
src/pages/index.tsx            home page, getStaticProps
src/pages/[slug].tsx           post page, getStaticPaths / getStaticProps
src/pages/api/revalidate.ts    POST /api/revalidate
src/lib/notion.ts              getPosts / getPage, property parsing, published filter
src/lib/notion-record.ts       record-map unwrapping and collection page ids
src/lib/static-props.ts        revalidate interval, fallback, empty-page guards
src/lib/revalidate.ts          secret check, slug parsing, which paths to regenerate
src/components/                UI (header, list, Notion code block, utterances)
src/styles/                    global and code-block CSS
scripts/notion-smoke.ts        fails if the public database returns no published post
public/                        avatar.png only
.github/workflows/ci.yml       typecheck, tests, smoke, both builds
.github/workflows/deploy.yml   GitHub Pages static deploy
.github/dependabot.yml         security updates only
```

## Hard constraints

- Notion fetch failures must keep the previous page. `getPosts` throws when `NOTION_PAGE_ID` is empty, the collection is missing, there are zero rows, or zero rows are `Type === "Post"` and `Status === "Published"`. `assertPublishedPosts` and `assertRecordMap` throw on an empty list or a post with no blocks. `getStaticProps` must keep throwing: Next.js preserves the last good ISR page only when generation throws. A successful empty payload would be cached in its place.
- `/api/revalidate` stays POST-only. The secret is `REVALIDATE_SECRET`, accepted from `?secret=`, `x-revalidate-secret`, or `Authorization: Bearer`, compared with SHA-256 and `timingSafeEqual`. A missing or wrong secret returns 401 and does not touch the cache. A body without a usable `slug` or `slugs` regenerates `/` and every published slug. Listing posts happens before any `revalidate` call. A thrown fetch, zero published posts, or a failed `revalidate` returns 500 and does not replace a cached page.
- ISR stays on for the Vercel build: `revalidate` defaults to 3600 seconds (`REVALIDATE_SECONDS`), `fallback` is `"blocking"`. The GitHub Actions build stays a pure static export (`revalidate` omitted, `fallback: false`, API route excluded).
- Do not major-upgrade `next`, `react`, or `react-dom`. Dependabot already ignores those major version updates, plus `@types/node` majors.
- Never commit secrets. `.env*.local` is gitignored. `REVALIDATE_SECRET` belongs on Vercel only.
- CI must pass before merge.

## Verify

```bash
npm ci
npm run typecheck
npm test
npm run smoke:notion
env -u GITHUB_ACTIONS npm run build
rm -rf .next out
# static export; GITHUB_ACTIONS is already set on GitHub-hosted runners
GITHUB_ACTIONS=true npm run build
```

`smoke:notion` and both builds call the public Notion API and need network. Unset `GITHUB_ACTIONS` for the Vercel-style build if the shell inherited it.
