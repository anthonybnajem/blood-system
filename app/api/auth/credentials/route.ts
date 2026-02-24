import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth-utils";
import { findEmployeeForAuthByEmail } from "@/lib/sqlite-auth";

/**
 * Credentials authentication endpoint backed by SQLite.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const employee = findEmployeeForAuthByEmail(email);
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, employee.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
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
