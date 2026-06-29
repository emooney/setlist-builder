import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { songInputToData, toSong } from "@/lib/songs";
import { BAND_NAME } from "@/lib/app-config";

const songSchema = z.object({
  title: z.string().trim().min(1),
  artist: z.string().trim().default("Duran Duran"),
  performedBy: z.string().trim().default(BAND_NAME),
  lyrics: z.string().default(""),
  performanceNotes: z.string().default(""),
  key: z.string().trim().default(""),
  tempo: z.string().trim().default(""),
  durationSeconds: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  active: z.boolean().default(true),
  body: z.string().optional(),
});

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const body = songSchema.parse(await request.json());
    const song = await prisma.song.update({ where: { id }, data: songInputToData(body) });
    return NextResponse.json(toSong(song));
  } catch (error) {
    return NextResponse.json({ error: songErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Params }) {
  const { id } = await context.params;
  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function songErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("Unique constraint")) {
    return "A song with that title already exists.";
  }

  return error instanceof Error ? error.message : "Could not save song.";
}
