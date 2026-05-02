import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const songSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().default(""),
});

export async function GET() {
  const songs = await prisma.song.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json(songs);
}

export async function POST(request: Request) {
  try {
    const body = songSchema.parse(await request.json());
    const song = await prisma.song.create({ data: body });
    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: songErrorMessage(error) }, { status: 400 });
  }
}

function songErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.includes("Unique constraint")) {
    return "A song with that title already exists.";
  }

  return error instanceof Error ? error.message : "Could not save song.";
}
