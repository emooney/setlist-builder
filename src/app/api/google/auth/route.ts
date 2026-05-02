import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET() {
  try {
    return NextResponse.redirect(getGoogleAuthUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google auth failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
