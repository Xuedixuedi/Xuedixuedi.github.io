export {};

const DEFAULT_PAGE_ID = "f93701d92ba04185952511e3d047bb4d";

async function main() {
  // Set before importing site.config, which reads NOTION_PAGE_ID at load time.
  process.env.NOTION_PAGE_ID ||= DEFAULT_PAGE_ID;

  const { getPage, getPosts } = await import("../src/lib/notion");
  const { unwrapRecord } = await import("../src/lib/notion-record");

  const posts = await getPosts();

  if (!Array.isArray(posts) || posts.length === 0) {
    console.error("Notion smoke check failed: expected published posts, got 0.");
    process.exit(1);
  }

  for (const post of posts) {
    if (!post.slug || !post.title) {
      console.error("Notion smoke check failed: post is missing a slug or title.", post);
      process.exit(1);
    }
    if (post.status !== "Published" || post.type !== "Post") {
      console.error("Notion smoke check failed: unpublished row leaked into getPosts.", post);
      process.exit(1);
    }
  }

  console.log(`Notion smoke check passed: ${posts.length} published post(s).`);
  for (const post of posts) {
    console.log(`- ${post.date || "no-date"}  ${post.slug}  ${post.title}`);
  }

  const sample = posts[0];
  const recordMap = await getPage(sample.id);
  const pageBlock = unwrapRecord<{ id?: string; type?: string }>(
    recordMap.block?.[sample.id],
  );

  if (!pageBlock || pageBlock.type !== "page") {
    console.error(
      `Notion smoke check failed: record map for "${sample.slug}" did not include a page block.`,
    );
    process.exit(1);
  }

  const blockCount = Object.keys(recordMap.block || {}).length;
  if (blockCount === 0) {
    console.error(`Notion smoke check failed: "${sample.slug}" returned no blocks.`);
    process.exit(1);
  }

  console.log(`Loaded post "${sample.slug}" (${blockCount} blocks).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
