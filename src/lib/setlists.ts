import type { SetGroups, Setlist } from "./types";

type DbSetlist = {
  id: string;
  name: string;
  setCount: number;
  setsJson: string;
  setlistDocUrl: string | null;
  lyricsDocUrl: string | null;
  exportedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeSetGroups(sets: unknown, setCount: number): SetGroups {
  const safeCount = Math.min(3, Math.max(1, Math.trunc(setCount || 1)));
  const input = Array.isArray(sets) ? sets : [];

  return Array.from({ length: safeCount }, (_, index) => {
    const set = input[index];
    if (!Array.isArray(set)) {
      return [];
    }

    return set.filter((item): item is string => typeof item === "string");
  });
}

export function serializeSetGroups(sets: SetGroups): string {
  return JSON.stringify(normalizeSetGroups(sets, sets.length || 1));
}

export function deserializeSetGroups(setsJson: string, setCount: number): SetGroups {
  try {
    return normalizeSetGroups(JSON.parse(setsJson), setCount);
  } catch {
    return normalizeSetGroups([], setCount);
  }
}

export function toSetlist(record: DbSetlist): Setlist {
  return {
    id: record.id,
    name: record.name,
    setCount: record.setCount,
    sets: deserializeSetGroups(record.setsJson, record.setCount),
    setlistDocUrl: record.setlistDocUrl,
    lyricsDocUrl: record.lyricsDocUrl,
    exportedAt: record.exportedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
