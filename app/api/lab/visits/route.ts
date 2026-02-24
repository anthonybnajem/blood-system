import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createVisit, listVisits } from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;
    const data = listVisits(limit);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("List visits API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch visits" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body?.patientId || typeof body.patientId !== "string") {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    const created = createVisit({
      patientId: body.patientId,
      caseNo: body.caseNo,
      physicianName: body.physicianName ?? null,
      branch: body.branch ?? null,
      notes: body.notes ?? null,
      createdBy: (session.user.id as string | undefined) ?? null,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("Create visit API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create visit" },
      { status: 500 }
    );
  }
}
