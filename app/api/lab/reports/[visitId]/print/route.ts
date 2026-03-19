import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordVisitPrint } from "@/lib/lab-sqlite-service";

type RouteContext = {
  params: Promise<{
    visitId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await context.params;
    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const data = recordVisitPrint({
      visitId,
      printedBy: (session.user.id as string | undefined) ?? null,
    });
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Record visit print failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record report print" },
      { status: 500 }
    );
  }
}
