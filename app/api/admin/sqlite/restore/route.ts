import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { auth } from "@/lib/auth";
import { closeSqliteDb, getSqliteDbPath } from "@/lib/sqlite";

function hasValidSqliteExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".sqlite") || lower.endsWith(".db");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session || (role !== "admin" && role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing backup file" },
        { status: 400 }
      );
    }

    if (!hasValidSqliteExtension(file.name)) {
      return NextResponse.json(
        { error: "Invalid file type. Upload a .sqlite or .db backup file." },
        { status: 400 }
      );
    }

    const dbPath = getSqliteDbPath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    closeSqliteDb();

    // Keep last backup before overwrite for quick rollback.
    if (fs.existsSync(dbPath)) {
      const preRestorePath = `${dbPath}.pre-restore.bak`;
      fs.copyFileSync(dbPath, preRestorePath);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dbPath, bytes);

    return NextResponse.json({
      success: true,
      message: "SQLite database restored successfully",
    });
  } catch (error: any) {
    console.error("SQLite restore failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to restore SQLite database" },
      { status: 500 }
    );
  }
}
