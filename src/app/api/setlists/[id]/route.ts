import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSetGroups, serializeSetGroups, toSetlist } from "@/lib/setlists";

const setlistSchema = z.object({
  name: z.string().trim().min(1),
  setCount: z.number().int().min(1).max(3),
  sets: z.array(z.array(z.string())),
});

type Params = Promise<{ id: string }>;

export async function PATCH(request: Request, context: { params: Params }) {
  const { id } = await context.params;
  const body = setlistSchema.parse(await request.json());
  const sets = normalizeSetGroups(body.sets, body.setCount);
  const setlist = await prisma.setlist.update({
    where: { id },
    data: {
      name: body.name,
      setCount: body.setCount,
      setsJson: serializeSetGroups(sets),
    },
  });

  return NextResponse.json(toSetlist(setlist));
}

export async function DELETE(_request: Request, context: { params: Params }) {
  const { id } = await context.params;
  await prisma.setlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
