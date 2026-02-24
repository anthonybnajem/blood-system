import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { auth } from "@/lib/auth";
import { getSqliteDbPath, readSqliteBackupBytes } from "@/lib/sqlite";

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session || (role !== "admin" && role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbPath = getSqliteDbPath();
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { error: "SQLite database file not found. Run db setup first." },
        { status: 404 }
      );
    }

    const fileBuffer = readSqliteBackupBytes();
    const fileName = `sqlite-backup-${new Date().toISOString().slice(0, 10)}${path.extname(
      dbPath
    ) || ".sqlite"}`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("SQLite backup failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to backup SQLite database" },
      { status: 500 }
    );
  }
}
