export type Song = {
  id: string;
  title: string;
  artist: string;
  performedBy: string;
  lyrics: string;
  performanceNotes: string;
  key: string;
  tempo: string;
  durationSeconds: number | null;
  tags: string[];
  active: boolean;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SongInput = {
  title: string;
  artist?: string;
  performedBy?: string;
  lyrics?: string;
  performanceNotes?: string;
  key?: string;
  tempo?: string;
  durationSeconds?: number | null;
  tags?: string[];
  active?: boolean;
  body?: string;
};

export type SetGroups = string[][];

export type Setlist = {
  id: string;
  name: string;
  setCount: number;
  sets: SetGroups;
  setlistDocUrl: string | null;
  lyricsDocUrl: string | null;
  exportedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  googleFolderId: string;
  googleConnected: boolean;
};
