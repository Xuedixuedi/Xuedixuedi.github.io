import { NotionAPI } from "notion-client";
import { ExtendedRecordMap } from "notion-types";
import { CONFIG } from "../../site.config";

export const notion = new NotionAPI();

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  const recordMap = await notion.getPage(pageId);
  return recordMap;
}

type Post = {
  id: string;
  title: string;
  slug: string;
  date: any;
  tags: string[];
  summary: string;
  thumbnail: any;
  type: string;
  status: string;
};

export async function getPosts() {
  // 1. 获取根页面
  const pageId = CONFIG.notionConfig.pageId;
  console.log("Fetching page:", pageId);
  const recordMap = await getPage(pageId);
  // console.log('RecordMap keys:', Object.keys(recordMap))

  // 2. 解析 Collection View (假设根页面是一个 Database)
  // 如果不是 Database，可能需要递归查找子页面，这里简化处理，假设是 Database
  const collection = Object.values(recordMap.collection)[0]?.value;
  const collectionView = Object.values(recordMap.collection_view)[0]?.value;

  if (!collection || !collectionView) {
    console.warn("No collection found via pageId:", pageId);
    console.log("recordMap.collection:", recordMap.collection);
    console.log("recordMap.collection_view:", recordMap.collection_view);
    return [];
  }

  // 3. 获取所有 Block
  const block = recordMap.block;
  const schema = collection.schema;
  console.log("Database Schema:", JSON.stringify(schema, null, 2));

  // 4. 遍历 Collection View 中的 Page
  let pageIds = (collectionView as any).page_sort_idx;
  if (!pageIds) {
    const collectionId = Object.keys(recordMap.collection)[0];
    const collectionViewId = Object.keys(recordMap.collection_view)[0];
    const query = (recordMap as any).collection_query?.[collectionId]?.[
      collectionViewId
    ];
    if (query?.collection_group_results?.blockIds) {
      pageIds = query.collection_group_results.blockIds;
    }
  }

  if (!pageIds) {
    console.warn(
      "Could not find pageIds in collectionView or collection_query",
    );
    console.log("CollectionView keys:", Object.keys(collectionView));
    return [];
  }

  const rawMetadata = pageIds.map((id: string) => block[id]?.value);
  console.log("Found raw pages:", rawMetadata.length);

  // 5. 格式化数据
  const posts = rawMetadata
    .filter((post: any) => post && post.type === "page" && post.properties)
    .map((post: any): Post => {
      const properties = post.properties || {};

      // 获取属性值
      const getProperty = (name: string) => {
        const propId = Object.keys(schema).find(
          (key) => schema[key].name === name,
        );
        if (!propId || !properties[propId]) return null;

        const val = properties[propId][0];

        // Handle Date property (e.g. [['‣', [['d', {'type': 'date', 'start_date': '2023-01-01'}]]]])
        if (val[1] && val[1][0] && val[1][0][0] === "d") {
          return val[1][0][1].start_date;
        }
        // Handle Files & media property
        if (val[1] && val[1][0] && val[1][0][0] === "a") {
          const url = val[1][0][1];
          // Use Notion's image proxy for S3 links to ensure access
          if (url.indexOf("amazonaws.com") > 0) {
            return `https://www.notion.so/image/${encodeURIComponent(url)}?table=block&id=${post.id}&cache=v2`;
          }
          return url;
        }

        // Handle Files & media property for uploaded files (Notion internal files)
        // e.g. [["filename.png", [["a", "https://prod-files-secure.s3.us-west-2.amazonaws.com/..."]]]]
        // The structure is actually the same as external files usually, but sometimes it might be different.
        // Let's also check if it's just a file property without 'a' decorator but maybe 'file' type?
        // Actually, sometimes val[1] is [['a', url]] but we need to be careful.

        // Let's try to return the signed URL if possible.
        // For debugging, we just rely on the log above.

        return val[0];
      };

      const p = {
        id: post.id,
        title:
          getProperty("Title") ||
          getProperty("Name") ||
          post.properties.title[0][0] ||
          "Untitled",
        slug: getProperty("Slug") || post.id,
        date: getProperty("Date") || post.created_time,
        tags: getProperty("Tags")
          ? (
              properties[
                Object.keys(schema).find((key) => schema[key].name === "Tags")!
              ][0][0] as string
            ).split(",")
          : [],
        summary: getProperty("Summary") || "",
        thumbnail: getProperty("Thumbnail") || null,
        type: getProperty("Type") || "Post",
        status: getProperty("Status") || "Published",
      };
      // console.log('Parsed post:', p.title, 'Type:', p.type, 'Status:', p.status)
      return p;
    });

  console.log("Total posts parsed:", posts.length);
  const publishedPosts = posts.filter(
    (post: Post) => post.status === "Published" && post.type === "Post",
  );
  console.log("Published posts:", publishedPosts.length);

  if (posts.length > 0 && publishedPosts.length === 0) {
    console.warn(
      'Found posts but none match filter: status==="Published" && type==="Post"',
    );
    console.warn("Sample post status:", posts[0].status);
    console.warn("Sample post type:", posts[0].type);
  }

  // 过滤已发布的文章
  return publishedPosts;
}
