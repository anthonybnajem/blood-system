import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportLabSystemData } from "@/lib/lab-sqlite-service";

function canManage(role?: string) {
  return role === "admin" || role === "manager";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = exportLabSystemData();
    const fileName = `blood-system-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
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
