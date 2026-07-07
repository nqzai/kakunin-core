import { NextResponse } from 'next/server';

type ErrorBody = { error: string };

export function errorResponse(
  message: string,
  status: number,
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message }, { status });
}

export function badRequest(message: string): NextResponse<ErrorBody> {
  return errorResponse(message, 400);
}

export function unauthorized(
  message = 'Unauthorized',
): NextResponse<ErrorBody> {
  return errorResponse(message, 401);
}

export function forbidden(message: string): NextResponse<ErrorBody> {
  return errorResponse(message, 403);
}

export function notFound(resource: string): NextResponse<ErrorBody> {
  return errorResponse(`${resource} not found`, 404);
}

export function conflict(message: string): NextResponse<ErrorBody> {
  return errorResponse(message, 409);
}

export function unprocessable(message: string): NextResponse<ErrorBody> {
  return errorResponse(message, 422);
}

export function serverError(message: string): NextResponse<ErrorBody> {
  return errorResponse(message, 500);
}

export function serviceUnavailable(
  message: string,
): NextResponse<ErrorBody> {
  return errorResponse(message, 503);
}
