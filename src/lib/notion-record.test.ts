import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCollectionPageIds, unwrapRecord } from "./notion-record";

const block = {
  id: "page-1",
  type: "page",
  properties: { title: [["Hello"]] },
};

describe("unwrapRecord", () => {
  it("returns an already unwrapped block", () => {
    assert.equal(unwrapRecord<typeof block>(block)?.id, "page-1");
  });

  it("unwraps the legacy { value, role } shape", () => {
    const value = unwrapRecord<typeof block>({ role: "reader", value: block });
    assert.equal(value?.id, "page-1");
    assert.equal(value?.type, "page");
  });

  it("unwraps the current { spaceId, value: { value, role } } shape", () => {
    const value = unwrapRecord<typeof block>({
      spaceId: "space",
      value: { role: "reader", value: block },
    });
    assert.equal(value?.id, "page-1");
  });

  it("unwraps a nested payload that has no block id", () => {
    const value = unwrapRecord<{ blockIds: string[] }>({
      value: { role: "reader", value: { blockIds: ["x"] } },
    });
    assert.deepEqual(value?.blockIds, ["x"]);
  });

  it("returns undefined for empty input", () => {
    assert.equal(unwrapRecord(null), undefined);
    assert.equal(unwrapRecord(undefined), undefined);
  });
});

describe("getCollectionPageIds", () => {
  const collectionId = "col-1";

  it("prefers reducer blockIds over a stale page_sort", () => {
    const ids = getCollectionPageIds(
      {
        collection_query: {
          [collectionId]: {
            view: {
              collection_group_results: {
                type: "results",
                blockIds: ["a", "b"],
                hasMore: false,
              },
            },
          },
        },
      },
      collectionId,
      { page_sort: ["stale"], page_sort_idx: ["older"] },
    );
    assert.deepEqual(ids, ["a", "b"]);
  });

  it("reads the legacy query result blockIds", () => {
    const ids = getCollectionPageIds(
      {
        collection_query: {
          [collectionId]: {
            view: { type: "table", blockIds: ["legacy"], total: 1 },
          },
        },
      },
      collectionId,
      { page_sort: ["stale"] },
    );
    assert.deepEqual(ids, ["legacy"]);
  });

  it("uses the longer reducer when views disagree", () => {
    const ids = getCollectionPageIds(
      {
        collection_query: {
          [collectionId]: {
            filtered: { collection_group_results: { blockIds: ["only"] } },
            all: { collection_group_results: { blockIds: ["a", "b", "c"] } },
          },
        },
      },
      collectionId,
      { page_sort: ["stale"] },
    );
    assert.deepEqual(ids, ["a", "b", "c"]);
  });

  it("falls back to page_sort_idx then page_sort", () => {
    assert.deepEqual(
      getCollectionPageIds({ collection_query: {} }, collectionId, {
        page_sort_idx: ["idx"],
        page_sort: ["sort"],
      }),
      ["idx"],
    );
    assert.deepEqual(
      getCollectionPageIds({}, collectionId, { page_sort: ["sort"] }),
      ["sort"],
    );
  });

  it("does not treat an empty reducer result as missing", () => {
    const ids = getCollectionPageIds(
      {
        collection_query: {
          [collectionId]: {
            view: { collection_group_results: { blockIds: [] } },
          },
        },
      },
      collectionId,
      { page_sort: ["stale"] },
    );
    assert.deepEqual(ids, []);
  });
});
