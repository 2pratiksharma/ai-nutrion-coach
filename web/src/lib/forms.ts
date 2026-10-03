"use client";

import { useState } from "react";
import type { z } from "zod";
import { ApiError, errorMessage } from "@/lib/api/errors";

export type FieldErrors = Record<string, string>;

/** First message per field from a zod error. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Validates with a shared schema, runs the request, and maps server errors back onto fields.
 * Keeps every form's submit logic identical.
 */
export function useSubmit<S extends z.ZodType>(schema: S) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(input: unknown, action: (data: z.infer<S>) => Promise<void>) {
    setFormError(null);
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return false;
    }
    setErrors({});
    setPending(true);
    try {
      await action(parsed.data);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.field) setErrors({ [err.field]: err.message });
      else setFormError(errorMessage(err));
      return false;
    } finally {
      setPending(false);
    }
  }

  return { errors, formError, pending, submit, setFormError };
}

export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
  );
}
