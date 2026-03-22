export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Something went wrong while saving.";
}

export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function isValidNumber(value: unknown, options?: { min?: number; max?: number }): boolean {
  if (typeof value !== "number" || Number.isNaN(value)) return false;
  if (options?.min !== undefined && value < options.min) return false;
  if (options?.max !== undefined && value > options.max) return false;
  return true;
}