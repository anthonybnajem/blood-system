import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { catalogAction, getLabCatalog } from "@/lib/lab-catalog-service";

function canManage(role?: string) {
  return role === "admin" || role === "manager";
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = getLabCatalog();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Get lab catalog failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch lab catalog" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canManage(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body?.action || "");
    const payload = body?.payload ?? {};

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const data = catalogAction(action, payload);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Lab catalog action failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process action" },
      { status: 500 }
    );
  }
}
