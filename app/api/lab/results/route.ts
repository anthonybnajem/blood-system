import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveVisitResults } from "@/lib/lab-sqlite-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const visitId = String(body?.visitId || "").trim();
    const entries = Array.isArray(body?.entries) ? body.entries : [];

    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    saveVisitResults({
      visitId,
      entries: entries.map((entry: any) => ({
        testId: String(entry?.testId || ""),
        value: String(entry?.value ?? ""),
        unit: entry?.unit ?? null,
      })),
      enteredBy: (session.user.id as string | undefined) || null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save visit results failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save visit results" },
      { status: 500 }
    );
  }
}
