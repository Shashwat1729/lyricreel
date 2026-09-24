export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function errorMessage(err: unknown, fallback = 'Unexpected error'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}
