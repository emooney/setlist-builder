import { describe, expect, it } from "vitest";
import { parseGoogleDocSongs, parseMasterDoc } from "./master-doc-parser";

describe("parseMasterDoc", () => {
  it("imports canonical song sections after the index", () => {
    const songs = parseMasterDoc(`
The Duran Band
Planet Earth
Skin Trade
Psycho Killer
________________
Planet Earth
Intro cue
First line
Back to top
________________
Skin Trade
Weekend cue
Skin line
Back to top
________________
Psycho Killer
Talking Heads cover cue
Psycho line
Back to top
________________
`);

    expect(songs.map((song) => song.title)).toEqual(["Planet Earth", "Skin Trade", "Psycho Killer"]);
    expect(songs[1].body).toContain("Weekend cue");
    expect(songs[2].body).toContain("Talking Heads cover cue");
  });
});

describe("parseGoogleDocSongs", () => {
  it("uses Heading 1 song sections and ignores the native table of contents", () => {
    const songs = parseGoogleDocSongs({
      tabs: [
        {
          body: {
            content: [
              h1("The Duran Band"),
              { tableOfContents: {} },
              h1("Skin Trade"),
              normal("Weekend cue"),
              normal("Skin lyric"),
              backToTop(),
              h1("Some Like It Hot"),
              normal("Heat lyric"),
              backToTop(),
              h1("Psycho Killer"),
              normal("Cover cue"),
              normal("Run away"),
              backToTop(),
              h1("Rio"),
              normal("Rio lyric"),
              backToTop(),
            ],
          },
        },
      ],
    });

    expect(songs.map((song) => song.title)).toEqual(["Skin Trade", "Some Like It Hot", "Psycho Killer", "Rio"]);
    expect(songs.find((song) => song.title === "Psycho Killer")?.body).toBe("Cover cue\nRun away");
    expect(songs.find((song) => song.title === "Rio")?.body).not.toContain("Back to Top");
  });
});

function h1(text: string) {
  return {
    paragraph: {
      elements: [{ textRun: { content: `${text}\n` } }],
      paragraphStyle: { namedStyleType: "HEADING_1" },
    },
  };
}

function normal(text: string) {
  return {
    paragraph: {
      elements: [{ textRun: { content: `${text}\n` } }],
      paragraphStyle: { namedStyleType: "NORMAL_TEXT" },
    },
  };
}

function backToTop() {
  return {
    paragraph: {
      elements: [{ textRun: { content: "Back to Top" } }, { pageBreak: {} }, { textRun: { content: "\n" } }],
      paragraphStyle: { namedStyleType: "NORMAL_TEXT" },
    },
  };
}
