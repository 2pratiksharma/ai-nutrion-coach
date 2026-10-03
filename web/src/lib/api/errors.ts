import type { ApiErrorBody } from "@nutrition/shared";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(res.status, body?.error ?? "Something went wrong. Please try again.", body?.field);
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return "You appear to be offline. Check your connection.";
  return fallback;
}
