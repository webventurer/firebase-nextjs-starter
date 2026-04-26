import { type NextRequest, NextResponse } from "next/server";
import { DEMO_CONFIG, isDemoToken, isDemoUser } from "@/lib/demo-config";
import { isAdminConfigured } from "@/lib/firebase-admin";

// Authentication middleware for API routes. Verifies a Firebase ID token from the
// Authorization: Bearer header and returns either the decoded {userId, email} or an
// error response ready to return from the route.

export interface AuthResult {
  userId: string;
  email?: string;
}

export interface AuthError {
  error: NextResponse;
}

export function isAuthError(
  result: AuthResult | AuthError,
): result is AuthError {
  return "error" in result;
}

// Verify the request's Authorization: Bearer token. Returns the decoded user
// or an AuthError holding the response to send back.
//
//   const auth = await verifyAuth(request);
//   if (isAuthError(auth)) return auth.error;
//   const userId = auth.userId;
export async function verifyAuth(
  request: NextRequest,
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Missing authentication token" },
        { status: 401 },
      ),
    };
  }

  if (DEMO_CONFIG.enabled && isDemoToken(token)) {
    return { userId: DEMO_CONFIG.userId, email: DEMO_CONFIG.email };
  }

  if (!isAdminConfigured) {
    return {
      error: NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      ),
    };
  }

  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    return { userId: decoded.uid, email: decoded.email };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 },
      ),
    };
  }
}

// Verify the authenticated user owns the resource. Returns null if OK, AuthError if not.
export function verifyOwnership(
  authUserId: string,
  resourceUserId: string,
): AuthError | null {
  // Demo users can only see demo resources
  if (DEMO_CONFIG.enabled && isDemoUser(authUserId)) {
    if (!isDemoUser(resourceUserId)) {
      return {
        error: NextResponse.json(
          { error: "Demo user cannot access this resource" },
          { status: 403 },
        ),
      };
    }
    return null;
  }

  if (authUserId !== resourceUserId) {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to access this resource" },
        { status: 403 },
      ),
    };
  }
  return null;
}
