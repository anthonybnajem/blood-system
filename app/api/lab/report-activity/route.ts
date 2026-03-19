import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listPatientReportActivity } from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = request.nextUrl.searchParams.get("patientId");
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 50;

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const data = listPatientReportActivity(patientId, limit);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("List report activity failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch report activity" },
      { status: 500 }
    );
  }
}
