import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/lab-sqlite-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = getDashboardOverview();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Dashboard overview API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard overview" },
      { status: 500 }
    );
  }
}
