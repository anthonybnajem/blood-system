import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPatientById } from "@/lib/lab-sqlite-service";

type RouteContext = {
  params: Promise<{
    patientId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientId } = await context.params;
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const data = getPatientById(patientId);
    if (!data) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Get patient API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch patient" },
      { status: 500 }
    );
  }
}
