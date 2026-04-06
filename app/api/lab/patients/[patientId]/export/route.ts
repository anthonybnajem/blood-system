import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportPatientArchive } from "@/lib/lab-sqlite-service";

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

    const archive = await exportPatientArchive(patientId);
    return new NextResponse(archive.bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=\"${archive.fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Patient export failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export patient" },
      { status: 500 }
    );
  }
}
