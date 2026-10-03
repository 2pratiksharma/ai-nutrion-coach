"use client";

import { createEndpoints, type HttpMethod } from "./endpoints";
import { toApiError } from "./errors";

async function browserRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    // Session expired mid-use: send the user to log in and come back.
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // A full reload is intentional: it drops all client state that belonged to the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${next}`);
  }
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204 || res.status === 202) return undefined as T;
  return (await res.json()) as T;
}

/** Browser-side API, routed through the Next.js /api rewrite so the auth cookie stays same-origin. */
export const api = createEndpoints(browserRequest);
