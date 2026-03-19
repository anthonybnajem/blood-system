import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importLabSystemData, type LabSystemExport } from "@/lib/lab-sqlite-service";

function canManage(role?: string) {
  return role === "admin" || role === "manager";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing import file" }, { status: 400 });
    }

    const text = await file.text();
    const payload = JSON.parse(text) as LabSystemExport;
    const data = importLabSystemData(payload);

    return NextResponse.json({
      success: true,
      data,
      message: "Blood system data imported successfully",
    });
  } catch (error: any) {
    console.error("Blood system import failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to import blood system data" },
      { status: 500 }
    );
  }
}
