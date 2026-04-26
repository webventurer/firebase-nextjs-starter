import { NextResponse } from "next/server";

// Standard JSON response helpers. Use these in API routes so every endpoint
// returns the same shape: { error: string, details?, code? } on failure,
// or the raw data object on success.

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

export function successResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiError> {
  const body: ApiError = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function badRequestError(message: string, details?: unknown) {
  return errorResponse(message, 400, details);
}

export function validationError(field: string, message: string) {
  return errorResponse(`Invalid ${field}: ${message}`, 400, { field });
}

export function unauthorizedError(message = "Authentication required") {
  return errorResponse(message, 401);
}

export function forbiddenError(
  message = "You do not have permission to access this resource",
) {
  return errorResponse(message, 403);
}

export function notFoundError(resource = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

export function conflictError(message: string) {
  return errorResponse(message, 409);
}

export function rateLimitError(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function serverError(message = "An unexpected error occurred") {
  return errorResponse(message, 500);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

export function handleError(error: unknown, defaultMessage?: string) {
  console.error("API Error:", error);
  return serverError(defaultMessage || getErrorMessage(error));
}
