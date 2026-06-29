import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSetlistText, createGoogleDoc, createLyricsGoogleDoc } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { deserializeSetGroups, toSetlist } from "@/lib/setlists";
import { getSetting } from "@/lib/settings";
import { DEFAULT_GOOGLE_EXPORT_FOLDER_ID } from "@/lib/app-config";
import { toSong } from "@/lib/songs";

const exportSchema = z.object({
  setlistId: z.string(),
});

export async function POST(request: Request) {
  try {
    const { setlistId } = exportSchema.parse(await request.json());
    const setlist = await prisma.setlist.findUnique({ where: { id: setlistId } });

    if (!setlist) {
      return NextResponse.json({ error: "Setlist not found." }, { status: 404 });
    }

    const sets = deserializeSetGroups(setlist.setsJson, setlist.setCount);
    const songIds = [...new Set(sets.flat())];
    const songs = await prisma.song.findMany({ where: { id: { in: songIds } } });
    const songMap = new Map(songs.map((song) => [song.id, toSong(song)]));
    const folderId = (await getSetting("googleFolderId")) || DEFAULT_GOOGLE_EXPORT_FOLDER_ID;

    const setlistDocUrl = await createGoogleDoc(
      `${setlist.name} - Setlist`,
      buildSetlistText(setlist.name, sets, songMap),
      folderId,
    );
    const lyricsDocUrl = await createLyricsGoogleDoc(
      `${setlist.name} - Lyrics`,
      setlist.name,
      sets,
      songMap,
      folderId,
    );

    const updated = await prisma.setlist.update({
      where: { id: setlist.id },
      data: { setlistDocUrl, lyricsDocUrl, exportedAt: new Date() },
    });

    return NextResponse.json(toSetlist(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
