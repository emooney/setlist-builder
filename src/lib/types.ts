export type Song = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SongInput = {
  title: string;
  body: string;
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
