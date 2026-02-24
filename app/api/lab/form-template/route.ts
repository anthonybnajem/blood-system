import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLabEntryTemplate } from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = request.nextUrl.searchParams.get("patientId") || undefined;
    const data = getLabEntryTemplate(patientId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Get lab form template failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load form template" },
      { status: 500 }
    );
  }
}
