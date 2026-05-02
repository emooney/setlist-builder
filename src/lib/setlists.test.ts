import { describe, expect, it } from "vitest";
import { deserializeSetGroups, normalizeSetGroups, serializeSetGroups } from "./setlists";

describe("setlist serialization", () => {
  it("keeps one to three ordered sets", () => {
    const sets = normalizeSetGroups([["a", "b"], ["c"], ["d"], ["ignored"]], 3);
    expect(sets).toEqual([["a", "b"], ["c"], ["d"]]);
    expect(deserializeSetGroups(serializeSetGroups(sets), 3)).toEqual(sets);
  });

  it("falls back safely for invalid payloads", () => {
    expect(deserializeSetGroups("nope", 2)).toEqual([[], []]);
  });
});
