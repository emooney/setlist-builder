import { describe, expect, it } from "vitest";
import { composeSongBody, songInputToData, toSong } from "./songs";

describe("song catalog helpers", () => {
  it("composes export body from structured database fields", () => {
    expect(composeSongBody({ lyrics: "Verse", performanceNotes: "Cue keys" })).toBe("Verse\n\nCue keys");
    expect(composeSongBody({ lyrics: "Verse", performanceNotes: "" })).toBe("Verse");
  });

  it("keeps legacy body compatibility while making lyrics authoritative", () => {
    const data = songInputToData({ title: "Rio", lyrics: "Lyrics", performanceNotes: "End cold", tags: ["opener"] });

    expect(data).toMatchObject({
      title: "Rio",
      artist: "Duran Duran",
      performedBy: "The Duran Band",
      lyrics: "Lyrics",
      performanceNotes: "End cold",
      tagsJson: '["opener"]',
      body: "Lyrics\n\nEnd cold",
    });
  });

  it("serializes database records with body fallback for pre-migration songs", () => {
    const song = toSong({
      id: "rio",
      title: "Rio",
      body: "Legacy body",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });

    expect(song.lyrics).toBe("Legacy body");
    expect(song.body).toBe("Legacy body");
    expect(song.performedBy).toBe("The Duran Band");
    expect(song.active).toBe(true);
  });
});
