import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportLabSystemArchive } from "@/lib/lab-sqlite-service";

function canManage(role?: string) {
  return role === "admin" || role === "manager";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const archive = await exportLabSystemArchive();

    return new NextResponse(archive.bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=\"${archive.fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Blood system export failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export blood system data" },
      { status: 500 }
    );
  }
}
