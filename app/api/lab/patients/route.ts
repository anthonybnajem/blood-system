import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPatient, listPatients } from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;
    const data = listPatients(limit);
    return NextResponse.json({ data });
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
      gender: body.gender,
      dateOfBirth: body.dateOfBirth ?? null,
      phone: body.phone ?? null,
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
