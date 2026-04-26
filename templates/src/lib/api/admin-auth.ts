import type { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { isAuthError, verifyAuth } from "@/lib/api/auth";
import { forbiddenError } from "@/lib/api/responses";

// Admin variant of verifyAuth — additionally checks the decoded email
// against the ADMIN_EMAILS whitelist. Returns 401 if not authenticated,
// 403 if authenticated but not an admin.
//
//   const auth = await verifyAdminAuth(request);
//   if (isAdminAuthError(auth)) return auth.error;
//   const { userId, email } = auth;

export interface AdminAuthResult {
  userId: string;
  email: string;
}

export interface AdminAuthError {
  error: NextResponse;
}

export function isAdminAuthError(
  result: AdminAuthResult | AdminAuthError,
): result is AdminAuthError {
  return "error" in result;
}

export async function verifyAdminAuth(
  request: NextRequest,
): Promise<AdminAuthResult | AdminAuthError> {
  const auth = await verifyAuth(request);
  if (isAuthError(auth)) return { error: auth.error };

  if (!auth.email || !isAdminEmail(auth.email)) {
    return { error: forbiddenError("Admin access required") };
  }

  return { userId: auth.userId, email: auth.email };
}
