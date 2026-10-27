import { NotionAPI } from "notion-client";
import { ExtendedRecordMap } from "notion-types";
import { getBlockValue, getDateValue, getTextContent, idToUuid, uuidToId } from "notion-utils";
import { CONFIG } from "../../site.config";
import { getCollectionPageIds, unwrapRecord } from "./notion-record";

export const notion = new NotionAPI();

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  return notion.getPage(pageId);
}

export type Post = {
  id: string;
  title: string;
  slug: string;
  date: string;
  tags: string[];
  summary: string;
  thumbnail: string | null;
  type: string;
  status: string;
};

type Schema = Record<string, { name?: string; type?: string } | undefined>;
type PageBlock = {
  id: string;
  type?: string;
  properties?: Record<string, unknown>;
  created_time?: number;
};

function findSchemaId(schema: Schema, name: string): string | undefined {
  return Object.keys(schema).find((key) => schema[key]?.name === name);
}

function plainText(value: unknown): string {
  return getTextContent(value as Parameters<typeof getTextContent>[0]).trim();
}

function listValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const parts: string[] = [];
  for (const segment of value) {
    const text = Array.isArray(segment) ? segment[0] : segment;
    if (typeof text !== "string" || text === "‣" || text === "⁍") continue;
    for (const piece of text.split(",")) {
      const trimmed = piece.trim();
      if (trimmed) parts.push(trimmed);
    }
  }
  return parts;
}

function findFileUrl(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  if (value[0] === "a" && typeof value[1] === "string") return value[1];
  for (const part of value) {
    const found = findFileUrl(part);
    if (found) return found;
  }
  return undefined;
}

function toPublicImageUrl(url: string, blockId: string): string {
  if (url.includes("amazonaws.com")) {
    return `https://www.notion.so/image/${encodeURIComponent(url)}?table=block&id=${blockId}&cache=v2`;
  }
  return url;
}

function readDate(value: unknown, createdTime?: number): string {
  const date = Array.isArray(value) ? getDateValue(value) : null;
  if (date?.start_date) return date.start_date;
  if (typeof createdTime === "number" && createdTime > 0) {
    return new Date(createdTime).toISOString();
  }
  return "";
}

function lookupBlock(
  blockMap: ExtendedRecordMap["block"],
  id: string,
): PageBlock | undefined {
  const keys = Array.from(new Set([id, uuidToId(id), idToUuid(uuidToId(id))]));
  for (const key of keys) {
    const block = getBlockValue(blockMap[key]) as PageBlock | undefined;
    if (block) return block;
  }
  return undefined;
}

function readProperty(schema: Schema, properties: Record<string, unknown>, name: string) {
  const propId = findSchemaId(schema, name);
  if (!propId) return undefined;
  return properties[propId];
}

export async function getPosts(): Promise<Post[]> {
  const pageId = CONFIG.notionConfig.pageId;
  if (!pageId) {
    throw new Error(
      "NOTION_PAGE_ID is empty. Set it to the public Notion database page id.",
    );
  }

  console.log("Fetching Notion database:", pageId);
  const recordMap = await notion.getPage(pageId, {
    throwOnCollectionErrors: true,
  });

  const collections = Object.entries(recordMap.collection)
    .map(([id, raw]) => ({ id, collection: unwrapRecord<{ schema?: Schema }>(raw) }))
    .filter((entry) => entry.collection?.schema);

  if (collections.length === 0) {
    throw new Error(`No Notion collection found for page ${pageId}.`);
  }

  const views = Object.values(recordMap.collection_view)
    .map((raw) => unwrapRecord<{ page_sort?: string[]; page_sort_idx?: string[] }>(raw))
    .filter((view): view is { page_sort?: string[]; page_sort_idx?: string[] } => Boolean(view));
  const fallbackView = views.reduce<(typeof views)[number] | undefined>((best, view) => {
    const lengthOf = (entry: { page_sort?: string[]; page_sort_idx?: string[] } | undefined) =>
      entry?.page_sort_idx?.length || entry?.page_sort?.length || 0;
    return lengthOf(view) > lengthOf(best) ? view : best;
  }, undefined);

  let schema: Schema | undefined;
  let pageIds: string[] = [];
  for (const { id, collection } of collections) {
    const ids = getCollectionPageIds(recordMap, id, fallbackView);
    if (ids.length >= pageIds.length) {
      pageIds = ids;
      schema = collection?.schema;
    }
  }

  if (!schema) {
    throw new Error(`Notion collection for page ${pageId} has no schema.`);
  }

  if (pageIds.length === 0) {
    throw new Error(
      `Notion collection for page ${pageId} returned no rows. Refusing to build an empty blog.`,
    );
  }

  const posts = pageIds
    .map((id) => lookupBlock(recordMap.block, id))
    .filter((block): block is PageBlock => Boolean(block && block.type === "page" && block.properties))
    .map((block): Post => {
      const properties = block.properties || {};
      const title =
        plainText(readProperty(schema, properties, "Title")) ||
        plainText(readProperty(schema, properties, "Name")) ||
        plainText(properties.title) ||
        "Untitled";
      const slug = plainText(readProperty(schema, properties, "Slug")) || block.id;
      const fileUrl = findFileUrl(readProperty(schema, properties, "Thumbnail"));

      return {
        id: block.id,
        title,
        slug,
        date: readDate(readProperty(schema, properties, "Date"), block.created_time),
        tags: listValues(readProperty(schema, properties, "Tags")),
        summary: plainText(readProperty(schema, properties, "Summary")),
        thumbnail: fileUrl ? toPublicImageUrl(fileUrl, block.id) : null,
        type: plainText(readProperty(schema, properties, "Type")) || "Post",
        status: plainText(readProperty(schema, properties, "Status")) || "Published",
      };
    });

  const publishedPosts = posts.filter(
    (post) => post.status === "Published" && post.type === "Post",
  );
  console.log(
    `Notion rows: ${posts.length}, published posts: ${publishedPosts.length}`,
  );

  if (publishedPosts.length === 0) {
    const sample = posts
      .slice(0, 5)
      .map((post) => `${post.slug}: status=${post.status} type=${post.type}`)
      .join("; ");
    throw new Error(
      `No published posts in Notion database ${pageId} (parsed ${posts.length} row(s)${sample ? `; sample: ${sample}` : ""}).`,
    );
  }

  return publishedPosts;
}
