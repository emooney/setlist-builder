import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, setSetting } from "@/lib/settings";

const settingsSchema = z.object({
  googleFolderId: z.string().trim().optional(),
});

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function PATCH(request: Request) {
  const body = settingsSchema.parse(await request.json());

  if (body.googleFolderId !== undefined) {
    await setSetting("googleFolderId", body.googleFolderId);
  }

  return NextResponse.json(await getSettings());
}
