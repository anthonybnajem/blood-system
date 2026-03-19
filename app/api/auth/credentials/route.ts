import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";
import { findEmployeeForAuth } from "@/lib/sqlite-auth";

/**
 * Credentials authentication endpoint backed by SQLite.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const employee = findEmployeeForAuth(username);
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, employee.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    });
  } catch (error: any) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
