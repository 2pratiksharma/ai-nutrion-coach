export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, field?: string) => new HttpError(400, message, field);
export const unauthorized = (message = "Not authenticated") => new HttpError(401, message);
export const forbidden = (message = "Not allowed") => new HttpError(403, message);
export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const conflict = (message: string, field?: string) => new HttpError(409, message, field);
