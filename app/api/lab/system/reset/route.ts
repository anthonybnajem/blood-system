import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resetLabSystemData } from "@/lib/lab-sqlite-service";

function canManage(role?: string) {
  return role === "admin" || role === "manager";
}

export async function POST() {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = resetLabSystemData();

    return NextResponse.json({
      success: true,
      data,
      message: "Blood system records reset successfully",
    });
  } catch (error: any) {
    console.error("Blood system reset failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reset blood system data" },
      { status: 500 }
    );
  }
}
