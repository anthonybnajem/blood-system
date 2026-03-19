import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLabCatalog } from "@/lib/lab-catalog-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
    const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase() || "";
    const sortBy = request.nextUrl.searchParams.get("sortBy") || "displayName";
    const sortOrder = request.nextUrl.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const catalog = getLabCatalog();
    const panelMap = new Map(catalog.panels.map((panel) => [panel.panelId, panel.name]));

    const rows = catalog.tests
      .map((test) => ({
        ...test,
        panelName: panelMap.get(test.panelId) || "",
      }))
      .filter((test) => {
        const matchesQuery = !query
          ? true
          : [
              test.displayName,
              test.testCode,
              test.resultType,
              test.defaultUnit || "",
              test.panelName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);
        const testStatus = test.active ? "active" : "hidden";
        const matchesStatus = !status ? true : testStatus === status;
        return matchesQuery && matchesStatus;
      });

    rows.sort((a: any, b: any) => {
      const left = String(a?.[sortBy] ?? "");
      const right = String(b?.[sortBy] ?? "");
      const compared = left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortOrder === "asc" ? compared : -compared;
    });

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error("List tests API failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tests" },
      { status: 500 }
    );
  }
}
