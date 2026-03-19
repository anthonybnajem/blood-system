import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteVisit, getVisitEditorData, updateVisitMetadata } from "@/lib/lab-sqlite-service";

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

    const data = getVisitEditorData(visitId);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Get visit editor data failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load visit" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await context.params;
    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const data = deleteVisit({
      visitId,
      deletedBy: (session.user.id as string | undefined) ?? null,
      reason: typeof body?.reason === "string" ? body.reason : null,
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Delete visit failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete visit" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await context.params;
    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const data = updateVisitMetadata({
      visitId,
      caseNo: body?.caseNo,
      physicianName: body?.physicianName ?? null,
      branch: body?.branch ?? null,
      visitDate: body?.visitDate ?? null,
      updatedBy: (session.user.id as string | undefined) ?? null,
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Update visit failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update visit" },
      { status: 500 }
    );
  }
}
