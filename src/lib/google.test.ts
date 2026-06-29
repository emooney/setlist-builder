import { describe, expect, it } from "vitest";
import { buildLyricsDocument } from "./google";
import type { Song } from "./types";

describe("buildLyricsDocument", () => {
  it("builds a linked TOC and heading ranges for lyrics export", () => {
    const songs = new Map<string, Song>([
      ["skin", song("skin", "Skin Trade", "Weekend cue")],
      ["psycho", song("psycho", "Psycho Killer", "Cover cue")],
    ]);

    const document = buildLyricsDocument("Club Show", [["skin"], ["psycho"]], songs);

    expect(document.text).toContain("Table of Contents");
    expect(document.text).toContain("Set 1");
    expect(document.text).toContain("Set 2");
    expect(document.tocItemRanges.map((range) => range.songId)).toEqual(["skin", "psycho"]);
    expect(document.songHeadingRanges.map((range) => range.songId)).toEqual(["skin", "psycho"]);
    expect(document.backToTopRanges).toHaveLength(2);
  });
});

function song(id: string, title: string, body: string): Song {
  return {
    id,
    title,
    artist: "Duran Duran",
    performedBy: "The Duran Band",
    lyrics: body,
    performanceNotes: "",
    key: "",
    tempo: "",
    durationSeconds: null,
    tags: [],
    active: true,
    body,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}
