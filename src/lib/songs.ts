import { BAND_NAME } from "./app-config";
import type { Song, SongInput } from "./types";

type DbSong = {
  id: string;
  title: string;
  artist?: string | null;
  performedBy?: string | null;
  lyrics?: string | null;
  performanceNotes?: string | null;
  key?: string | null;
  tempo?: string | null;
  durationSeconds?: number | null;
  tagsJson?: string | null;
  active?: boolean | null;
  body?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_ARTIST = "Duran Duran";

export function composeSongBody(song: Pick<Song, "lyrics" | "performanceNotes">) {
  return [song.lyrics.trim(), song.performanceNotes.trim()].filter(Boolean).join("\n\n");
}

export function songInputToData(input: SongInput) {
  const lyrics = input.lyrics ?? input.body ?? "";
  const performanceNotes = input.performanceNotes ?? "";

  return {
    title: input.title,
    artist: input.artist || DEFAULT_ARTIST,
    performedBy: input.performedBy || BAND_NAME,
    lyrics,
    performanceNotes,
    key: input.key ?? "",
    tempo: input.tempo ?? "",
    durationSeconds: input.durationSeconds ?? null,
    tagsJson: JSON.stringify(input.tags ?? []),
    active: input.active ?? true,
    body: composeSongBody({ lyrics, performanceNotes }),
  };
}

export function toSong(record: DbSong): Song {
  const lyrics = record.lyrics || record.body || "";
  const performanceNotes = record.performanceNotes || "";
  const tags = parseTags(record.tagsJson);

  return {
    id: record.id,
    title: record.title,
    artist: record.artist || DEFAULT_ARTIST,
    performedBy: record.performedBy || BAND_NAME,
    lyrics,
    performanceNotes,
    key: record.key || "",
    tempo: record.tempo || "",
    durationSeconds: record.durationSeconds ?? null,
    tags,
    active: record.active ?? true,
    body: record.body || composeSongBody({ lyrics, performanceNotes }),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function parseTags(tagsJson?: string | null) {
  if (!tagsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}
