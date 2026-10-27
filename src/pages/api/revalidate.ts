import type { NextApiRequest, NextApiResponse } from "next";
import { getPosts } from "@/lib/notion";
import {
  REVALIDATE_SECRET_HEADER,
  RevalidateRejected,
  providedSecrets,
  readRequestBody,
  runRevalidation,
} from "@/lib/revalidate";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isPost = (req.method ?? "GET").toUpperCase() === "POST";
    const body = isPost ? await readRequestBody(req) : undefined;
    const result = await runRevalidation({
      method: req.method,
      configuredSecret: process.env.REVALIDATE_SECRET,
      providedSecrets: providedSecrets({
        header: req.headers[REVALIDATE_SECRET_HEADER],
        authorization: req.headers.authorization,
        query: req.query.secret,
      }),
      body,
      listPublishedSlugs: async () => {
        const posts = await getPosts();
        return posts.map((post) => post.slug);
      },
      revalidate: (path) => res.revalidate(path),
    });

    if (result.status === 405) res.setHeader("Allow", "POST");
    res.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof RevalidateRejected) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    console.error("On-demand revalidation failed:", error);
    res.status(500).json({ message: "Error revalidating" });
  }
}
