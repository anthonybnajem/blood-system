import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrintableLabReport } from "@/lib/lab-sqlite-service";

type RouteContext = {
  params: Promise<{
    visitId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await context.params;
    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const data = getPrintableLabReport(visitId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Get printable lab report failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load printable lab report" },
      { status: 500 }
    );
  }
}
