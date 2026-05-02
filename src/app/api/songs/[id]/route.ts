import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const songSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().default(""),
});

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  try {
    const { id } = await context.params;
    const body = songSchema.parse(await request.json());
    const song = await prisma.song.update({ where: { id }, data: body });
    return NextResponse.json(song);
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
