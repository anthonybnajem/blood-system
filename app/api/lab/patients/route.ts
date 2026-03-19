import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createPatient,
  findPotentialDuplicatePatients,
  getPatientById,
  listPatients,
  updatePatient,
} from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const duplicateMode = request.nextUrl.searchParams.get("duplicates");
    const patientId = request.nextUrl.searchParams.get("patientId");
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
    const sortBy = request.nextUrl.searchParams.get("sortBy") || "updatedAt";
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const limit = limitParam ? Number(limitParam) : 100;
    const data =
      duplicateMode === "1"
        ? findPotentialDuplicatePatients({
            firstName: request.nextUrl.searchParams.get("firstName"),
            fatherName: request.nextUrl.searchParams.get("fatherName"),
            lastName: request.nextUrl.searchParams.get("lastName"),
            excludePatientId: request.nextUrl.searchParams.get("excludePatientId"),
            limit,
          })
        : patientId
          ? getPatientById(patientId)
          : listPatients(limit);

    if (patientId && !data) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (patientId || duplicateMode === "1") {
      return NextResponse.json({ data });
    }

    const rows = Array.isArray(data) ? data : [];
    const filtered = !query
      ? rows
      : rows.filter((patient) =>
          [
            patient.fullName,
            patient.gender,
            patient.phone || "",
            patient.location || "",
            patient.patientId,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );

    filtered.sort((a: any, b: any) => {
      const left = String(a?.[sortBy] ?? "");
      const right = String(b?.[sortBy] ?? "");
      const compared =
        sortBy === "updatedAt" || sortBy === "createdAt"
          ? new Date(left).getTime() - new Date(right).getTime()
          : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
      return sortOrder === "asc" ? compared : -compared;
    });

    return NextResponse.json({ data: filtered });
  } catch (error: any) {
    console.error("List patients API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch patients" },
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
    if (!body?.fullName || typeof body.fullName !== "string") {
      return NextResponse.json(
        { error: "fullName is required" },
        { status: 400 }
      );
    }

    const created = createPatient({
      fullName: body.fullName,
      firstName: body.firstName ?? null,
      fatherName: body.fatherName ?? null,
      lastName: body.lastName ?? null,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth ?? null,
      phone: body.phone ?? null,
      location: body.location ?? null,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("Create patient API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create patient" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body?.patientId || typeof body.patientId !== "string") {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }
    if (!body?.fullName || typeof body.fullName !== "string") {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }

    const updated = updatePatient({
      patientId: body.patientId,
      fullName: body.fullName,
      firstName: body.firstName ?? null,
      fatherName: body.fatherName ?? null,
      lastName: body.lastName ?? null,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth ?? null,
      phone: body.phone ?? null,
      location: body.location ?? null,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Update patient API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}
