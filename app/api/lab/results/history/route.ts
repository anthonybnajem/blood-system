import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listRecentResults } from "@/lib/lab-sqlite-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
    const flag = request.nextUrl.searchParams.get("flag")?.trim().toLowerCase() || "";
    const sortBy = request.nextUrl.searchParams.get("sortBy") || "updatedAt";
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const limit = limitParam ? Number(limitParam) : 100;
    const data = listRecentResults(limit);

    const filtered = data.filter((row: any) => {
      const matchesQuery = !query
        ? true
        : [
            row.patientName,
            row.caseNo,
            row.testName,
            row.testCode,
            row.value,
            row.unit || "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
      const matchesFlag = !flag ? true : String(row.abnormalFlag || "").toLowerCase() === flag;
      return matchesQuery && matchesFlag;
    });

    filtered.sort((a: any, b: any) => {
      const left = String(a?.[sortBy] ?? "");
      const right = String(b?.[sortBy] ?? "");
      const compared =
        sortBy === "updatedAt"
          ? new Date(left).getTime() - new Date(right).getTime()
          : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
      return sortOrder === "asc" ? compared : -compared;
    });

    return NextResponse.json({ data: filtered });
  } catch (error: any) {
    console.error("List recent results API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch recent results" },
      { status: 500 }
    );
  }
}
