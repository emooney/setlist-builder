import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "googleapis";
import { getAuthorizedClient } from "@/lib/google";
import { extractGoogleDocId, parseGoogleDocSongs, parseMasterDoc } from "@/lib/master-doc-parser";
import { prisma } from "@/lib/prisma";
import { songInputToData, toSong } from "@/lib/songs";

const importSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
});

async function fetchGoogleDocSongs(url: string) {
  const id = extractGoogleDocId(url);
  if (!id) {
    throw new Error("Please provide a valid Google Docs URL.");
  }

  const auth = await getAuthorizedClient();
  const docs = google.docs({ version: "v1", auth });
  const response = await docs.documents.get({
    documentId: id,
    includeTabsContent: true,
  });

  return parseGoogleDocSongs(response.data as Parameters<typeof parseGoogleDocSongs>[0]);
}

export async function POST(request: Request) {
  try {
    const body = importSchema.parse(await request.json());
    const songs = body.url
      ? await fetchGoogleDocSongs(body.url)
      : body.text?.trim()
        ? parseMasterDoc(body.text)
        : [];

    if (!songs.length) {
      return NextResponse.json({ error: "No songs were found to import." }, { status: 400 });
    }

    const saved = await prisma.$transaction(
      songs.map((song) =>
        prisma.song.upsert({
          where: { title: song.title },
          create: songInputToData({ title: song.title, lyrics: song.body }),
          update: songInputToData({ title: song.title, lyrics: song.body }),
        }),
      ),
    );

    return NextResponse.json({ imported: saved.length, songs: saved.map(toSong) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
