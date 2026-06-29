import { prisma } from "./prisma";
import { DEFAULT_GOOGLE_EXPORT_FOLDER_ID } from "./app-config";
import type { Settings } from "./types";

export async function getSetting(key: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? "";
}

export async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getSettings(): Promise<Settings> {
  const [googleFolderId, googleTokens] = await Promise.all([
    getSetting("googleFolderId"),
    getSetting("googleTokens"),
  ]);

  return {
    googleFolderId: googleFolderId || DEFAULT_GOOGLE_EXPORT_FOLDER_ID,
    googleConnected: Boolean(googleTokens),
  };
}
