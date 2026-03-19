import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createVisit, listVisits, listVisitsByPatient } from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const patientId = request.nextUrl.searchParams.get("patientId");
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "";
    const sortBy = request.nextUrl.searchParams.get("sortBy") || "visitDate";
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const limit = limitParam ? Number(limitParam) : 100;
    const data = patientId ? listVisitsByPatient(patientId, limit) : listVisits(limit);

    if (patientId) {
      return NextResponse.json({ data });
    }

    const rows = Array.isArray(data) ? data : [];
    const filtered = rows.filter((visit: any) => {
      const matchesQuery = !query
        ? true
        : [
            visit.patientName,
            visit.caseNo,
            visit.physicianName || "",
            visit.branch || "",
            visit.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
      const matchesStatus = !status ? true : String(visit.status || "").toLowerCase() === status;
      return matchesQuery && matchesStatus;
    });

    filtered.sort((a: any, b: any) => {
      const left = String(a?.[sortBy] ?? "");
      const right = String(b?.[sortBy] ?? "");
      const compared =
        sortBy === "visitDate" || sortBy === "updatedAt" || sortBy === "createdAt"
          ? new Date(left).getTime() - new Date(right).getTime()
          : sortBy === "patientReportCount"
            ? Number(a?.patientReportCount ?? 0) - Number(b?.patientReportCount ?? 0)
          : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
      return sortOrder === "asc" ? compared : -compared;
    });

    return NextResponse.json({ data: filtered });
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
