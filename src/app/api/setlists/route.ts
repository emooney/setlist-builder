import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeSetGroups, serializeSetGroups, toSetlist } from "@/lib/setlists";

const setlistSchema = z.object({
  name: z.string().trim().min(1),
  setCount: z.number().int().min(1).max(3),
  sets: z.array(z.array(z.string())),
});

export async function GET() {
  const setlists = await prisma.setlist.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(setlists.map(toSetlist));
}

export async function POST(request: Request) {
  const body = setlistSchema.parse(await request.json());
  const sets = normalizeSetGroups(body.sets, body.setCount);
  const setlist = await prisma.setlist.create({
    data: {
      name: body.name,
      setCount: body.setCount,
      setsJson: serializeSetGroups(sets),
    },
  });

  return NextResponse.json(toSetlist(setlist), { status: 201 });
}
