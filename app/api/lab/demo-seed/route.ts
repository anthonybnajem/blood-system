import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { seedDemoLabData } from "@/lib/lab-sqlite-service";

function canManage(role?: string) {
  return role === "admin" || role === "manager";
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const data = seedDemoLabData({
      patientCount: Number(body?.patientCount),
      createdBy: null,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error("Seed demo lab data failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to seed demo lab data" },
      { status: 500 }
    );
  }
}
