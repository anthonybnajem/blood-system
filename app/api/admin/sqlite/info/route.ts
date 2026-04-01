import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSqliteBackupDirPath, getSqliteDbPath } from "@/lib/sqlite";

export async function GET() {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session || (role !== "admin" && role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        dbPath: getSqliteDbPath(),
        backupDir: getSqliteBackupDirPath(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load SQLite info" },
      { status: 500 }
    );
  }
}
