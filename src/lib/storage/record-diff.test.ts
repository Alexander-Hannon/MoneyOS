import { describe, expect, it } from "vitest";
import { diffRecords, isEmptyDiff } from "@/lib/storage/record-diff";

describe("diffRecords", () => {
  const a = { id: "a", n: 1 };
  const b = { id: "b", n: 2 };

  it("finds additions, edits, and removals only", () => {
    const d = diffRecords([a, b], [{ id: "a", n: 9 }, { id: "c", n: 3 }]);
    expect(d.upserts).toEqual([{ id: "a", n: 9 }, { id: "c", n: 3 }]);
    expect(d.deletes).toEqual(["b"]);
  });

  it("is empty when nothing changed", () => {
    expect(isEmptyDiff(diffRecords([a, b], [{ ...a }, { ...b }]))).toBe(true);
  });
});
