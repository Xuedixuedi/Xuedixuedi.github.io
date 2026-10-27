import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * Revalidate quickly so a transient Notion failure cannot freeze an empty
 * page in the ISR cache. GitHub Pages builds with `output: 'export'`, which
 * rejects `revalidate`, so that path stays a pure static export.
 */
export function withRevalidate<P extends Record<string, unknown>>(props: P) {
  if (process.env.GITHUB_ACTIONS) {
    return { props };
  }
  return { props, revalidate: 1 as const };
}

/** `next build` must fail instead of emitting an empty site. ISR may recover. */
export function rethrowIfBuild(error: unknown): void {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    throw error;
  }
}
